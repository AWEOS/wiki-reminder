"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TestResult {
  success: boolean;
  message: string;
  details?: string;
}

interface TeamLeader {
  id: number;
  name: string;
  email: string;
}

export default function DebugPage() {
  const [testEmail, setTestEmail] = useState("simon@aweos.de");
  const [emailResult, setEmailResult] = useState<TestResult | null>(null);
  const [chatResult, setChatResult] = useState<TestResult | null>(null);
  const [outlineResult, setOutlineResult] = useState<TestResult | null>(null);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [selectedLeader, setSelectedLeader] = useState<number | null>(null);
  const [reminderResult, setReminderResult] = useState<TestResult | null>(null);
  
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [loadingReminder, setLoadingReminder] = useState(false);

  useEffect(() => {
    // Load test email from localStorage
    const savedEmail = localStorage.getItem("debug_test_email");
    if (savedEmail) {
      setTestEmail(savedEmail);
    }
    
    // Fetch team leaders
    fetch("/api/teamleaders")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTeamLeaders(data);
        }
      })
      .catch(console.error);
  }, []);

  const saveTestEmail = (email: string) => {
    setTestEmail(email);
    localStorage.setItem("debug_test_email", email);
  };

  const testEmailConnection = async () => {
    setLoadingEmail(true);
    setEmailResult(null);
    
    try {
      const res = await fetch("/api/debug/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      setEmailResult({
        success: data.success,
        message: data.success ? "Test-E-Mail erfolgreich gesendet!" : "Fehler beim Senden",
        details: data.error || data.messageId,
      });
    } catch (error) {
      setEmailResult({
        success: false,
        message: "Verbindungsfehler",
        details: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    }
    
    setLoadingEmail(false);
  };

  const testGoogleChat = async () => {
    setLoadingChat(true);
    setChatResult(null);
    
    try {
      const res = await fetch("/api/debug/test-chat", {
        method: "POST",
      });
      const data = await res.json();
      setChatResult({
        success: data.success,
        message: data.success ? "Test-Nachricht erfolgreich gesendet!" : "Fehler beim Senden",
        details: data.error,
      });
    } catch (error) {
      setChatResult({
        success: false,
        message: "Verbindungsfehler",
        details: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    }
    
    setLoadingChat(false);
  };

  const testOutlineConnection = async () => {
    setLoadingOutline(true);
    setOutlineResult(null);
    
    try {
      const res = await fetch("/api/outline");
      const data = await res.json();
      
      if (data.connected) {
        setOutlineResult({
          success: true,
          message: "Outline API Verbindung erfolgreich!",
          details: `${data.collections?.length || 0} Collections gefunden`,
        });
      } else {
        setOutlineResult({
          success: false,
          message: "Verbindung fehlgeschlagen",
          details: data.error,
        });
      }
    } catch (error) {
      setOutlineResult({
        success: false,
        message: "Verbindungsfehler",
        details: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    }
    
    setLoadingOutline(false);
  };

  const sendTestReminder = async () => {
    if (!selectedLeader) return;
    
    setLoadingReminder(true);
    setReminderResult(null);
    
    try {
      const res = await fetch("/api/debug/test-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          teamLeaderId: selectedLeader,
          testEmail: testEmail,
        }),
      });
      const data = await res.json();
      setReminderResult({
        success: data.success,
        message: data.success 
          ? `Test-Reminder an ${testEmail} gesendet!` 
          : "Fehler beim Senden",
        details: data.error || `Response-URL: ${data.responseUrl}`,
      });
    } catch (error) {
      setReminderResult({
        success: false,
        message: "Verbindungsfehler",
        details: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    }
    
    setLoadingReminder(false);
  };

  const ResultBox = ({ result }: { result: TestResult | null }) => {
    if (!result) return null;
    
    return (
      <div
        className={`mt-4 p-4 rounded-lg ${
          result.success
            ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700"
            : "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700"
        }`}
      >
        <div className={`font-medium ${result.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
          {result.message}
        </div>
        {result.details && (
          <div className={`mt-1 text-sm ${result.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {result.details}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Debug & Tests
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Verbindungen testen und Debug-Funktionen
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Test Email Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Test-Empfänger Konfiguration
          </h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Test E-Mail Adresse
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => saveTestEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="simon@aweos.de"
              />
            </div>
            <button
              onClick={() => saveTestEmail("simon@aweos.de")}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Standard wiederherstellen
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Alle Test-E-Mails werden an diese Adresse gesendet
          </p>
        </div>

        {/* Connection Tests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* E-Mail Test */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              E-Mail Verbindung
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Sendet eine Test-E-Mail an den konfigurierten Empfänger
            </p>
            <button
              onClick={testEmailConnection}
              disabled={loadingEmail}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingEmail ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Wird gesendet...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Test-E-Mail senden
                </>
              )}
            </button>
            <ResultBox result={emailResult} />
          </div>

          {/* Google Chat Test */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Google Chat Verbindung
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Sendet eine Test-Nachricht an den konfigurierten Webhook
            </p>
            <button
              onClick={testGoogleChat}
              disabled={loadingChat}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingChat ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Wird gesendet...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Test-Chat senden
                </>
              )}
            </button>
            <ResultBox result={chatResult} />
          </div>

          {/* Outline API Test */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Outline API Verbindung
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Testet die Verbindung zur Outline Wiki API
            </p>
            <button
              onClick={testOutlineConnection}
              disabled={loadingOutline}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingOutline ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Wird getestet...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Verbindung testen
                </>
              )}
            </button>
            <ResultBox result={outlineResult} />
          </div>

          {/* Database Connection Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Datenbank Status
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Informationen zur Datenbankverbindung
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Teamleiter:</span>
                <span className="font-medium text-gray-900 dark:text-white">{teamLeaders.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs">
                  Verbunden
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Test Reminder */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Test-Reminder senden
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Sendet eine echte Reminder-E-Mail an die Test-Adresse (ohne den Counter zu erhöhen)
          </p>
          
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Teamleiter auswählen
              </label>
              <select
                value={selectedLeader || ""}
                onChange={(e) => setSelectedLeader(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Wähle einen Teamleiter...</option>
                {teamLeaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name} ({leader.email})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={sendTestReminder}
              disabled={loadingReminder || !selectedLeader}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loadingReminder ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Wird gesendet...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Test-Reminder senden
                </>
              )}
            </button>
          </div>
          
          <ResultBox result={reminderResult} />
          
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Hinweis:</strong> Der Test-Reminder wird an <strong>{testEmail}</strong> gesendet, 
              nicht an die echte E-Mail des Teamleiters. Der Reminder-Counter wird nicht erhöht.
            </p>
          </div>
        </div>

        {/* Environment Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Umgebungsinformationen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">App URL:</span>
              <span className="ml-2 font-mono text-gray-900 dark:text-white">
                {typeof window !== "undefined" ? window.location.origin : ""}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Test-Empfänger:</span>
              <span className="ml-2 font-mono text-gray-900 dark:text-white">{testEmail}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
