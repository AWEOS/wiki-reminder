/**
 * Google Workspace Admin SDK Integration
 * 
 * Voraussetzungen:
 * 1. Google Cloud Projekt erstellen
 * 2. Admin SDK API aktivieren
 * 3. Service Account erstellen mit Domain-wide Delegation
 * 4. Im Google Workspace Admin Console den Service Account autorisieren:
 *    - Security > API Controls > Domain-wide Delegation
 *    - Client ID des Service Accounts hinzufügen
 *    - Scopes: https://www.googleapis.com/auth/admin.directory.user.readonly
 */

import { google } from "googleapis";

interface GoogleWorkspaceUser {
  id: string;
  email: string;
  name: string;
  givenName: string;
  familyName: string;
  orgUnitPath: string;
  isAdmin: boolean;
  suspended: boolean;
  thumbnailPhotoUrl?: string;
}

interface SyncResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  users: GoogleWorkspaceUser[];
}

class GoogleWorkspaceClient {
  private auth: ReturnType<typeof google.auth.JWT.prototype.authorize> | null = null;

  private async getAuth() {
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const adminEmail = process.env.GOOGLE_ADMIN_EMAIL;

    if (!credentials) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY nicht konfiguriert");
    }

    if (!adminEmail) {
      throw new Error("GOOGLE_ADMIN_EMAIL nicht konfiguriert");
    }

    let keyData;
    try {
      // Try parsing as JSON directly (for single-line JSON in env)
      keyData = JSON.parse(credentials);
    } catch {
      // Try parsing as base64 encoded JSON
      try {
        keyData = JSON.parse(Buffer.from(credentials, "base64").toString("utf-8"));
      } catch {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY ist kein gültiges JSON oder Base64");
      }
    }

    const auth = new google.auth.JWT({
      email: keyData.client_email,
      key: keyData.private_key,
      scopes: [
        "https://www.googleapis.com/auth/admin.directory.user.readonly",
        "https://www.googleapis.com/auth/admin.directory.group.readonly",
      ],
      subject: adminEmail, // Impersonate admin user
    });

    return auth;
  }

  /**
   * Alle Benutzer aus Google Workspace abrufen
   */
  async getUsers(options?: {
    orgUnitPath?: string;
    query?: string;
    maxResults?: number;
  }): Promise<GoogleWorkspaceUser[]> {
    const auth = await this.getAuth();
    const admin = google.admin({ version: "directory_v1", auth });

    const users: GoogleWorkspaceUser[] = [];
    let pageToken: string | undefined;

    do {
      const response = await admin.users.list({
        customer: "my_customer",
        maxResults: options?.maxResults || 500,
        pageToken,
        query: options?.query,
        orderBy: "email",
      });

      if (response.data.users) {
        for (const user of response.data.users) {
          // Filter by orgUnitPath if specified
          if (options?.orgUnitPath && !user.orgUnitPath?.startsWith(options.orgUnitPath)) {
            continue;
          }

          users.push({
            id: user.id || "",
            email: user.primaryEmail || "",
            name: user.name?.fullName || "",
            givenName: user.name?.givenName || "",
            familyName: user.name?.familyName || "",
            orgUnitPath: user.orgUnitPath || "/",
            isAdmin: user.isAdmin || false,
            suspended: user.suspended || false,
            thumbnailPhotoUrl: user.thumbnailPhotoUrl || undefined,
          });
        }
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    return users;
  }

  /**
   * Alle Gruppen aus Google Workspace abrufen
   */
  async getGroups(): Promise<{ id: string; email: string; name: string }[]> {
    const auth = await this.getAuth();
    const admin = google.admin({ version: "directory_v1", auth });

    const groups: { id: string; email: string; name: string }[] = [];
    let pageToken: string | undefined;

    do {
      const response = await admin.groups.list({
        customer: "my_customer",
        maxResults: 200,
        pageToken,
      });

      if (response.data.groups) {
        for (const group of response.data.groups) {
          groups.push({
            id: group.id || "",
            email: group.email || "",
            name: group.name || "",
          });
        }
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    return groups;
  }

  /**
   * Mitglieder einer Gruppe abrufen
   */
  async getGroupMembers(groupEmail: string): Promise<string[]> {
    const auth = await this.getAuth();
    const admin = google.admin({ version: "directory_v1", auth });

    const members: string[] = [];
    let pageToken: string | undefined;

    do {
      const response = await admin.members.list({
        groupKey: groupEmail,
        maxResults: 200,
        pageToken,
      });

      if (response.data.members) {
        for (const member of response.data.members) {
          if (member.email && member.type === "USER") {
            members.push(member.email);
          }
        }
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    return members;
  }

  /**
   * Verbindung testen
   */
  async testConnection(): Promise<{ success: boolean; error?: string; domain?: string }> {
    try {
      const auth = await this.getAuth();
      const admin = google.admin({ version: "directory_v1", auth });

      // Try to get a single user to verify connection
      const response = await admin.users.list({
        customer: "my_customer",
        maxResults: 1,
      });

      return {
        success: true,
        domain: response.data.users?.[0]?.primaryEmail?.split("@")[1],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      };
    }
  }
}

// Singleton
let client: GoogleWorkspaceClient | null = null;

export function getGoogleWorkspaceClient(): GoogleWorkspaceClient {
  if (!client) {
    client = new GoogleWorkspaceClient();
  }
  return client;
}

export type { GoogleWorkspaceUser, SyncResult };
