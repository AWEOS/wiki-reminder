"use client";

import { useState, useEffect } from "react";

interface FormCollection {
  outlineCollectionId: string;
  name: string;
}

interface FormTeamLeader {
  id?: number;
  name: string;
  email: string;
  googleChatId?: string;
  outlineUserId?: string;
  active?: boolean;
  collections?: FormCollection[];
}

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  givenName: string;
  familyName: string;
  isAdmin: boolean;
  suspended: boolean;
  thumbnailPhotoUrl?: string;
}

interface OutlineCollection {
  id: string;
  name: string;
}

interface OutlineUser {
  id: string;
  name: string;
  email: string;
}

interface Props {
  teamLeader?: FormTeamLeader | null;
  onSave: (data: FormTeamLeader) => void | Promise<void>;
  onCancel: () => void;
}

export default function TeamLeaderForm({ teamLeader, onSave, onCancel }: Props) {
  const [googleUsers, setGoogleUsers] = useState<GoogleUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<GoogleUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  
  // Manual mode fallback
  const [manualMode, setManualMode] = useState(false);
  const [name, setName] = useState(teamLeader?.name || "");
  const [email, setEmail] = useState(teamLeader?.email || "");
  
  const [outlineUserId, setOutlineUserId] = useState(teamLeader?.outlineUserId || "");
  const [active, setActive] = useState(teamLeader?.active ?? true);
  const [selectedCollections, setSelectedCollections] = useState<FormCollection[]>(
    teamLeader?.collections?.map(c => ({ outlineCollectionId: c.outlineCollectionId, name: c.name })) || []
  );
  const [availableCollections, setAvailableCollections] = useState<OutlineCollection[]>([]);
  const [outlineUsers, setOutlineUsers] = useState<OutlineUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastOutlineUpdates, setLastOutlineUpdates] = useState<{ title: string; collectionName: string; updatedAt: string }[]>([]);
  const [loadingLastUpdates, setLoadingLastUpdates] = useState(false);

  // Search states for dropdowns
  const [outlineSearch, setOutlineSearch] = useState("");
  const [showOutlineDropdown, setShowOutlineDropdown] = useState(false);

  useEffect(() => {
    // Fetch Google Workspace users
    fetch("/api/google-workspace/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) {
          // Filter to active users only
          const activeUsers = data.users.filter((u: GoogleUser) => !u.suspended);
          setGoogleUsers(activeUsers);
          setGoogleConnected(true);
          
          // If editing, find the matching user
          if (teamLeader?.email) {
            const existingUser = activeUsers.find(
              (u: GoogleUser) => u.email.toLowerCase() === teamLeader.email.toLowerCase()
            );
            if (existingUser) {
              setSelectedUser(existingUser);
            }
          }
        }
        setLoadingUsers(false);
      })
      .catch(() => {
        setGoogleConnected(false);
        setManualMode(true);
        setLoadingUsers(false);
      });

    // Fetch available collections from Outline
    fetch("/api/outline")
      .then((res) => res.json())
      .then((data) => {
        if (data.collections) {
          setAvailableCollections(data.collections);
        }
      })
      .catch(console.error);

    // Fetch Outline users
    fetch("/api/outline/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) {
          setOutlineUsers(data.users);
        }
      })
      .catch(console.error);
  }, [teamLeader]);

  // Bei Auswahl eines Outline-Nutzers: letzte 5 Wiki-Updates laden
  useEffect(() => {
    if (!outlineUserId) {
      setLastOutlineUpdates([]);
      return;
    }
    setLoadingLastUpdates(true);
    fetch(`/api/outline/last-updates?userId=${encodeURIComponent(outlineUserId)}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setLastOutlineUpdates(Array.isArray(data) ? data : []))
      .catch(() => setLastOutlineUpdates([]))
      .finally(() => setLoadingLastUpdates(false));
  }, [outlineUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const userData = manualMode || !selectedUser
      ? { name, email }
      : { name: selectedUser.name, email: selectedUser.email };

    const autoGoogleChatId = selectedUser?.id || undefined;

    try {
      await onSave({
        id: teamLeader?.id,
        ...userData,
        googleChatId: autoGoogleChatId,
        outlineUserId: outlineUserId || undefined,
        active,
        collections: selectedCollections,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const toggleCollection = (collection: OutlineCollection) => {
    const exists = selectedCollections.find(
      (c) => c.outlineCollectionId === collection.id
    );

    if (exists) {
      setSelectedCollections(
        selectedCollections.filter((c) => c.outlineCollectionId !== collection.id)
      );
    } else {
      setSelectedCollections([
        ...selectedCollections,
        { outlineCollectionId: collection.id, name: collection.name },
      ]);
    }
  };

  const filteredUsers = googleUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectUser = (user: GoogleUser) => {
    setSelectedUser(user);
    setSearchQuery("");
    setShowDropdown(false);
  };

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Selection */}
      {!manualMode && googleConnected ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Benutzer aus Google Workspace *
          </label>
          
          {selectedUser ? (
            // Selected user display
            <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              {selectedUser.thumbnailPhotoUrl ? (
                <img
                  src={selectedUser.thumbnailPhotoUrl}
                  alt={selectedUser.name}
                  className="w-12 h-12 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {selectedUser.givenName?.[0] || selectedUser.name[0]}
                  {selectedUser.familyName?.[0] || ""}
                </div>
              )}
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {selectedUser.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedUser.email}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            // User search/select
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Benutzer suchen..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
                      Keine Benutzer gefunden
                    </div>
                  ) : (
                    filteredUsers.slice(0, 10).map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => selectUser(user)}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                      >
                        {user.thumbnailPhotoUrl ? (
                          <img
                            src={user.thumbnailPhotoUrl}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                            {user.givenName?.[0] || user.name[0]}
                            {user.familyName?.[0] || ""}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {user.email}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          
          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="mt-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Oder manuell eingeben
          </button>
        </div>
      ) : (
        // Manual mode
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Max Mustermann"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              E-Mail *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="max@example.com"
            />
          </div>
          
          {googleConnected && (
            <button
              type="button"
              onClick={() => setManualMode(false)}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Aus Google Workspace auswählen
            </button>
          )}
        </>
      )}

      {/* Outline User Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Outline Benutzer (optional)
        </label>
        {outlineUserId ? (
          <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg">
            {(() => {
              const oUser = outlineUsers.find(u => u.id === outlineUserId);
              return oUser ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">
                    {(oUser.name || "?")[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{oUser.name || "Unbekannt"}</div>
                    {oUser.email && <div className="text-xs text-gray-500">{oUser.email}</div>}
                  </div>
                </>
              ) : (
                <div className="flex-1 text-sm text-gray-600 dark:text-gray-300">
                  ID: {outlineUserId}
                </div>
              );
            })()}
            <button
              type="button"
              onClick={() => setOutlineUserId("")}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={outlineSearch}
              onChange={(e) => {
                setOutlineSearch(e.target.value);
                setShowOutlineDropdown(true);
              }}
              onFocus={() => setShowOutlineDropdown(true)}
              placeholder="Outline Benutzer suchen..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            {showOutlineDropdown && outlineUsers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {outlineUsers
                  .filter(u => 
                    (u.name || "").toLowerCase().includes(outlineSearch.toLowerCase()) ||
                    (u.email || "").toLowerCase().includes(outlineSearch.toLowerCase())
                  )
                  .slice(0, 8)
                  .map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setOutlineUserId(user.id);
                        setOutlineSearch("");
                        setShowOutlineDropdown(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">
                        {(user.name || "?")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name || "Unbekannt"}</div>
                        {user.email && <div className="text-xs text-gray-500 truncate">{user.email}</div>}
                      </div>
                    </button>
                  ))}
                {outlineUsers.filter(u => 
                  (u.name || "").toLowerCase().includes(outlineSearch.toLowerCase()) ||
                  (u.email || "").toLowerCase().includes(outlineSearch.toLowerCase())
                ).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">Keine Benutzer gefunden</div>
                )}
              </div>
            )}
            {outlineUsers.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">Outline API nicht verbunden</p>
            )}
          </div>
        )}
        <p className="mt-1 text-xs text-gray-500">Verknüpft Wiki-Aktivitäten mit diesem Benutzer</p>

        {/* Letzte 5 Wiki-Updates des ausgewählten Outline-Nutzers */}
        {outlineUserId && (
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Letzte Wiki-Einträge / Updates dieses Nutzers (bis zu 5)
            </div>
            {loadingLastUpdates ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                Wird geladen...
              </div>
            ) : lastOutlineUpdates.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Keine Einträge gefunden</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lastOutlineUpdates.map((u, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-2 gap-y-0.5">
                    <span className="font-medium text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 basis-full sm:basis-auto">
                      {u.title}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs shrink-0">
                      ({u.collectionName})
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs shrink-0">
                      {new Date(u.updatedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {teamLeader?.id && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Aktiv
          </label>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Zugewiesene Wiki-Collections
        </label>
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-60 overflow-y-auto">
          {availableCollections.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Keine Collections verfügbar. Prüfe die Outline API Verbindung.
            </p>
          ) : (
            <div className="space-y-2">
              {availableCollections.map((collection) => (
                <label
                  key={collection.id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCollections.some(
                      (c) => c.outlineCollectionId === collection.id
                    )}
                    onChange={() => toggleCollection(collection)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {collection.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={loading || (!manualMode && !selectedUser)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Speichern..." : teamLeader?.id ? "Aktualisieren" : "Erstellen"}
        </button>
      </div>
    </form>
  );
}
