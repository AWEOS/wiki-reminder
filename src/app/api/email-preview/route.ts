import { NextResponse } from "next/server";
import { generateReminderEmail } from "@/lib/email";

// GET /api/email-preview - Get HTML preview of reminder email
export async function GET() {
  try {
    const { subject, html } = generateReminderEmail({
      name: "Max Mustermann",
      collections: ["Das Handbuch", "weawFlow Nutzerdokumentation"],
      reminderCount: 1,
      responseUrl: `${process.env.APP_URL || "http://localhost:3000"}/respond/beispiel-token`,
      lastWikiUpdates: [
        { title: "Projekt X – Abnahmeprotokoll", collectionName: "Das Handbuch", updatedAt: new Date().toISOString() },
        { title: "Release 2.1 – Änderungslog", collectionName: "weawFlow Nutzerdokumentation", updatedAt: new Date(Date.now() - 86400000).toISOString() },
        { title: "API-Dokumentation", collectionName: "Das Handbuch", updatedAt: new Date(Date.now() - 172800000).toISOString() },
      ],
    });

    return NextResponse.json({ subject, html });
  } catch (error) {
    return NextResponse.json(
      { error: "Vorschau konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}
