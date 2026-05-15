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
    async signIn({ account }) {
      return !!account?.id_token;
    },
    async jwt({ token, account }) {
      if (account?.id_token) {
        token.googleAccessToken = account.access_token;

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
      return session;
    },
  },
});
