"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/guards";
import { bootstrapAdminEmails, normalizeEmail } from "@/lib/roles";
import {
  addAdmin,
  DuplicateAdminError,
  listAdmins,
  removeAdmin,
} from "@/lib/sheets/admins";
import { SheetsError } from "@/lib/sheets/client";

/**
 * Adding and removing administrators.
 *
 * Both actions call requireAdmin() first. Everything else here is about not
 * letting the office lock itself out of its own system.
 */

export type AddAdminState = {
  ok: boolean;
  message?: string;
  /** Which email the message refers to, so the sign-in log can show it in place. */
  email?: string;
};

export async function addAdminAction(
  _prev: AddAdminState,
  formData: FormData,
): Promise<AddAdminState> {
  const session = await requireAdmin();

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const name = String(formData.get("name") ?? "").trim();

  if (!z.email().safeParse(email).success) {
    return {
      ok: false,
      message: "That does not look like an email address.",
      email,
    };
  }

  // A bootstrap admin already has full access; adding a row for them would be
  // a no-op that looks like it did something.
  if (bootstrapAdminEmails().includes(email)) {
    return {
      ok: false,
      message: `${email} is already an administrator through the server configuration.`,
      email,
    };
  }

  try {
    await addAdmin(email, name, session.user.email);
  } catch (error) {
    if (error instanceof DuplicateAdminError) {
      return {
        ok: false,
        message: `${email} is already an administrator.`,
        email,
      };
    }
    if (error instanceof SheetsError) {
      return { ok: false, message: error.userMessage, email };
    }
    console.error("[action] addAdmin failed:", error);
    return {
      ok: false,
      message: "Could not add that administrator. Please try again.",
      email,
    };
  }

  return {
    ok: true,
    email,
    message: `${email} is now an administrator. They can sign in immediately.`,
  };
}

export type RemoveAdminState = {
  ok: boolean;
  message?: string;
  email?: string;
};

export async function removeAdminAction(
  _prev: RemoveAdminState,
  formData: FormData,
): Promise<RemoveAdminState> {
  const session = await requireAdmin();

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { ok: false, message: "No administrator was specified." };

  // Rule 1: no self-removal. Losing your own access with one misplaced click,
  // and needing someone else to restore it, is a bad afternoon.
  if (email === normalizeEmail(session.user.email)) {
    return {
      ok: false,
      email,
      message:
        "You cannot remove your own administrator access. Ask another administrator to do it.",
    };
  }

  let currentAdmins;
  try {
    currentAdmins = await listAdmins();
  } catch (error) {
    if (error instanceof SheetsError)
      return { ok: false, email, message: error.userMessage };
    throw error;
  }

  const bootstrap = bootstrapAdminEmails();

  // Rows in the Admins tab are the only thing this action can change. An email
  // that is an admin purely through the env var has no row to delete.
  const hasRow = currentAdmins.some((admin) => admin.email === email);
  if (!hasRow) {
    if (bootstrap.includes(email)) {
      return {
        ok: false,
        email,
        message:
          "This administrator comes from the server configuration and cannot be removed here. Change BOOTSTRAP_ADMIN_EMAILS in the deployment settings instead.",
      };
    }
    return {
      ok: false,
      email,
      message: "That administrator is no longer listed.",
    };
  }

  /**
   * Rule 2: never leave the system with no way in.
   *
   * Counted across both sources rather than just the tab. The point of the rule
   * is preventing lockout, and while a bootstrap admin exists lockout is not
   * possible — so blocking the removal then would be a rule protecting nothing.
   */
  const remaining = new Set([
    ...currentAdmins.map((admin) => admin.email),
    ...bootstrap,
  ]);
  remaining.delete(email);
  if (remaining.size === 0) {
    return {
      ok: false,
      email,
      message:
        "This is the last administrator. Add another one before removing this one, or nobody will be able to administer the system.",
    };
  }

  try {
    await removeAdmin(email);
  } catch (error) {
    if (error instanceof SheetsError)
      return { ok: false, email, message: error.userMessage };
    console.error("[action] removeAdmin failed:", error);
    return {
      ok: false,
      email,
      message: "Could not remove that administrator. Please try again.",
    };
  }

  return {
    ok: true,
    email,
    message: `${email} is no longer an administrator.`,
  };
}
