import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      /** Resolved on every sign-in and re-checked periodically. See lib/roles.ts. */
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    /** Epoch ms of the last role resolution, used to expire the cached role. */
    roleCheckedAt?: number;
  }
}

export {};
