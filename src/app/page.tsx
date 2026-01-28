"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface TeamLeader {
  id: number;
  name: string;
  email: string;
  active: boolean;
  reminderCount: number;
  collections: { id: number; name: string }[];
}

interface ReminderLog {
  id: number;
  sentAt: string;
  status: string;
  reminderCount: number;
  responseType?: string;
  teamLeader: {
    name: string;
    email: string;
  };
}

interface Stats {
  totalTeamLeaders: number;
  activeTeamLeaders: number;
  escalations: number;
  pendingReminders: number;
}

export default function Dashboard() {
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [recentReminders, setRecentReminders] = useState<ReminderLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTeamLeaders: 0,
    activeTeamLeaders: 0,
    escalations: 0,
    pendingReminders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [triggeringReminder, setTriggeringReminder] = useState(false);
  const [reminderResult, setReminderResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [status, setStatus] = useState<{
    outline?: { ok: boolean; error?: string };
    email?: { ok: boolean; error?: string };
    googleChat?: { ok: boolean; configured?: boolean };
    database?: { ok: boolean; error?: string };
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [leadersRes, remindersRes, statusRes] = await Promise.all([
        fetch("/api/teamleaders"),
        fetch("/api/reminders"),
        fetch("/api/status").then((r) => r.json()).catch(() => null),
      ]);
      if (statusRes) setStatus(statusRes);

      const leaders = await leadersRes.json();
      const reminders = await remindersRes.json();

      if (Array.isArray(leaders)) {
        setTeamLeaders(leaders);
        setStats({
          totalTeamLeaders: leaders.length,
          activeTeamLeaders: leaders.filter((l: TeamLeader) => l.active).length,
          escalations: leaders.filter((l: TeamLeader) => l.reminderCount >= 3).length,
          pendingReminders: leaders.filter(
            (l: TeamLeader) => l.active && l.reminderCount > 0 && l.reminderCount < 3
          ).length,
        });
      }

      if (Array.isArray(reminders)) {
        setRecentReminders(reminders.slice(0, 10));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const triggerReminderCheck = async () => {
    setTriggeringReminder(true);
    setReminderResult(null);

    try {
      const res = await fetch("/api/cron/trigger", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setReminderResult({
          success: true,
          message: `${data.results.processed} Teamleiter geprüft, ${data.results.reminders} Erinnerungen gesendet, ${data.results.escalations} Eskalationen`,
        });
        fetchData();
      } else {
        setReminderResult({
          success: false,
          message: data.error || "Fehler beim Ausführen",
        });
      }
    } catch {
      setReminderResult({
        success: false,
        message: "Verbindungsfehler",
      });
    }

    setTriggeringReminder(false);
  };

  const getStatusColor = (reminderCount: number) => {
    if (reminderCount >= 3) return "text-red-600 dark:text-red-400";
    if (reminderCount > 0) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const getStatusText = (reminderCount: number) => {
    if (reminderCount >= 3) return "Eskaliert";
    if (reminderCount > 0) return `${reminderCount}x erinnert`;
    return "OK";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-96">
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-96">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Wiki Reminder Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Übersicht aller Teamleiter und Wiki-Aktualisierungen
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
              >
                Admin
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 rounded-lg transition-colors"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Teamleiter gesamt
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalTeamLeaders}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Aktiv
            </div>
            <div className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.activeTeamLeaders}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Ausstehende Erinnerungen
            </div>
            <div className="mt-2 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.pendingReminders}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Eskalationen
            </div>
            <div className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
              {stats.escalations}
            </div>
          </div>
        </div>

        {/* Status-Check */}
        {status && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Service-Status
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${status.outline?.ok ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">Outline API</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${status.email?.ok ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">MailerSend</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${status.googleChat?.configured ? "bg-green-500" : "bg-gray-400"}`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">Google Chat</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${status.database?.ok ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">Datenbank</span>
              </div>
            </div>
          </div>
        )}

        {/* Manual Trigger Button */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Manueller Reminder-Check
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Prüft alle Teamleiter und sendet bei Bedarf Erinnerungen
              </p>
            </div>
            <button
              onClick={triggerReminderCheck}
              disabled={triggeringReminder}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {triggeringReminder ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Wird ausgeführt...
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Jetzt ausführen
                </>
              )}
            </button>
          </div>
          {reminderResult && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                reminderResult.success
                  ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
              }`}
            >
              {reminderResult.message}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Team Leader Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Teamleiter Status
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {teamLeaders.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  Noch keine Teamleiter vorhanden.
                  <Link
                    href="/admin"
                    className="text-blue-600 dark:text-blue-400 ml-1 hover:underline"
                  >
                    Jetzt hinzufügen
                  </Link>
                </div>
              ) : (
                teamLeaders.map((leader) => (
                  <div
                    key={leader.id}
                    className={`px-6 py-4 flex items-center justify-between ${
                      !leader.active ? "opacity-50" : ""
                    }`}
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {leader.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {leader.email}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {leader.collections.map((c) => (
                          <span
                            key={c.id}
                            className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded"
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div
                      className={`font-medium ${getStatusColor(leader.reminderCount)}`}
                    >
                      {!leader.active ? "Inaktiv" : getStatusText(leader.reminderCount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Letzte Aktivitäten
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {recentReminders.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  Noch keine Erinnerungen versendet.
                </div>
              ) : (
                recentReminders.map((reminder) => (
                  <div key={reminder.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {reminder.teamLeader.name}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          reminder.status === "responded"
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : reminder.status === "escalated"
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {reminder.status === "responded"
                          ? "Beantwortet"
                          : reminder.status === "escalated"
                          ? "Eskaliert"
                          : "Gesendet"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {reminder.reminderCount}. Erinnerung am {formatDate(reminder.sentAt)}
                    </div>
                    {reminder.responseType && (
                      <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                        Antwort:{" "}
                        {reminder.responseType === "updated"
                          ? "Aktualisiert"
                          : reminder.responseType === "nothing_to_update"
                          ? "Nichts zu aktualisieren"
                          : "Wird erledigt"}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
