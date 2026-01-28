import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/export/teamleaders - Export team leaders as CSV
export async function GET() {
  try {
    const teamLeaders = await prisma.teamLeader.findMany({
      include: { collections: true },
      orderBy: { name: "asc" },
    });

    const headers = ["Name", "E-Mail", "Aktiv", "Reminder Count", "Collections", "Erstellt"];
    const rows = teamLeaders.map((tl) => [
      `"${(tl.name || "").replace(/"/g, '""')}"`,
      `"${(tl.email || "").replace(/"/g, '""')}"`,
      tl.active ? "Ja" : "Nein",
      String(tl.reminderCount),
      `"${tl.collections.map((c) => c.name).join(", ").replace(/"/g, '""')}"`,
      tl.createdAt.toISOString(),
    ]);

    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const bom = "\uFEFF";

    return new NextResponse(bom + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="teamleiter-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export Error:", error);
    return NextResponse.json(
      { error: "Export fehlgeschlagen" },
      { status: 500 }
    );
  }
}
