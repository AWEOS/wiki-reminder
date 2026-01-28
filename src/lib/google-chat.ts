/**
 * Google Chat Webhook Integration
 * Documentation: https://developers.google.com/chat/how-tos/webhooks
 */

interface CardSection {
  header?: string;
  widgets: Array<{
    textParagraph?: { text: string };
    keyValue?: { topLabel: string; content: string };
    buttons?: Array<{ textButton: { text: string; onClick: { openLink: { url: string } } } }>;
  }>;
}

interface GoogleChatMessage {
  text?: string;
  cards?: Array<{
    header?: { title: string; subtitle?: string; imageUrl?: string };
    sections: CardSection[];
  }>;
}

export async function sendGoogleChatMessage(message: GoogleChatMessage): Promise<void> {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn("Google Chat webhook URL not configured");
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Chat Webhook Error: ${response.status} - ${error}`);
  }
}

export async function sendReminderNotification(params: {
  name: string;
  email: string;
  collections: string[];
  reminderCount: number;
  responseUrl: string;
}): Promise<void> {
  const { name, email, collections, reminderCount, responseUrl } = params;
  
  const isEscalated = reminderCount >= 3;
  
  const message: GoogleChatMessage = {
    cards: [
      {
        header: {
          title: isEscalated ? "Wiki-Erinnerung (DRINGEND)" : "Wiki-Erinnerung",
          subtitle: `${reminderCount}. Hinweis für ${name}`,
        },
        sections: [
          {
            widgets: [
              {
                keyValue: {
                  topLabel: "Teamleiter",
                  content: `${name} (${email})`,
                },
              },
              {
                keyValue: {
                  topLabel: "Zugewiesene Bereiche",
                  content: collections.join(", "),
                },
              },
              {
                keyValue: {
                  topLabel: "Erinnerungen",
                  content: `${reminderCount}x gesendet`,
                },
              },
            ],
          },
          {
            widgets: [
              {
                buttons: [
                  {
                    textButton: {
                      text: "Zur Bestätigung",
                      onClick: {
                        openLink: {
                          url: responseUrl,
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  await sendGoogleChatMessage(message);
}

export async function sendEscalationNotification(params: {
  teamLeaderName: string;
  teamLeaderEmail: string;
  collections: string[];
  reminderCount: number;
}): Promise<void> {
  const { teamLeaderName, teamLeaderEmail, collections, reminderCount } = params;

  const message: GoogleChatMessage = {
    cards: [
      {
        header: {
          title: "ESKALATION: Wiki nicht aktualisiert",
          subtitle: `${teamLeaderName} - ${reminderCount}x keine Reaktion`,
        },
        sections: [
          {
            widgets: [
              {
                textParagraph: {
                  text: `<b>Achtung:</b> Der Teamleiter <b>${teamLeaderName}</b> (${teamLeaderEmail}) hat trotz ${reminderCount} Erinnerungen keine Wiki-Aktualisierung durchgeführt oder bestätigt.`,
                },
              },
              {
                keyValue: {
                  topLabel: "Zugewiesene Bereiche",
                  content: collections.join(", "),
                },
              },
            ],
          },
          {
            widgets: [
              {
                textParagraph: {
                  text: "Bitte kontaktiere den Mitarbeiter direkt.",
                },
              },
            ],
          },
        ],
      },
    ],
  };

  await sendGoogleChatMessage(message);
}

export async function sendTestNotification(): Promise<{ success: boolean; error?: string }> {
  try {
    const message: GoogleChatMessage = {
      text: "Test-Nachricht vom Wiki Reminder System - Verbindung erfolgreich!",
    };
    
    await sendGoogleChatMessage(message);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
