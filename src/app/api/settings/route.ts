import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// GET /api/settings - Get all settings
export async function GET() {
  try {
    const settings = await prisma.settings.findMany();
    
    const settingsMap: Record<string, string | number> = {
      managerEmail: "",
      cronSchedule: "0 9 * * 1",
      escalationThreshold: 3,
    };

    settings.forEach((s) => {
      if (s.key === "escalation_threshold") {
        settingsMap.escalationThreshold = parseInt(s.value) || 3;
      } else if (s.key === "manager_email") {
        settingsMap.managerEmail = s.value;
      } else if (s.key === "cron_schedule") {
        settingsMap.cronSchedule = s.value;
      }
    });

    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { managerEmail, cronSchedule, escalationThreshold } = body;

    // Upsert each setting
    const updates = [
      { key: "manager_email", value: managerEmail || "" },
      { key: "cron_schedule", value: cronSchedule || "0 9 * * 1" },
      { key: "escalation_threshold", value: String(escalationThreshold || 3) },
    ];

    for (const update of updates) {
      await prisma.settings.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value },
      });
    }

    const session = await auth();
    await logAudit({
      action: "settings_updated",
      entityType: "settings",
      details: JSON.stringify(body),
      userEmail: session?.user?.email ?? undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
