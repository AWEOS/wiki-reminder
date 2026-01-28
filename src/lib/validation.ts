/**
 * Einfache Input-Validierung für API-Bodies (XSS/Injection-Reduktion, Längenlimits)
 */

const MAX_NAME = 200;
const MAX_EMAIL = 254;
const MAX_ID_LENGTH = 100;

export function sanitizeString(
  value: unknown,
  maxLength: number
): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s.length === 0) return null;
  if (s.length > maxLength) return s.slice(0, maxLength);
  return s;
}

export function validateTeamLeaderBody(body: {
  name?: unknown;
  email?: unknown;
  googleChatId?: unknown;
  outlineUserId?: unknown;
  collections?: unknown;
}): { name: string; email: string; googleChatId?: string; outlineUserId?: string; collections?: { outlineCollectionId: string; name: string }[] } | { error: string } {
  const name = sanitizeString(body.name, MAX_NAME);
  const email = sanitizeString(body.email, MAX_EMAIL);
  if (!name || !email) {
    return { error: "Name und E-Mail sind erforderlich." };
  }
  const emailLower = email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    return { error: "Ungültige E-Mail-Adresse." };
  }
  const googleChatId = body.googleChatId != null ? sanitizeString(String(body.googleChatId), MAX_ID_LENGTH) ?? undefined : undefined;
  const outlineUserId = body.outlineUserId != null ? sanitizeString(String(body.outlineUserId), MAX_ID_LENGTH) ?? undefined : undefined;
  let collections: { outlineCollectionId: string; name: string }[] | undefined;
  if (Array.isArray(body.collections) && body.collections.length > 0) {
    collections = [];
    for (const c of body.collections) {
      if (c && typeof c === "object" && "outlineCollectionId" in c && "name" in c) {
        const id = sanitizeString((c as { outlineCollectionId: unknown }).outlineCollectionId, MAX_ID_LENGTH);
        const n = sanitizeString((c as { name: unknown }).name, 200);
        if (id && n) collections.push({ outlineCollectionId: id, name: n });
      }
    }
  }
  return { name, email: emailLower, googleChatId, outlineUserId, collections };
}
