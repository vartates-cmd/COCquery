import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import type { Role } from "@/lib/roles";

/**
 * Edge-safe half of the Auth.js configuration.
 *
 * `middleware.ts` runs on the Edge runtime, where the Google Sheets libraries
 * (google-spreadsheet / google-auth-library) cannot run — they need Node APIs.
 * So the config is split: everything here is pure token/cookie handling with no
 * data access, and the callbacks that actually talk to the spreadsheet live in
 * `lib/auth.ts`, which only ever runs in Node.
 *
 * The `Role` import above is `import type` on purpose. A value import would
 * drag lib/roles.ts — and through it the Sheets client — into the Edge bundle
 * and break the build.
 *
 * Credentials come from AUTH_SECRET / AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET,
 * which Auth.js v5 reads from the environment by name without being told.
 */
export const authConfig = {
  providers: [
    Google({
      // Always show the Google account chooser. Office machines are often
      // shared, and a denied user needs to be able to reach a second account
      // without clearing cookies.
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  pages: {
    signIn: "/",
    error: "/auth-error",
  },
  session: { strategy: "jwt" },
  // Vercel terminates TLS upstream; without this Auth.js rejects the forwarded host.
  trustHost: true,
  callbacks: {
    /**
     * Copies the role off the token onto the session. Pure token reading, so it
     * is safe on Edge and gives middleware access to `req.auth.user.role`.
     */
    session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as Role | undefined) ?? "denied";
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
