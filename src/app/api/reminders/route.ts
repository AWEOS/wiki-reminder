import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/reminders - Get reminder history
export async function GET() {
  try {
    const reminders = await prisma.reminderLog.findMany({
      include: {
        teamLeader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { sentAt: "desc" },
      take: 100,
    });

    return NextResponse.json(reminders);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}
