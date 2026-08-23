import NextAuth from "next-auth";
import { headers } from "next/headers";
import { authConfig } from "@/lib/auth.config";
import { normalizeEmail, resolveRole, type RoleResolution } from "@/lib/roles";
import { logLoginAttempt } from "@/lib/sheets/attempts";

/**
 * How long a role stays trusted before it is re-checked against the sheet.
 * Removing an admin therefore takes effect within ten minutes rather than
 * waiting for the session to expire.
 */
const ROLE_RECHECK_MS = 10 * 60 * 1000;

type RequestContext = { ip: string; userAgent: string };

/**
 * Best-effort client details for the audit log. Never throws: a missing header
 * must not be able to break someone's sign-in.
 */
async function readRequestContext(): Promise<RequestContext> {
  try {
    const headerList = await headers();
    // On Vercel x-forwarded-for is a comma-separated chain; the client is first.
    const forwarded = headerList.get("x-forwarded-for") ?? "";
    const ip =
      forwarded.split(",")[0]?.trim() ||
      headerList.get("x-real-ip")?.trim() ||
      "unknown";
    const userAgent = (headerList.get("user-agent") ?? "unknown").slice(0, 250);
    return { ip, userAgent };
  } catch {
    return { ip: "unknown", userAgent: "unknown" };
  }
}

/**
 * Writes one row to the LoginAttempts tab. Swallows its own errors on purpose —
 * if the audit log is unwritable we still want the sign-in decision to stand,
 * and the failure is visible in the server logs.
 */
async function recordAttempt(attempt: {
  email: string;
  name: string;
  result: "DENIED" | "ALLOWED_USER" | "ALLOWED_ADMIN";
  reason: string;
  ip: string;
  userAgent: string;
}): Promise<void> {
  try {
    await logLoginAttempt({ timestamp: new Date().toISOString(), ...attempt });
  } catch (error) {
    console.error("[auth] could not append to LoginAttempts:", error);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    /**
     * The gate. Runs once per sign-in attempt, before any session exists.
     *
     * Returning a string makes Auth.js redirect there, which is how a denied
     * account reaches /access-denied. Throwing would surface a generic error
     * page instead and lose the explanation, so we never throw here.
     */
    async signIn({ user, profile }) {
      const email = normalizeEmail(user.email ?? profile?.email);
      const name = user.name ?? profile?.name ?? "";
      const { ip, userAgent } = await readRequestContext();

      let resolution: RoleResolution;
      try {
        resolution = await resolveRole(email);
      } catch (error) {
        // The spreadsheet is unreachable, unshared, or over quota. Fail closed,
        // but send the person somewhere that says "something broke" rather than
        // "you are not registered" — those are very different messages and the
        // wrong one sends them to the office to fix an account that is fine.
        console.error("[auth] role resolution failed:", error);
        await recordAttempt({
          email,
          name,
          result: "DENIED",
          reason: "LOOKUP_FAILED",
          ip,
          userAgent,
        });
        return "/auth-error?reason=lookup_failed";
      }

      const result =
        resolution.role === "admin"
          ? "ALLOWED_ADMIN"
          : resolution.role === "user"
            ? "ALLOWED_USER"
            : "DENIED";

      await recordAttempt({
        email,
        name,
        result,
        reason: resolution.reason,
        ip,
        userAgent,
      });

      if (resolution.role === "denied") return "/access-denied";
      return true;
    },

    /**
     * Attaches the role to the JWT on first sign-in, then re-resolves it
     * whenever the stamp is older than ROLE_RECHECK_MS.
     */
    async jwt({ token, user }) {
      const isFirstSignIn = Boolean(user);
      if (user?.email) token.email = normalizeEmail(user.email);

      const email = normalizeEmail(token.email);
      if (!email) {
        token.role = "denied";
        return token;
      }

      const checkedAt =
        typeof token.roleCheckedAt === "number" ? token.roleCheckedAt : 0;
      const isStale = Date.now() - checkedAt > ROLE_RECHECK_MS;

      if (isFirstSignIn || isStale) {
        try {
          const { role } = await resolveRole(email);
          token.role = role;
          token.roleCheckedAt = Date.now();
        } catch (error) {
          // A transient Sheets failure should not eject someone mid-session.
          // Keep whatever role they already had and try again on the next call.
          console.error(
            "[auth] role re-check failed, keeping previous role:",
            error,
          );
          if (!token.role) token.role = "denied";
        }
      }

      return token;
    },
  },
});
