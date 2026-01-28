# Wiki Reminder System

Ein automatisches Erinnerungssystem für Wiki-Aktualisierungen, das mit Outline Wiki integriert ist.

**Repository:** [github.com/AWEOS/wiki-reminder](https://github.com/AWEOS/wiki-reminder)

## Features

- **Automatische Erinnerungen**: Wöchentliche Überprüfung ob Teamleiter ihre Wiki-Dokumentation aktualisiert haben
- **Outline API Integration**: Automatische Erkennung von Dokumenten-Updates
- **Multi-Channel Benachrichtigung**: E-Mail und Google Chat Webhooks
- **Eskalationssystem**: Nach 3 verpassten Updates wird der Manager informiert
- **Admin Dashboard**: Übersichtliche Verwaltung aller Teamleiter
- **Response-Tracking**: Teamleiter können über einen Link antworten

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS + TypeScript
- **Datenbank**: MySQL 8.0
- **ORM**: Prisma
- **Scheduling**: node-cron
- **E-Mail**: MailerSend
- **Auth**: NextAuth (Google SSO, nur @aweos.de)
- **Containerisierung**: Docker + Docker Compose (Multi-Stage, Non-Root, Health Checks)

## Installation

### 1. Repository klonen und Dependencies installieren

```bash
git clone https://github.com/AWEOS/wiki-reminder.git
cd wiki-reminder
npm install
```

### 2. Umgebungsvariablen konfigurieren

Kopiere `.env.example` nach `.env` und passe die Werte an:

```bash
cp .env.example .env
```

Wichtige Variablen:
- `DATABASE_URL`: MySQL Connection String
- `OUTLINE_API_URL`: URL zu deiner Outline Instanz
- `OUTLINE_API_TOKEN`: API Token von Outline
- `MAILERSEND_API_TOKEN`: MailerSend API Token für E-Mails
- `GOOGLE_CHAT_WEBHOOK_URL`: Google Chat Webhook URL
- `MANAGER_EMAIL`: E-Mail für Eskalationen
- **Auth:** `AUTH_SECRET` (z.B. `openssl rand -base64 32`), optional `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` für Google Login, oder `ADMIN_EMAIL`/`ADMIN_PASSWORD` für E-Mail-Login

### 3. Mit Docker starten (empfohlen)

**Produktion (Weltklasse-Standard):**

- Multi-Stage Build, Non-Root-User, Health Checks
- Alle Secrets über Umgebungsvariablen (keine `.env` im Image)
- `AUTH_SECRET` **zwingend** setzen: `openssl rand -base64 32`

```bash
# .env mit allen Werten (inkl. AUTH_SECRET, AUTH_GOOGLE_*, MAILERSEND_*, etc.)
docker compose up -d
```

- App: `http://localhost:3000`
- Health Check: `GET /api/health` (öffentlich, für Load-Balancer/Docker)
- DB-Health: MySQL-Container wartet bis Datenbank bereit ist, danach startet die App

### 4. Alternativ: Lokale Entwicklung

1. MySQL starten (lokal oder via Docker):
```bash
docker run -d --name mysql -e MYSQL_ROOT_PASSWORD=wiki_reminder_2024 -e MYSQL_DATABASE=wiki_reminder -p 3306:3306 mysql:8.0
```

2. Datenbank-Schema erstellen:
```bash
npx prisma db push
```

3. Entwicklungsserver starten:
```bash
npm run dev
```

## Verwendung

### Login (`/login`)
- Ohne Google OAuth: `ADMIN_EMAIL` und `ADMIN_PASSWORD` in .env setzen, dann mit E-Mail/Passwort anmelden.
- Mit Google: In Google Cloud Console OAuth-Client erstellen, `AUTH_GOOGLE_ID` und `AUTH_GOOGLE_SECRET` setzen. Geschützte Bereiche: `/admin`, `/admin/*`, Einstellungen, Export, Audit, Debug, Google Import.

### Admin Dashboard (`/admin`)

- Teamleiter hinzufügen/bearbeiten/löschen
- Outline Collections zuweisen
- Systemeinstellungen konfigurieren (Cron Schedule, Eskalationsschwelle)

### Haupt-Dashboard (`/`)

- **Service-Status:** Outline, MailerSend, Google Chat, Datenbank
- Übersicht aller Teamleiter und deren Status
- Letzte Aktivitäten und Erinnerungen
- Manueller Trigger für Reminder-Check

### API Endpoints

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/teamleaders` | GET, POST | Teamleiter auflisten/erstellen |
| `/api/teamleaders/[id]` | GET, PUT, DELETE | Einzelnen Teamleiter verwalten |
| `/api/outline` | GET | Outline Verbindung testen |
| `/api/settings` | GET, PUT | Einstellungen verwalten |
| `/api/cron/trigger` | POST | Manuellen Reminder-Check ausführen |
| `/api/reminders` | GET | Reminder-Historie abrufen |

## Outline API Token erstellen

1. Gehe zu deiner Outline Instanz
2. Navigiere zu Einstellungen → API
3. Erstelle einen neuen API Token mit Lesezugriff auf Collections und Dokumente

## Google Chat Webhook einrichten

1. Öffne den Google Chat Space
2. Klicke auf den Space-Namen → Apps & Integrationen
3. Wähle "Webhooks" und erstelle einen neuen Webhook
4. Kopiere die Webhook URL in die `.env` Datei

## Cron Schedule

Das Standard-Schedule ist `0 9 * * 1` (jeden Montag um 9:00 Uhr).

Format: `Minute Stunde Tag Monat Wochentag`

Beispiele:
- `0 9 * * 1` - Jeden Montag 9:00
- `0 9 * * 5` - Jeden Freitag 9:00
- `0 9 * * *` - Täglich 9:00

## Sicherheit (Überblick)

- **Auth**: Dashboard (`/`) und alle Admin-/API-Routen erfordern Login (NextAuth, Google @aweos.de).
- **Headers**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection (in `next.config.ts`).
- **Input**: Validierung und Längenlimits für Teamleiter-API (Name, E-Mail, Collections).
- **Öffentlich**: Nur `/login`, `/respond/:token`, `/api/auth/*`, `/api/respond/*`, `/api/health` sind ohne Login erreichbar.

## Lizenz

MIT
