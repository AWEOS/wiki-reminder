"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

interface GoogleUser {
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

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

type FilterType = "all" | "active" | "admins" | "suspended";

export default function ImportPage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [domain, setDomain] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<GoogleUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("active");
  const [ouFilter, setOuFilter] = useState<string>("all");
  const [replaceExisting, setReplaceExisting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const [stats, setStats] = useState({ total: 0, active: 0, suspended: 0, admins: 0 });
  const [orgUnits, setOrgUnits] = useState<string[]>([]);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/google-workspace");
      const data = await res.json();
      setConnected(data.connected);
      setDomain(data.domain || "");
      setError(data.error || null);

      if (data.connected) {
        loadUsers();
      }
    } catch {
      setConnected(false);
      setError("Verbindungsfehler");
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/google-workspace/users");
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        setStats(data.stats);
        setOrgUnits(data.orgUnits || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoadingUsers(false);
  };

  const toggleUser = (email: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedUsers(newSelected);
  };

  const selectAll = () => {
    setSelectedUsers(new Set(filteredUsers.map((u) => u.email)));
  };

  const selectNone = () => {
    setSelectedUsers(new Set());
  };

  const importUsers = async () => {
    if (selectedUsers.size === 0) return;

    setImporting(true);
    setImportResult(null);

    try {
      const res = await fetch("/api/google-workspace/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmails: Array.from(selectedUsers),
          replaceExisting,
        }),
      });

