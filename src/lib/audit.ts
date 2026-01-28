import { prisma } from "./db";

export type AuditAction =
  | "team_leader_created"
  | "team_leader_updated"
  | "team_leader_deleted"
  | "reminder_sent"
  | "reminder_responded"
  | "escalation_sent"
  | "settings_updated"
  | "import_google"
  | "test_email_sent"
  | "snooze_set";

export async function logAudit(params: {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  details?: string;
  userId?: string;
  userEmail?: string;
}) {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      userId: params.userId,
      userEmail: params.userEmail,
    },
  });
}
