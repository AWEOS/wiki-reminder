/**
 * MailerSend Email Service
 * Documentation: https://developers.mailersend.com/
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  cc?: string;
}

interface MailerSendRecipient {
  email: string;
  name?: string;
}

interface MailerSendRequest {
  from: {
    email: string;
    name?: string;
  };
  to: MailerSendRecipient[];
  cc?: MailerSendRecipient[];
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const apiToken = process.env.MAILERSEND_API_TOKEN;
  const fromEmail = process.env.MAIL_FROM_EMAIL || "noreply@aweos.de";
  const fromName = process.env.MAIL_FROM_NAME || "Wiki Reminder";

  if (!apiToken) {
    throw new Error("MAILERSEND_API_TOKEN nicht konfiguriert");
  }

  const payload: MailerSendRequest = {
    from: {
      email: fromEmail,
      name: fromName,
    },
    to: [{ email: options.to }],
    subject: options.subject,
    html: options.html,
  };

  if (options.cc) {
    payload.cc = [{ email: options.cc }];
  }

  const response = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MailerSend Error: ${response.status} - ${error}`);
  }
}

export interface LastWikiUpdate {
  title: string;
  collectionName: string;
  updatedAt: string;
}

export function generateReminderEmail(params: {
  name: string;
  collections: string[];
  reminderCount: number;
  responseUrl: string;
  lastWikiUpdates?: LastWikiUpdate[];
}): { subject: string; html: string } {
  const { name, collections, reminderCount, responseUrl, lastWikiUpdates = [] } = params;

  const subject =
    reminderCount >= 3
      ? `[DRINGEND] Wiki-Aktualisierung ausstehend (${reminderCount}. Erinnerung)`
      : `Wiki-Aktualisierung Erinnerung (${reminderCount}. Hinweis)`;

  const urgencyBanner =
    reminderCount >= 3
      ? `<div style="background-color: #FEE2E2; border: 1px solid #EF4444; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #DC2626; font-weight: bold; margin: 0;">
            Dies ist bereits die ${reminderCount}. Erinnerung. Bitte handle umgehend!
          </p>
        </div>`
      : "";

  const lastUpdatesHtml =
    lastWikiUpdates.length > 0
      ? `
        <div style="background-color: #EFF6FF; border: 1px solid #3B82F6; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <strong style="color: #1E40AF;">Deine letzten ${lastWikiUpdates.length} Wiki-Aktualisierungen:</strong>
          <ul style="margin: 12px 0 0 0; padding-left: 20px;">
            ${lastWikiUpdates
              .map(
                (u) =>
                  `<li><strong>${escapeHtml(u.title)}</strong> (${escapeHtml(u.collectionName)}) – ${formatDate(u.updatedAt)}</li>`
              )
              .join("")}
          </ul>
        </div>
      `
      : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 8px 4px; }
        .button-secondary { background-color: #6B7280; }
        .button-success { background-color: #059669; }
        .collections { background-color: #F3F4F6; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .collection-item { background-color: white; padding: 8px 12px; border-radius: 4px; margin: 4px 0; display: inline-block; }
        .aweos-box { background-color: #FEF3C7; border-left: 4px solid #D97706; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Hallo ${escapeHtml(name)},</h2>

        <div class="aweos-box">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #92400E;">
            Arbeitsanweisung der AWEOS GmbH – Wichtigkeit der Wiki-Dokumentation
          </p>
          <p style="margin: 0; font-size: 14px; color: #78350F;">
            Die AWEOS GmbH legt großen Wert auf aktuelle und vollständige Wiki-Dokumentation. 
            <strong>Wöchentlich</strong> soll hinterfragt werden, was erledigt wurde und ob alles 
            richtig dokumentiert bzw. aktualisiert ist. Bitte prüfe deine zugewiesenen Bereiche 
            und halte die Dokumentation auf dem aktuellen Stand.
          </p>
        </div>

        ${urgencyBanner}

        <p>Es ist wieder Zeit, deine zugewiesenen Wiki-Dokumentationen zu überprüfen und bei Bedarf zu aktualisieren.</p>

        <div class="collections">
          <strong>Deine zugewiesenen Bereiche:</strong>
          <div style="margin-top: 8px;">
            ${collections.map((c) => `<span class="collection-item">${escapeHtml(c)}</span>`).join(" ")}
          </div>
        </div>

        ${lastUpdatesHtml}

        <p><strong>Bitte wähle eine der folgenden Optionen:</strong></p>

        <div style="margin: 24px 0;">
          <a href="${responseUrl}?response=updated" class="button button-success">
            Ich habe aktualisiert
          </a>
          <a href="${responseUrl}?response=nothing" class="button button-secondary">
            Nichts zu aktualisieren
          </a>
          <a href="${responseUrl}?response=will_update" class="button">
            Ich kümmere mich darum
          </a>
          <a href="${responseUrl}?response=snooze" class="button button-secondary">
            1 Woche pausieren
          </a>
        </div>

        <p style="color: #6B7280; font-size: 14px;">
          Falls du Fragen hast, wende dich bitte an deinen Manager.
        </p>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">

        <p style="color: #9CA3AF; font-size: 12px;">
          Diese E-Mail wurde automatisch vom Wiki Reminder System (AWEOS GmbH) gesendet.
        </p>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function generateEscalationEmail(params: {
  teamLeaderName: string;
  teamLeaderEmail: string;
  collections: string[];
  reminderCount: number;
}): { subject: string; html: string } {
  const { teamLeaderName, teamLeaderEmail, collections, reminderCount } = params;

  const subject = `[ESKALATION] ${teamLeaderName} hat ${reminderCount}x keine Wiki-Aktualisierung durchgeführt`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background-color: #FEE2E2; border: 1px solid #EF4444; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
        .info-box { background-color: #F3F4F6; border-radius: 8px; padding: 16px; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="alert">
          <h2 style="color: #DC2626; margin-top: 0;">Eskalation: Wiki nicht aktualisiert</h2>
        </div>
        
        <p>Der folgende Teamleiter hat trotz ${reminderCount} Erinnerungen keine Aktualisierung seiner Wiki-Dokumentation durchgeführt oder bestätigt:</p>
        
        <div class="info-box">
          <p><strong>Name:</strong> ${teamLeaderName}</p>
          <p><strong>E-Mail:</strong> ${teamLeaderEmail}</p>
          <p><strong>Anzahl Erinnerungen:</strong> ${reminderCount}</p>
          <p><strong>Zugewiesene Bereiche:</strong></p>
          <ul>
            ${collections.map((c) => `<li>${c}</li>`).join("")}
          </ul>
        </div>
        
        <p>Bitte kontaktiere den Mitarbeiter direkt, um die Situation zu klären.</p>
        
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
        
        <p style="color: #9CA3AF; font-size: 12px;">
          Diese E-Mail wurde automatisch vom Wiki Reminder System gesendet.
        </p>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export async function testEmailConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const apiToken = process.env.MAILERSEND_API_TOKEN;
    
    if (!apiToken) {
      return { success: false, error: "MAILERSEND_API_TOKEN nicht konfiguriert" };
    }

    // Test API connection by checking account
    const response = await fetch("https://api.mailersend.com/v1/api-quota", {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.text();
      return { success: false, error: `API Error: ${response.status} - ${error}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
