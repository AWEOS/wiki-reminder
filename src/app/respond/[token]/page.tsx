"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";

interface TokenData {
  valid: boolean;
  expired?: boolean;
  used?: boolean;
  teamLeader?: {
    name: string;
    email: string;
  };
  collections?: string[];
  reminderCount?: number;
}

export default function RespondPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<string | null>(
    searchParams.get("response")
  );
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate token
    fetch(`/api/respond/${resolvedParams.token}`)
      .then((res) => res.json())
      .then((data) => {
        setTokenData(data);
        setLoading(false);
      })
      .catch(() => {
        setTokenData({ valid: false });
        setLoading(false);
      });
  }, [resolvedParams.token]);

  const handleSubmit = async (responseType: string) => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/respond/${resolvedParams.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseType,
          comment,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Ein Fehler ist aufgetreten");
      }
    } catch {
      setError("Ein Fehler ist aufgetreten");
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tokenData?.valid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {tokenData?.expired
              ? "Link abgelaufen"
              : tokenData?.used
              ? "Bereits beantwortet"
              : "Ungültiger Link"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {tokenData?.expired
              ? "Dieser Link ist nicht mehr gültig. Bitte warte auf die nächste Erinnerung."
              : tokenData?.used
              ? "Du hast bereits auf diese Erinnerung geantwortet."
              : "Dieser Link ist ungültig oder existiert nicht."}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Danke für deine Rückmeldung!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Deine Antwort wurde erfolgreich gespeichert.
          </p>
        </div>
      </div>
    );
  }

  const responseOptions = [
    {
      id: "updated",
      label: "Ich habe aktualisiert",
      description: "Ich habe meine Wiki-Dokumentation diese Woche aktualisiert.",
      color: "green",
    },
    {
      id: "nothing_to_update",
      label: "Nichts zu aktualisieren",
      description: "Es gab diese Woche keine Änderungen, die dokumentiert werden müssen.",
      color: "gray",
    },
    {
      id: "will_update",
      label: "Ich kümmere mich darum",
      description: "Ich werde die Dokumentation zeitnah aktualisieren.",
      color: "blue",
    },
    {
      id: "snooze",
      label: "1 Woche pausieren",
      description: "Erinnerungen für 7 Tage aussetzen (z.B. Urlaub, Krankheit).",
      color: "gray",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-8 text-white">
            <h1 className="text-2xl font-bold">Wiki-Erinnerung</h1>
            <p className="mt-2 opacity-90">
              Hallo {tokenData.teamLeader?.name}, bitte bestätige den Status deiner
              Wiki-Dokumentation.
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Collections */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Deine zugewiesenen Bereiche:
              </h3>
              <div className="flex flex-wrap gap-2">
                {tokenData.collections?.map((collection, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                  >
                    {collection}
                  </span>
                ))}
              </div>
            </div>

            {/* Reminder count warning */}
            {(tokenData.reminderCount ?? 0) >= 2 && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  Dies ist bereits die {tokenData.reminderCount}. Erinnerung.
                  {(tokenData.reminderCount ?? 0) >= 3 &&
                    " Dein Manager wurde informiert."}
                </p>
              </div>
            )}

            {/* Response options */}
            <div className="space-y-3">
              {responseOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedResponse(option.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedResponse === option.id
                      ? option.color === "green"
                        ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                        : option.color === "blue"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                        : "border-gray-500 bg-gray-50 dark:bg-gray-700"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>

            {/* Comment field */}
            {selectedResponse && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kommentar (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Füge optional einen Kommentar hinzu..."
                />
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Submit button */}
            {selectedResponse && (
              <button
                onClick={() => handleSubmit(selectedResponse)}
                disabled={submitting}
                className="mt-6 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? "Wird gesendet..." : "Bestätigen"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
