import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runReminderCheck } from "@/lib/scheduler";

// POST /api/cron/trigger - Manually trigger a reminder check (protected)
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  try {
    console.log("[API] Manual reminder check triggered");
    
    const results = await runReminderCheck();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("[API] Error running reminder check:", error);
    return NextResponse.json(
      { 
        error: "Failed to run reminder check",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// GET /api/cron/trigger - Get scheduler status
export async function GET() {
  return NextResponse.json({
    message: "Use POST to trigger a manual reminder check",
    cronSchedule: process.env.CRON_SCHEDULE || "0 9 * * 1",
  });
}
