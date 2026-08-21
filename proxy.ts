import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Built from the edge-safe config only — see the comment in lib/auth.config.ts.
const { auth } = NextAuth(authConfig);

/**
 * Coarse route protection. Next 16 renamed this file convention from
 * `middleware.ts` to `proxy.ts`; the behaviour is unchanged.
 *
 * This is a user-experience layer: it keeps signed-out
 * visitors and wrong-role users from watching a protected page flash before it
 * redirects. The real enforcement is requireUser/requireAdmin in lib/guards.ts.
 */
export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  if (!session?.user) {
    const signInUrl = new URL("/", nextUrl.origin);
    // Remembered so a future version can bounce them back where they were headed.
    signInUrl.searchParams.set("from", nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  const role = session.user.role;

  if (role === "denied") {
    return NextResponse.redirect(new URL("/access-denied", nextUrl.origin));
  }

  if (nextUrl.pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  return NextResponse.next();
});

/**
 * Only the two protected trees. Everything else — the landing page, the auth
 * API, static assets — is left alone, which avoids the usual matcher gymnastics.
 */
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
