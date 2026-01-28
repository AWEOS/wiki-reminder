/**
 * Outline Wiki API Client
 * Documentation: https://www.getoutline.com/developers
 */

export interface OutlineCollection {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutlineDocument {
  id: string;
  title: string;
  collectionId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
  };
  updatedBy: {
    id: string;
    name: string;
  };
}

export interface OutlineUser {
  id: string;
  name: string;
  email: string;
}

class OutlineClient {
  private apiUrl: string;
  private apiToken: string;

  constructor() {
    this.apiUrl = process.env.OUTLINE_API_URL || "";
    this.apiToken = process.env.OUTLINE_API_TOKEN || "";
  }

  private async request<T>(endpoint: string, body?: object): Promise<T> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Outline API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get all collections
   */
  async getCollections(): Promise<OutlineCollection[]> {
    return this.request<OutlineCollection[]>("/collections.list", {});
  }

  /**
   * Get a specific collection by ID
   */
  async getCollection(collectionId: string): Promise<OutlineCollection> {
    return this.request<OutlineCollection>("/collections.info", {
      id: collectionId,
    });
  }

  /**
   * Get documents in a collection
   */
  async getDocumentsInCollection(collectionId: string): Promise<OutlineDocument[]> {
    return this.request<OutlineDocument[]>("/documents.list", {
      collectionId,
    });
  }

  /**
   * Get recently updated documents in a collection
   */
  async getRecentlyUpdatedDocuments(
    collectionId: string,
    since: Date
  ): Promise<OutlineDocument[]> {
    const documents = await this.getDocumentsInCollection(collectionId);
    return documents.filter(
      (doc) => new Date(doc.updatedAt) > since
    );
  }

  /**
   * Check if a collection has been updated since a given date
   */
  async hasCollectionUpdates(
    collectionId: string,
    since: Date
  ): Promise<{ hasUpdates: boolean; documents: OutlineDocument[] }> {
    const documents = await this.getRecentlyUpdatedDocuments(collectionId, since);
    return {
      hasUpdates: documents.length > 0,
      documents,
    };
  }

  /**
   * Get documents updated by a specific user in a collection
   */
  async getDocumentsUpdatedByUser(
    collectionId: string,
    userId: string,
    since: Date
  ): Promise<OutlineDocument[]> {
    const documents = await this.getRecentlyUpdatedDocuments(collectionId, since);
    return documents.filter((doc) => doc.updatedBy.id === userId);
  }

  /**
   * Get the last N documents updated by a user across ALL collections (e.g. for form preview).
   */
  async getLastDocumentsUpdatedByUserAcrossAllCollections(
    userId: string,
    limit: number
  ): Promise<{ title: string; collectionName: string; updatedAt: string }[]> {
    const collections = await this.getCollections();
    const all: { title: string; collectionName: string; updatedAt: string }[] = [];
    for (const col of collections) {
      try {
        const docs = await this.getDocumentsInCollection(col.id);
        const byUser = docs
          .filter((d) => d.updatedBy?.id === userId)
          .map((d) => ({
            title: d.title || "Ohne Titel",
            collectionName: col.name,
            updatedAt: d.updatedAt,
          }));
        all.push(...byUser);
      } catch {
        // Skip collection on error
      }
    }
    all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return all.slice(0, limit);
  }

  /**
   * Get the last N documents updated by a user across given collections (for e.g. reminder email).
   */
  async getLastDocumentsUpdatedByUser(
    userId: string,
    collections: { outlineCollectionId: string; name: string }[],
    limit: number
  ): Promise<{ title: string; collectionName: string; updatedAt: string }[]> {
    const all: { title: string; collectionName: string; updatedAt: string }[] = [];
    for (const col of collections) {
      try {
        const docs = await this.getDocumentsInCollection(col.outlineCollectionId);
        const byUser = docs
          .filter((d) => d.updatedBy?.id === userId)
          .map((d) => ({
            title: d.title || "Ohne Titel",
            collectionName: col.name,
            updatedAt: d.updatedAt,
          }));
        all.push(...byUser);
      } catch {
        // Skip collection on error
      }
    }
    all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return all.slice(0, limit);
  }

  /**
   * Search for documents
   */
  async searchDocuments(query: string, collectionId?: string): Promise<OutlineDocument[]> {
    const body: { query: string; collectionId?: string } = { query };
    if (collectionId) {
      body.collectionId = collectionId;
    }
    const result = await this.request<{ document: OutlineDocument }[]>("/documents.search", body);
    return result.map((r) => r.document);
  }

  /**
   * Get all users (with pagination)
   */
  async getUsers(): Promise<OutlineUser[]> {
    const allUsers: OutlineUser[] = [];
    let offset = 0;
    const limit = 100;
    
    while (true) {
      const response = await this.request<OutlineUser[]>("/users.list", {
        offset,
        limit,
      });
      
      if (!response || response.length === 0) {
        break;
      }
      
      allUsers.push(...response);
      
      if (response.length < limit) {
        break;
      }
      
      offset += limit;
    }
    
    return allUsers;
  }

  /**
   * Get current user (for testing connection)
   */
  async getCurrentUser(): Promise<OutlineUser> {
    return this.request<OutlineUser>("/auth.info", {});
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.getCurrentUser();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Singleton instance
let outlineClient: OutlineClient | null = null;

export function getOutlineClient(): OutlineClient {
  if (!outlineClient) {
    outlineClient = new OutlineClient();
  }
  return outlineClient;
}

export default OutlineClient;