      const data = await res.json();
      setImportResult(data);
    } catch (err) {
      setImportResult({
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : "Unbekannter Fehler"],
      });
    }

    setImporting(false);
  };

  // Apply filters
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Type filter
      if (typeFilter === "active" && u.suspended) return false;
      if (typeFilter === "suspended" && !u.suspended) return false;
      if (typeFilter === "admins" && (!u.isAdmin || u.suspended)) return false;
      
      // OU filter
      if (ouFilter !== "all" && u.orgUnitPath !== ouFilter) return false;
      
      // Search filter
      if (searchFilter) {
        const search = searchFilter.toLowerCase();
        if (
          !u.name.toLowerCase().includes(search) &&
          !u.email.toLowerCase().includes(search)
        ) {
          return false;
        }
      }
      
      return true;
    });
  }, [users, typeFilter, ouFilter, searchFilter]);

  // Group users by org unit
  const usersByOrgUnit = useMemo(() => {
    return filteredUsers.reduce((acc, user) => {
      const ou = user.orgUnitPath || "/";
      if (!acc[ou]) acc[ou] = [];
      acc[ou].push(user);
      return acc;
    }, {} as Record<string, GoogleUser[]>);
  }, [filteredUsers]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Google Workspace Import
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Teamleiter aus Google Workspace importieren
              </p>
            </div>
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Zurück zum Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Verbindungsstatus
          </h2>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              Verbindung wird geprüft...
            </div>
          ) : connected === null ? (
            <div className="text-gray-500">Verbindung nicht geprüft</div>
          ) : connected ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Verbunden mit <span className="font-medium">{domain}</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-4">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                Nicht verbunden
              </div>
              {error && (
                <div className="text-sm text-red-500 dark:text-red-400 mb-4">
                  {error}
                </div>
              )}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-sm">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Setup-Anleitung:
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
                  <li>
                    Google Cloud Console öffnen und ein Projekt erstellen/auswählen
                  </li>
                  <li>Admin SDK API aktivieren</li>
                  <li>
                    Service Account erstellen mit &quot;Domain-wide Delegation&quot;
                  </li>
                  <li>
                    JSON-Key herunterladen und als{" "}
                    <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">
                      GOOGLE_SERVICE_ACCOUNT_KEY
                    </code>{" "}
                    in .env speichern (Base64-encoded)
                  </li>
                  <li>
                    Im Google Workspace Admin Console den Service Account
                    autorisieren unter Security → API Controls → Domain-wide
                    Delegation
                  </li>
                  <li>
                    <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">
                      GOOGLE_ADMIN_EMAIL
                    </code>{" "}
                    mit einer Admin-E-Mail setzen
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* User List */}
        {connected && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <button
                onClick={() => setTypeFilter("all")}
                className={`p-4 rounded-lg text-left transition-all ${
                  typeFilter === "all"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white dark:bg-gray-800 shadow hover:shadow-md"
                }`}
              >
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className={typeFilter === "all" ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}>
                  Alle Benutzer
                </div>
              </button>
              <button
                onClick={() => setTypeFilter("active")}
                className={`p-4 rounded-lg text-left transition-all ${
                  typeFilter === "active"
                    ? "bg-green-600 text-white shadow-lg"
                    : "bg-white dark:bg-gray-800 shadow hover:shadow-md"
                }`}
              >
                <div className="text-2xl font-bold">{stats.active}</div>
                <div className={typeFilter === "active" ? "text-green-100" : "text-gray-500 dark:text-gray-400"}>
                  Aktive Benutzer
                </div>
              </button>
              <button
                onClick={() => setTypeFilter("admins")}
                className={`p-4 rounded-lg text-left transition-all ${
                  typeFilter === "admins"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-white dark:bg-gray-800 shadow hover:shadow-md"
                }`}
              >
                <div className="text-2xl font-bold">{stats.admins}</div>
                <div className={typeFilter === "admins" ? "text-purple-100" : "text-gray-500 dark:text-gray-400"}>
                  Admins
                </div>
              </button>
              <button
                onClick={() => setTypeFilter("suspended")}
                className={`p-4 rounded-lg text-left transition-all ${
                  typeFilter === "suspended"
                    ? "bg-red-600 text-white shadow-lg"
                    : "bg-white dark:bg-gray-800 shadow hover:shadow-md"
                }`}
              >
                <div className="text-2xl font-bold">{stats.suspended}</div>
                <div className={typeFilter === "suspended" ? "text-red-100" : "text-gray-500 dark:text-gray-400"}>
                  Suspendiert
                </div>
              </button>
            </div>

            {/* Filter and Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Suchen nach Name oder E-Mail..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {orgUnits.length > 1 && (
                    <div className="sm:w-64">
                      <select
                        value={ouFilter}
                        onChange={(e) => setOuFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        <option value="all">Alle Organisationseinheiten</option>
                        {orgUnits.map((ou) => (
                          <option key={ou} value={ou}>
                            {ou === "/" ? "Root" : ou}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Alle auswählen
                  </button>
                  <button
                    onClick={selectNone}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Keine
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Existierende Benutzer aktualisieren
                </label>
                <span className="text-sm text-gray-500">
                  <span className="font-medium text-gray-900 dark:text-white">{selectedUsers.size}</span> von{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{filteredUsers.length}</span> ausgewählt
                </span>
                {typeFilter !== "all" && (
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                    Filter: {typeFilter === "active" ? "Aktive" : typeFilter === "admins" ? "Admins" : "Suspendierte"}
                  </span>
                )}
              </div>
            </div>

            {/* User Cards by OU */}
            {loadingUsers ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Benutzer werden geladen...</p>
              </div>
            ) : (
              <div className="space-y-6 mb-6">
                {Object.entries(usersByOrgUnit)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([ou, ouUsers]) => (
                    <div
                      key={ou}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
                    >
                      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {ou === "/" ? "Root" : ou}
                          <span className="ml-2 text-sm text-gray-500">
                            ({ouUsers.length} Benutzer)
                          </span>
                        </h3>
                      </div>
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {ouUsers.map((user) => (
                          <label
                            key={user.id}
                            className={`flex items-center px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                              user.suspended ? "opacity-60" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.email)}
                              onChange={() => toggleUser(user.email)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              disabled={user.suspended}
                            />
                            {/* Profile Photo */}
                            <div className="ml-4 flex-shrink-0">
                              {user.thumbnailPhotoUrl ? (
                                <img
                                  src={user.thumbnailPhotoUrl}
                                  alt={user.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                                  {user.givenName?.[0] || user.name[0]}
                                  {user.familyName?.[0] || ""}
                                </div>
                              )}
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                                <span className="truncate">{user.name}</span>
                                {user.isAdmin && (
                                  <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded flex-shrink-0">
                                    Admin
                                  </span>
                                )}
                                {user.suspended && (
                                  <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded flex-shrink-0">
                                    Suspendiert
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 truncate">
                                {user.email}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Import Button */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <button
                onClick={importUsers}
                disabled={importing || selectedUsers.size === 0}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Wird importiert...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    {selectedUsers.size} Benutzer importieren
                  </>
                )}
              </button>

              {importResult && (
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    importResult.errors.length === 0
                      ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700"
                      : "bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700"
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white mb-2">
                    Import abgeschlossen
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-green-600 dark:text-green-400 font-bold">
                        {importResult.imported}
                      </span>{" "}
                      importiert
                    </div>
                    <div>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        {importResult.updated}
                      </span>{" "}
                      aktualisiert
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 font-bold">
                        {importResult.skipped}
                      </span>{" "}
                      übersprungen
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      Fehler: {importResult.errors.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
