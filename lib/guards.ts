import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import type { Role } from "@/lib/roles";

/**
 * A session that has passed a guard: email and role are guaranteed present.
 */
export type AuthedSession = Session & {
  user: NonNullable<Session["user"]> & { email: string; role: Role };
};

/** Unguarded read. Use for optional UI (e.g. showing a name in a header), never for access control. */
export async function getSession(): Promise<Session | null> {
  return auth();
}

/**
 * Gate for anything behind sign-in. Call at the top of every protected layout,
 * page, server action and route handler.
 *
 * This — not middleware — is what actually enforces access. Middleware is a
 * redirect for tidiness; server actions and route handlers can be reached
 * without ever passing through it.
 */
export async function requireUser(): Promise<AuthedSession> {
  const session = await auth();

  if (!session?.user?.email) redirect("/");
  if (session.user.role === "denied") redirect("/access-denied");

  return session as AuthedSession;
}

/**
 * Gate for the admin area. A signed-in non-admin goes to their own dashboard
 * rather than back to the landing page, which would look like a broken login.
 */
export async function requireAdmin(): Promise<AuthedSession> {
  const session = await requireUser();

  if (session.user.role !== "admin") redirect("/dashboard");

  return session;
}
