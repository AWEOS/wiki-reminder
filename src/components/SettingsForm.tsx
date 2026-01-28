"use client";

import { useState, useEffect } from "react";

interface Settings {
  managerEmail: string;
  cronSchedule: string;
  escalationThreshold: number;
}

export default function SettingsForm() {
  const [settings, setSettings] = useState<Settings>({
    managerEmail: "",
    cronSchedule: "0 9 * * 1",
    escalationThreshold: 3,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [emailPreview, setEmailPreview] = useState<{ subject: string; html: string } | null>(null);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Einstellungen gespeichert!" });
      } else {
        setMessage({ type: "error", text: "Fehler beim Speichern" });
      }
    } catch {
      setMessage({ type: "error", text: "Fehler beim Speichern" });
    }

    setSaving(false);
  };

  const cronPresets = [
    { label: "Jeden Montag 9:00", value: "0 9 * * 1" },
    { label: "Jeden Freitag 9:00", value: "0 9 * * 5" },
    { label: "Täglich 9:00", value: "0 9 * * *" },
    { label: "Alle 2 Wochen (Montag)", value: "0 9 * * 1/2" },
  ];

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Manager E-Mail (für Eskalationen)
        </label>
        <input
          type="email"
          value={settings.managerEmail}
          onChange={(e) => setSettings({ ...settings, managerEmail: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="manager@example.com"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Diese E-Mail erhält CC bei Eskalationen (3+ verpasste Updates)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Erinnerungs-Zeitplan (Cron)
        </label>
        <div className="flex gap-2 mb-2">
          {cronPresets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setSettings({ ...settings, cronSchedule: preset.value })}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                settings.cronSchedule === preset.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={settings.cronSchedule}
          onChange={(e) => setSettings({ ...settings, cronSchedule: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono"
          placeholder="0 9 * * 1"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Format: Minute Stunde Tag Monat Wochentag
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Eskalationsschwelle
        </label>
        <input
          type="number"
          min={1}
          max={10}
          value={settings.escalationThreshold}
          onChange={(e) =>
            setSettings({ ...settings, escalationThreshold: parseInt(e.target.value) || 3 })
          }
          className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Nach wie vielen verpassten Updates soll eskaliert werden?
        </p>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Speichern..." : "Einstellungen speichern"}
        </button>
      </div>

      {/* E-Mail-Vorschau */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-8">
        <button
          type="button"
          onClick={async () => {
            if (!emailPreviewOpen && !emailPreview) {
              const res = await fetch("/api/email-preview");
              const data = await res.json();
              setEmailPreview(data);
            }
            setEmailPreviewOpen(!emailPreviewOpen);
          }}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
        >
          {emailPreviewOpen ? "E-Mail-Vorschau ausblenden" : "E-Mail-Vorschau anzeigen"}
          <svg className={`w-4 h-4 transition-transform ${emailPreviewOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {emailPreviewOpen && emailPreview && (
          <div className="mt-4 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-300">
              Betreff: {emailPreview.subject}
            </div>
            <div className="bg-white dark:bg-gray-800 max-h-96 overflow-auto p-4">
              <div dangerouslySetInnerHTML={{ __html: emailPreview.html }} className="prose prose-sm max-w-none dark:prose-invert" />
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
