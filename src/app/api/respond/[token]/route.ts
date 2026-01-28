import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// GET /api/respond/[token] - Validate token and get info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    const responseToken = await prisma.responseToken.findUnique({
      where: { token },
      include: {
        teamLeader: {
          include: {
            collections: true,
          },
        },
      },
    });

    if (!responseToken) {
      return NextResponse.json({ valid: false });
    }

    if (responseToken.used) {
      return NextResponse.json({ valid: false, used: true });
    }

    if (new Date() > responseToken.expiresAt) {
      return NextResponse.json({ valid: false, expired: true });
    }

    return NextResponse.json({
      valid: true,
      teamLeader: {
        name: responseToken.teamLeader.name,
        email: responseToken.teamLeader.email,
      },
      collections: responseToken.teamLeader.collections.map((c) => c.name),
      reminderCount: responseToken.teamLeader.reminderCount,
    });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Failed to validate token" },
      { status: 500 }
    );
  }
}

// POST /api/respond/[token] - Submit response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { responseType, comment } = body;

    if (!responseType) {
      return NextResponse.json(
        { error: "Response type is required" },
        { status: 400 }
      );
    }

    const responseToken = await prisma.responseToken.findUnique({
      where: { token },
      include: {
        teamLeader: true,
      },
    });

    if (!responseToken) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404 }
      );
    }

    if (responseToken.used) {
      return NextResponse.json(
        { error: "Token already used" },
        { status: 400 }
      );
    }

    if (new Date() > responseToken.expiresAt) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 400 }
      );
    }

    // Mark token as used
    await prisma.responseToken.update({
      where: { id: responseToken.id },
      data: { used: true },
    });

    // Update reminder log if exists
    if (responseToken.reminderLogId) {
      await prisma.reminderLog.update({
        where: { id: responseToken.reminderLogId },
        data: {
          status: "responded",
          respondedAt: new Date(),
          responseType,
          comment,
        },
      });
    }

    // Reset reminder count if user confirmed update
    if (responseType === "updated") {
      await prisma.teamLeader.update({
        where: { id: responseToken.teamLeaderId },
        data: { reminderCount: 0 },
      });
    }

    // Snooze: pause reminders for 7 days
    if (responseType === "snooze") {
      const snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + 7);
      await prisma.teamLeader.update({
        where: { id: responseToken.teamLeaderId },
        data: { snoozeUntil },
      });
      await logAudit({
        action: "snooze_set",
        entityType: "team_leader",
        entityId: String(responseToken.teamLeaderId),
        details: JSON.stringify({ snoozeUntil: snoozeUntil.toISOString() }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Failed to submit response" },
      { status: 500 }
    );
  }
}
