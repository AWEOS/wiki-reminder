"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import TeamLeaderForm from "@/components/TeamLeaderForm";
import TeamLeaderTable from "@/components/TeamLeaderTable";
import SettingsForm from "@/components/SettingsForm";
import Link from "next/link";

interface Collection {
  id: number;
  name: string;
  outlineCollectionId: string;
}

interface ReminderLog {
  id: number;
  sentAt: string;
  status: string;
  reminderCount: number;
}

interface TeamLeader {
  id: number;
  name: string;
  email: string;
  googleChatId?: string;
  outlineUserId?: string;
  active: boolean;
  reminderCount: number;
  collections: Collection[];
  reminderLogs: ReminderLog[];
}

export default function AdminPage() {
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLeader, setEditingLeader] = useState<TeamLeader | null>(null);
  const [activeTab, setActiveTab] = useState<"teamleaders" | "settings" | "audit" | "export">("teamleaders");

  const fetchTeamLeaders = useCallback(async () => {
    try {
      const res = await fetch("/api/teamleaders");
      const data = await res.json();
      setTeamLeaders(data);
    } catch (error) {
      console.error("Failed to fetch team leaders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamLeaders();
  }, [fetchTeamLeaders]);

  const handleSave = async (data: { id?: number; name: string; email: string; googleChatId?: string; outlineUserId?: string; active?: boolean; collections?: { outlineCollectionId: string; name: string }[] }) => {
    const url = data.id ? `/api/teamleaders/${data.id}` : "/api/teamleaders";
    const method = data.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const apiData = await res.json().catch(() => ({}));
      throw new Error(apiData.error || "Speichern fehlgeschlagen");
    }

    setShowForm(false);
    setEditingLeader(null);
    fetchTeamLeaders();
  };

  const handleDelete = async (id: number) => {
    const numId = Number(id);
    const previousLeaders = teamLeaders;
    // Sofort optimistisch aus der Liste entfernen (Live-Update)
    setTeamLeaders((prev) => prev.filter((l) => l.id !== numId));
    if (editingLeader?.id === numId) {
      setEditingLeader(null);
      setShowForm(false);
    }
    try {
      const res = await fetch(`/api/teamleaders/${numId}`, { method: "DELETE" });
      if (!res.ok) {
        setTeamLeaders(previousLeaders);
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Löschen fehlgeschlagen");
      } else {
        // Nach Erfolg vom Server neu laden, damit die Ansicht garantiert stimmt
        fetchTeamLeaders();
      }
    } catch (error) {
      setTeamLeaders(previousLeaders);
      console.error("Failed to delete team leader:", error);
      alert("Fehler beim Löschen");
    }
  };

  const handleEdit = (leader: TeamLeader) => {
    setEditingLeader(leader);
    setShowForm(true);
  };

  const [auditLogs, setAuditLogs] = useState<{ id: number; action: string; entityType: string; entityId?: string; details?: string; userEmail?: string; createdAt: string }[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/audit?limit=100");
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "audit") fetchAuditLogs();
  }, [activeTab, fetchAuditLogs]);

  const handleTestEmail = async (leader: TeamLeader) => {
    const testEmail = localStorage.getItem("debug_test_email") || "simon@aweos.de";
    
    if (!confirm(`Test-Reminder für "${leader.name}" an ${testEmail} senden?`)) {
      return;
    }

    try {
      const res = await fetch("/api/debug/test-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamLeaderId: leader.id,
          testEmail,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        alert(`Test-E-Mail wurde an ${testEmail} gesendet!`);
      } else {
        alert(`Fehler: ${data.error}`);
      }
    } catch (error) {
      alert("Fehler beim Senden der Test-E-Mail");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Wiki Reminder System verwalten
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin/import"
                className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Google Import
              </Link>
              <Link
                href="/admin/debug"
                className="px-4 py-2 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Debug & Tests
              </Link>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Zurück zum Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("teamleaders")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "teamleaders"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Teamleiter
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "settings"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Einstellungen
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "audit"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Audit-Log
            </button>
            <button
              onClick={() => setActiveTab("export")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "export"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Export
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "teamleaders" && (
          <>
            {/* Add Button */}
            {!showForm && (
              <div className="mb-6">
                <button
                  onClick={() => {
                    setEditingLeader(null);
                    setShowForm(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Teamleiter hinzufügen
                </button>
              </div>
            )}

            {/* Form or Table */}
            {showForm ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  {editingLeader ? "Teamleiter bearbeiten" : "Neuen Teamleiter hinzufügen"}
                </h2>
                <TeamLeaderForm
                  teamLeader={editingLeader}
                  onSave={handleSave}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingLeader(null);
                  }}
                />
              </div>
            ) : loading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <TeamLeaderTable
                  teamLeaders={teamLeaders}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onTestEmail={handleTestEmail}
                />
              </div>
            )}
          </>
        )}

        {activeTab === "settings" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Systemeinstellungen
            </h2>
            <SettingsForm />
          </div>
        )}

        {activeTab === "audit" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white p-6 pb-0">
              Audit-Log
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 px-6 pt-2">
              Letzte Änderungen und Aktionen
            </p>
            {auditLoading ? (
              <div className="p-12 text-center text-gray-500">Laden...</div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Zeit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Aktion</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Typ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Von</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("de-DE")}
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {log.action}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {log.entityType}
                          {log.entityId ? ` #${log.entityId}` : ""}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {log.userEmail || "-"}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {log.details || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {auditLogs.length === 0 && !auditLoading && (
                  <div className="p-12 text-center text-gray-500">Keine Einträge</div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "export" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Daten exportieren
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/api/export/teamleaders"
                download
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Teamleiter als CSV
              </a>
              <a
                href="/api/export/reminders"
                download
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Reminder-Historie als CSV
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
