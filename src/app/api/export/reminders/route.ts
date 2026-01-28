import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/export/reminders - Export reminder history as CSV
export async function GET() {
  try {
    const reminders = await prisma.reminderLog.findMany({
      include: {
        teamLeader: { select: { name: true, email: true } },
      },
      orderBy: { sentAt: "desc" },
      take: 2000,
    });

    const headers = ["Teamleiter", "E-Mail", "Gesendet", "Reminder #", "Status", "Antwort", "Kommentar"];
    const rows = reminders.map((r) => [
      `"${(r.teamLeader?.name || "").replace(/"/g, '""')}"`,
      `"${(r.teamLeader?.email || "").replace(/"/g, '""')}"`,
      r.sentAt.toISOString(),
      String(r.reminderCount),
      r.status,
      r.responseType || "-",
      `"${(r.comment || "").replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const bom = "\uFEFF";

    return new NextResponse(bom + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reminder-historie-${new Date().toISOString().slice(0, 10)}.csv"`,
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
