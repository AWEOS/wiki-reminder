import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOutlineClient } from "@/lib/outline";
import { sendEmail, generateReminderEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";

// POST /api/debug/test-reminder - Send a test reminder email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamLeaderId, testEmail = "simon@aweos.de" } = body;

    if (!teamLeaderId) {
      return NextResponse.json(
        { error: "teamLeaderId is required" },
        { status: 400 }
      );
    }

    // Get team leader with collections
    const teamLeader = await prisma.teamLeader.findUnique({
      where: { id: teamLeaderId },
      include: { collections: true },
    });

    if (!teamLeader) {
      return NextResponse.json(
        { error: "Team leader not found" },
        { status: 404 }
      );
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const testToken = `test-${uuidv4()}`;
    const responseUrl = `${appUrl}/respond/${testToken}`;

    // Create a temporary test token (expires in 1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.responseToken.create({
      data: {
        token: testToken,
        teamLeaderId: teamLeader.id,
        expiresAt,
      },
    });

    const collectionNames = teamLeader.collections.map((c) => c.name);
    const testReminderCount = teamLeader.reminderCount + 1;

    // Letzte 5 Wiki-Einträge laden (wenn Outline-User verknüpft)
    let lastWikiUpdates: { title: string; collectionName: string; updatedAt: string }[] = [];
    if (teamLeader.outlineUserId && teamLeader.collections.length > 0) {
      try {
        const outlineClient = getOutlineClient();
        lastWikiUpdates = await outlineClient.getLastDocumentsUpdatedByUser(
          teamLeader.outlineUserId,
          teamLeader.collections.map((c) => ({ outlineCollectionId: c.outlineCollectionId, name: c.name })),
          5
        );
      } catch {
        // Bei Fehler ohne letzte Einträge weitermachen
      }
    }

    // Generate email
    const { subject, html } = generateReminderEmail({
      name: teamLeader.name,
      collections: collectionNames.length > 0 ? collectionNames : ["(Keine Collections zugewiesen)"],
      reminderCount: testReminderCount,
      responseUrl,
      lastWikiUpdates,
    });

    // Send to test email instead of real email
    await sendEmail({
      to: testEmail,
      subject: `[TEST] ${subject}`,
      html: html.replace(
        "</body>",
        `<div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 20px;">
          <p style="color: #B45309; margin: 0;"><strong>DEBUG INFO:</strong></p>
          <p style="color: #92400E; margin: 8px 0 0 0; font-size: 14px;">
            Dies ist eine Test-E-Mail. Echter Empfänger wäre: ${teamLeader.email}<br>
            Teamleiter: ${teamLeader.name}<br>
            Aktueller Reminder-Count: ${teamLeader.reminderCount}<br>
            Test Reminder-Count: ${testReminderCount}
          </p>
        </div></body>`
      ),
    });

    return NextResponse.json({
      success: true,
      sentTo: testEmail,
      teamLeader: teamLeader.name,
      responseUrl,
    });
  } catch (error) {
    console.error("Test reminder error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
