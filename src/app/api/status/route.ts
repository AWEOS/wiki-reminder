import { NextResponse } from "next/server";
import { getOutlineClient } from "@/lib/outline";
import { testEmailConnection } from "@/lib/email";
import { prisma } from "@/lib/db";

// GET /api/status - Health check for all services (public for dashboard)
export async function GET() {
  const [outline, email, db] = await Promise.all([
    getOutlineClient().testConnection(),
    testEmailConnection(),
    prisma.teamLeader.count().then(() => ({ success: true })).catch((e) => ({ success: false, error: (e as Error).message })),
  ]);

  const googleChatConfigured = !!process.env.GOOGLE_CHAT_WEBHOOK_URL;

  return NextResponse.json({
    outline: { ok: outline.success, error: outline.error },
    email: { ok: email.success, error: email.error },
    googleChat: { ok: googleChatConfigured, configured: googleChatConfigured },
    database: { ok: db.success, error: (db as { error?: string }).error },
  });
}
