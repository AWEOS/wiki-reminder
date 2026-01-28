import { auth } from "@/auth";

export default auth((req) => {
  return;
});

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin/:path*",
    "/api/settings/:path*",
    "/api/google-workspace/:path*",
    "/api/debug/:path*",
    "/api/audit/:path*",
    "/api/export/:path*",
    "/api/email-preview",
    "/api/teamleaders",
    "/api/teamleaders/:path*",
    "/api/reminders",
    "/api/cron/:path*",
    "/api/status",
  ],
};
