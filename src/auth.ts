import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ALLOWED_DOMAIN = "aweos.de";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          hd: ALLOWED_DOMAIN, // Optional: Google zeigt bevorzugt aweos.de-Accounts
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      // Öffentliche Routen (ohne Login)
      if (path === "/login") return true;
      if (path === "/api/health") return true;
      if (path.startsWith("/respond/")) return true;
      if (path.startsWith("/api/auth")) return true;
      if (path.startsWith("/api/respond")) return true;

      // Geschützte Routen (Login erforderlich)
      const isDashboard = path === "/";
      const isAdmin = path.startsWith("/admin");
      const isProtectedApi =
        path.startsWith("/api/settings") ||
        path.startsWith("/api/google-workspace") ||
        path.startsWith("/api/debug") ||
        path.startsWith("/api/audit") ||
        path.startsWith("/api/export") ||
        path.startsWith("/api/email-preview") ||
        path.startsWith("/api/teamleaders") ||
        path.startsWith("/api/reminders") ||
        path.startsWith("/api/cron") ||
        path.startsWith("/api/status");

      if (isDashboard || isAdmin || isProtectedApi) {
        return isLoggedIn;
      }
      return true;
    },
    signIn({ user }) {
      // Nur @aweos.de Benutzer erlauben
      const email = user?.email?.toLowerCase() ?? "";
      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return false;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
});
