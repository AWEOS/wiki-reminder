"use client";

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

interface Props {
  teamLeaders: TeamLeader[];
  onEdit: (teamLeader: TeamLeader) => void;
  onDelete: (id: number) => void;
  onTestEmail?: (teamLeader: TeamLeader) => void;
}

export default function TeamLeaderTable({ teamLeaders, onEdit, onDelete, onTestEmail }: Props) {
  const getStatusBadge = (reminderCount: number, active: boolean) => {
    if (!active) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
          Inaktiv
        </span>
      );
    }
    if (reminderCount >= 3) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-full">
          Eskaliert ({reminderCount}x)
        </span>
      );
    }
    if (reminderCount > 0) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 rounded-full">
          Erinnert ({reminderCount}x)
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
        OK
      </span>
    );
  };

  if (teamLeaders.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          Keine Teamleiter
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Füge deinen ersten Teamleiter hinzu, um zu starten.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              E-Mail
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Collections
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Aktionen
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {teamLeaders.map((leader) => (
            <tr key={leader.id} className={!leader.active ? "opacity-50" : ""}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {leader.name}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {leader.email}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {leader.collections.length === 0 ? (
                    <span className="text-sm text-gray-400">Keine</span>
                  ) : (
                    leader.collections.map((c) => (
                      <span
                        key={c.id}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded"
                      >
                        {c.name}
                      </span>
                    ))
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(leader.reminderCount, leader.active)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-3">
                  {onTestEmail && (
                    <button
                      onClick={() => onTestEmail(leader)}
                      className="p-1.5 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                      title="Test-E-Mail senden"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(leader)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Möchtest du "${leader.name}" wirklich löschen?`)) {
                        onDelete(leader.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Löschen
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
