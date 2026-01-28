import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { validateTeamLeaderBody } from "@/lib/validation";

// GET /api/teamleaders/[id] - Get a specific team leader
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamLeader = await prisma.teamLeader.findUnique({
      where: { id: parseInt(id) },
      include: {
        collections: true,
        reminderLogs: {
          orderBy: { sentAt: "desc" },
          take: 10,
        },
      },
    });

    if (!teamLeader) {
      return NextResponse.json(
        { error: "Team leader not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(teamLeader);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team leader" },
      { status: 500 }
    );
  }
}

// PUT /api/teamleaders/[id] - Update a team leader (protected)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const validated = validateTeamLeaderBody(body);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const { name, email, googleChatId, outlineUserId, collections } = validated;
    const active = typeof body.active === "boolean" ? body.active : true;

    // Update team leader
    const teamLeader = await prisma.teamLeader.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        googleChatId,
        outlineUserId,
        active,
      },
    });

    // Update collections if provided
    if (collections !== undefined) {
      // Delete existing collections
      await prisma.wikiCollection.deleteMany({
        where: { teamLeaderId: parseInt(id) },
      });

      // Create new collections
      if (collections.length > 0) {
        await prisma.wikiCollection.createMany({
          data: collections.map(
            (c: { outlineCollectionId: string; name: string }) => ({
              teamLeaderId: parseInt(id),
              outlineCollectionId: c.outlineCollectionId,
              name: c.name,
            })
          ),
        });
      }
    }

    // Fetch updated team leader with collections
    const updated = await prisma.teamLeader.findUnique({
      where: { id: parseInt(id) },
      include: {
        collections: true,
      },
    });

    const session = await auth();
    try {
      await logAudit({
        action: "team_leader_updated",
        entityType: "team_leader",
        entityId: id,
        details: JSON.stringify({ name, email }),
        userEmail: session?.user?.email ?? undefined,
      });
    } catch (auditErr) {
      console.error("Audit-Log fehlgeschlagen (Aktualisierung war trotzdem erfolgreich):", auditErr);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Failed to update team leader" },
      { status: 500 }
    );
  }
}

// DELETE /api/teamleaders/[id] - Delete a team leader (protected)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const leader = await prisma.teamLeader.findUnique({ where: { id: parseInt(id) } });
    await prisma.teamLeader.delete({
      where: { id: parseInt(id) },
    });

    const session = await auth();
    try {
      await logAudit({
        action: "team_leader_deleted",
        entityType: "team_leader",
        entityId: id,
        details: leader ? JSON.stringify({ name: leader.name, email: leader.email }) : undefined,
        userEmail: session?.user?.email ?? undefined,
      });
    } catch (auditErr) {
      console.error("Audit-Log fehlgeschlagen (Löschung war trotzdem erfolgreich):", auditErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Failed to delete team leader" },
      { status: 500 }
    );
  }
}
