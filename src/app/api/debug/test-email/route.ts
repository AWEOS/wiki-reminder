import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

// POST /api/debug/test-email - Send a test email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const to = body.to || "simon@aweos.de";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .success { background-color: #D1FAE5; border: 1px solid #10B981; border-radius: 8px; padding: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">
            <h2 style="color: #059669; margin-top: 0;">E-Mail Test erfolgreich!</h2>
            <p>Diese Test-E-Mail wurde vom Wiki Reminder System gesendet.</p>
            <p><strong>Zeitstempel:</strong> ${new Date().toLocaleString("de-DE")}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
          <p style="color: #9CA3AF; font-size: 12px;">
            Wiki Reminder System - Debug Test
          </p>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to,
      subject: "[Test] Wiki Reminder System - E-Mail Verbindungstest",
      html,
    });

    return NextResponse.json({ 
      success: true,
      messageId: `test-${Date.now()}`,
      sentTo: to,
    });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
