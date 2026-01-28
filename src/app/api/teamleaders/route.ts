import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { validateTeamLeaderBody } from "@/lib/validation";

// GET /api/teamleaders - Get all team leaders
export async function GET() {
  try {
    const teamLeaders = await prisma.teamLeader.findMany({
      include: {
        collections: true,
        reminderLogs: {
          orderBy: { sentAt: "desc" },
          take: 5,
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(teamLeaders);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team leaders" },
      { status: 500 }
    );
  }
}

// POST /api/teamleaders - Create a new team leader (protected)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const validated = validateTeamLeaderBody(body);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const { name, email, googleChatId, outlineUserId, collections } = validated;

    const teamLeader = await prisma.teamLeader.create({
      data: {
        name,
        email,
        googleChatId,
        outlineUserId,
        collections: collections && collections.length > 0
          ? {
              create: collections.map((c) => ({
                outlineCollectionId: c.outlineCollectionId,
                name: c.name,
              })),
            }
          : undefined,
      },
      include: {
        collections: true,
      },
    });

    try {
      await logAudit({
        action: "team_leader_created",
        entityType: "team_leader",
        entityId: String(teamLeader.id),
        details: JSON.stringify({ name, email }),
        userEmail: session?.user?.email ?? undefined,
      });
    } catch (auditErr) {
      console.error("Audit-Log fehlgeschlagen (Teamleiter wurde trotzdem angelegt):", auditErr);
    }

    return NextResponse.json(teamLeader, { status: 201 });
  } catch (error: unknown) {
    console.error("Database Error:", error);
    const prismaError = error as { code?: string; meta?: { target?: string[] } };
    if (prismaError?.code === "P2002") {
      return NextResponse.json(
        { error: "Ein Teamleiter mit dieser E-Mail existiert bereits." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Teamleiter konnte nicht angelegt werden. Bitte später erneut versuchen." },
      { status: 500 }
    );
  }
}
