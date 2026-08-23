"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/guards";
import { readRecordForm, recordSchema, type RecordField } from "@/lib/schema";
import {
  createRecord,
  deleteRecord,
  DuplicateRegistrationError,
  updateRecord,
} from "@/lib/sheets/records";
import { SheetsError } from "@/lib/sheets/client";

/**
 * Server Actions for the admin record forms.
 *
 * Every action calls requireAdmin() as its first statement. A Server Action is
 * reachable by anyone who can POST to the app — proxy.ts never sees it — so the
 * guard here is the only thing standing between a signed-in user and the whole
 * table.
 */

export type RecordFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<RecordField, string>>;
  /** Echoed back so a rejected form redisplays what was typed. */
  values?: Record<RecordField, string>;
};

function validationFailure(
  values: Record<RecordField, string>,
  issues: { path: PropertyKey[]; message: string }[],
): RecordFormState {
  const fieldErrors: Partial<Record<RecordField, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0] as RecordField | undefined;
    // First error per field only; showing three messages under one input is
    // noise, not help.
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return {
    ok: false,
    message: "Please correct the highlighted fields.",
    fieldErrors,
    values,
  };
}

function writeFailure(
  error: unknown,
  values: Record<RecordField, string>,
): RecordFormState {
  if (error instanceof DuplicateRegistrationError) {
    return {
      ok: false,
      message: "That registration number is already in use.",
      fieldErrors: {
        registrationNumber: `Registration number "${error.registrationNumber}" already belongs to another record`,
      },
      values,
    };
  }

  if (error instanceof SheetsError) {
    return { ok: false, message: error.userMessage, values };
  }

  console.error("[action] unexpected failure:", error);
  return {
    ok: false,
    message: "Something went wrong. Please try again.",
    values,
  };
}

export async function createRecordAction(
  _prev: RecordFormState,
  formData: FormData,
): Promise<RecordFormState> {
  const session = await requireAdmin();
  const values = readRecordForm(formData);

  const parsed = recordSchema.safeParse(values);
  if (!parsed.success) return validationFailure(values, parsed.error.issues);

  try {
    await createRecord(parsed.data, session.user.email);
  } catch (error) {
    return writeFailure(error, values);
  }

  // Outside the try/catch on purpose: redirect() signals by throwing, and
  // catching it would turn a successful save into "something went wrong".
  redirect("/admin/records?saved=created");
}

export async function updateRecordAction(
  id: string,
  _prev: RecordFormState,
  formData: FormData,
): Promise<RecordFormState> {
  const session = await requireAdmin();
  const values = readRecordForm(formData);

  const parsed = recordSchema.safeParse(values);
  if (!parsed.success) return validationFailure(values, parsed.error.issues);

  try {
    await updateRecord(id, parsed.data, session.user.email);
  } catch (error) {
    return writeFailure(error, values);
  }

  redirect("/admin/records?saved=updated");
}

export type DeleteState = { ok: boolean; message?: string };

export async function deleteRecordAction(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "No record was specified." };

  try {
    await deleteRecord(id);
  } catch (error) {
    if (error instanceof SheetsError)
      return { ok: false, message: error.userMessage };
    console.error("[action] delete failed:", error);
    return {
      ok: false,
      message: "Could not delete that record. Please try again.",
    };
  }

  redirect("/admin/records?saved=deleted");
}
