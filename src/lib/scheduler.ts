import * as cron from "node-cron";
import { prisma } from "./db";
import { getOutlineClient } from "./outline";
import { sendEmail, generateReminderEmail, generateEscalationEmail } from "./email";
import { sendReminderNotification, sendEscalationNotification } from "./google-chat";
import { logAudit } from "./audit";
import { v4 as uuidv4 } from "uuid";

let scheduledTask: cron.ScheduledTask | null = null;

export async function runReminderCheck(): Promise<{
  processed: number;
  reminders: number;
  escalations: number;
  errors: string[];
}> {
  const results = {
    processed: 0,
    reminders: 0,
    escalations: 0,
    errors: [] as string[],
  };

  try {
    // Get settings
    const settings = await prisma.settings.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const escalationThreshold = parseInt(settingsMap.escalation_threshold || "3");
    const managerEmail = settingsMap.manager_email;
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    // Get all active team leaders with their collections (exclude snoozed)
    const now = new Date();
    const teamLeaders = await prisma.teamLeader.findMany({
      where: {
        active: true,
        OR: [
          { snoozeUntil: null },
          { snoozeUntil: { lt: now } },
        ],
      },
      include: { collections: true },
    });

    const outlineClient = getOutlineClient();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    for (const leader of teamLeaders) {
      results.processed++;

      try {
        if (leader.collections.length === 0) {
          continue; // Skip leaders with no collections
        }

        // Check if any collection has updates
        let hasUpdates = false;

        for (const collection of leader.collections) {
          try {
            const { hasUpdates: collectionHasUpdates } = await outlineClient.hasCollectionUpdates(
              collection.outlineCollectionId,
              oneWeekAgo
            );

            if (collectionHasUpdates) {
              // If specific user tracking is enabled
              if (leader.outlineUserId) {
                const userDocs = await outlineClient.getDocumentsUpdatedByUser(
                  collection.outlineCollectionId,
                  leader.outlineUserId,
                  oneWeekAgo
                );
                if (userDocs.length > 0) {
                  hasUpdates = true;
                  break;
                }
              } else {
                // Count any update in the collection as activity
                hasUpdates = true;
                break;
              }
            }

            // Update last checked timestamp
            await prisma.wikiCollection.update({
              where: { id: collection.id },
              data: { lastCheckedAt: new Date() },
            });
          } catch (err) {
            results.errors.push(
              `Failed to check collection ${collection.name}: ${err instanceof Error ? err.message : "Unknown error"}`
            );
          }
        }

        if (hasUpdates) {
          // Reset reminder count if there were updates
          await prisma.teamLeader.update({
            where: { id: leader.id },
            data: { reminderCount: 0 },
          });
          continue;
        }

        // No updates found - send reminder
        const newReminderCount = leader.reminderCount + 1;

        // Update reminder count
        await prisma.teamLeader.update({
          where: { id: leader.id },
          data: { reminderCount: newReminderCount },
        });

        // Create response token
        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create reminder log entry
        const reminderLog = await prisma.reminderLog.create({
          data: {
            teamLeaderId: leader.id,
            reminderCount: newReminderCount,
            status: newReminderCount >= escalationThreshold ? "escalated" : "sent",
          },
        });

        // Create response token
        await prisma.responseToken.create({
          data: {
            token,
            teamLeaderId: leader.id,
            reminderLogId: reminderLog.id,
            expiresAt,
          },
        });

        const responseUrl = `${appUrl}/respond/${token}`;
        const collectionNames = leader.collections.map((c) => c.name);

        // Letzte 5 Wiki-Einträge des Nutzers laden (wenn Outline-User verknüpft)
        let lastWikiUpdates: { title: string; collectionName: string; updatedAt: string }[] = [];
        if (leader.outlineUserId && leader.collections.length > 0) {
          try {
            lastWikiUpdates = await outlineClient.getLastDocumentsUpdatedByUser(
              leader.outlineUserId,
              leader.collections.map((c) => ({ outlineCollectionId: c.outlineCollectionId, name: c.name })),
              5
            );
          } catch {
            // Bei Fehler ohne letzte Einträge weitermachen
          }
        }

        // Send reminder email
        try {
          const { subject, html } = generateReminderEmail({
            name: leader.name,
            collections: collectionNames,
            reminderCount: newReminderCount,
            responseUrl,
            lastWikiUpdates,
          });

          const ccEmail =
            newReminderCount >= escalationThreshold && managerEmail ? managerEmail : undefined;

          await sendEmail({
            to: leader.email,
            subject,
            html,
            cc: ccEmail,
          });
        } catch (err) {
          results.errors.push(
            `Failed to send email to ${leader.email}: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }

        // Send Google Chat notification
        try {
          await sendReminderNotification({
            name: leader.name,
            email: leader.email,
            collections: collectionNames,
            reminderCount: newReminderCount,
            responseUrl,
          });
        } catch (err) {
          results.errors.push(
            `Failed to send Google Chat notification for ${leader.name}: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }

        results.reminders++;

        await logAudit({
          action: "reminder_sent",
          entityType: "reminder",
          entityId: String(reminderLog.id),
          details: JSON.stringify({ teamLeaderId: leader.id, reminderCount: newReminderCount }),
        });

        // Send escalation if threshold reached
        if (newReminderCount >= escalationThreshold) {
          results.escalations++;

          await logAudit({
            action: "escalation_sent",
            entityType: "reminder",
            entityId: String(reminderLog.id),
            details: JSON.stringify({ teamLeaderId: leader.id, reminderCount: newReminderCount }),
          });

          // Send escalation email to manager
          if (managerEmail) {
            try {
              const { subject, html } = generateEscalationEmail({
                teamLeaderName: leader.name,
                teamLeaderEmail: leader.email,
                collections: collectionNames,
                reminderCount: newReminderCount,
              });

              await sendEmail({
                to: managerEmail,
                subject,
                html,
              });
            } catch (err) {
              results.errors.push(
                `Failed to send escalation email: ${err instanceof Error ? err.message : "Unknown error"}`
              );
            }
          }

          // Send escalation to Google Chat
          try {
            await sendEscalationNotification({
              teamLeaderName: leader.name,
              teamLeaderEmail: leader.email,
              collections: collectionNames,
              reminderCount: newReminderCount,
            });
          } catch (err) {
            results.errors.push(
              `Failed to send escalation to Google Chat: ${err instanceof Error ? err.message : "Unknown error"}`
            );
          }
        }
      } catch (err) {
        results.errors.push(
          `Error processing ${leader.name}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  } catch (err) {
    results.errors.push(
      `Critical error: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }

  return results;
}

export function startScheduler(cronSchedule?: string): void {
  const schedule = cronSchedule || process.env.CRON_SCHEDULE || "0 9 * * 1";

  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(schedule, async () => {
    console.log(`[Scheduler] Running reminder check at ${new Date().toISOString()}`);
    const results = await runReminderCheck();
    console.log(`[Scheduler] Results:`, results);
  });

  console.log(`[Scheduler] Started with schedule: ${schedule}`);
}

export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log("[Scheduler] Stopped");
  }
}

export function getSchedulerStatus(): { running: boolean; schedule: string | null } {
  return {
    running: scheduledTask !== null,
    schedule: scheduledTask ? process.env.CRON_SCHEDULE || "0 9 * * 1" : null,
  };
}
