import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: "extia-inge.fr",
          access_type: "offline",
          prompt: "consent",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/script.projects",
            "https://www.googleapis.com/auth/script.processes",
            "https://www.googleapis.com/auth/drive",
          ].join(" "),
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/access-denied",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (!account?.id_token) return false;
      const email = profile?.email ?? "";
      return email.endsWith("@extia-inge.fr");
    },
    async jwt({ token, account }) {
      if (account?.id_token) {
        token.googleAccessToken = account.access_token;
        token.googleRefreshToken = account.refresh_token;
        token.googleTokenExpiresAt = account.expires_at;

        const res = await fetch(
          `${process.env.INTERNAL_API_URL}/auth/google`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: account.id_token }),
          }
        );

        if (!res.ok) {
          token.error = "AccessDenied";
          return token;
        }

        const data = await res.json();
        token.backendToken = data.access_token;
        token.user = data.user;
        return token;
      }

      // Token Google encore valide (marge de 5 minutes)
      const expiresAt = token.googleTokenExpiresAt ?? 0;
      if (Date.now() / 1000 < expiresAt - 300) {
        return token;
      }

      // Refresh silencieux
      if (!token.googleRefreshToken) {
        token.error = "RefreshAccessTokenError";
        return token;
      }

      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.googleRefreshToken as string,
          }),
        });

        const refreshed = await response.json() as {
          access_token?: string;
          expires_in?: number;
          refresh_token?: string;
          error?: string;
        };

        if (!response.ok) throw new Error(refreshed.error ?? "refresh_failed");

        token.googleAccessToken = refreshed.access_token;
        token.googleTokenExpiresAt =
          Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600);
        if (refreshed.refresh_token) {
          token.googleRefreshToken = refreshed.refresh_token;
        }
        delete token.error;
      } catch {
        token.error = "RefreshAccessTokenError";
      }

      return token;
    },
    async session({ session, token }) {
      if (token.error === "AccessDenied") {
        throw new Error("AccessDenied");
      }
      session.backendToken = token.backendToken as string;
      session.googleAccessToken = token.googleAccessToken as string;
      session.user = token.user as unknown as typeof session.user;
      if (token.error) {
        session.error = token.error;
      }
      return session;
    },
  },
});
