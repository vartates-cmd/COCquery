"use server";

import { requireAdmin } from "@/lib/guards";
import { parseImportFile } from "@/lib/csv";
import {
  buildImportPlan,
  type DuplicateStrategy,
  type ImportPlan,
} from "@/lib/import";
import {
  bulkCreateRecords,
  bulkUpdateRecords,
  listRecords,
} from "@/lib/sheets/records";
import { SheetsError } from "@/lib/sheets/client";

/**
 * Import is two round trips: preview, then commit.
 *
 * Both take the file text rather than a stashed server-side plan. Holding a
 * plan between requests would mean trusting a snapshot of the sheet that may be
 * minutes old by the time someone clicks Confirm; re-planning at commit time
 * against a fresh read is what keeps the write honest.
 */

export type PreviewState = {
  ok: boolean;
  message?: string;
  plan?: ImportPlan;
  unknownColumns?: string[];
  fileName?: string;
  strategy?: DuplicateStrategy;
};

function readStrategy(formData: FormData): DuplicateStrategy {
  return formData.get("strategy") === "update" ? "update" : "skip";
}

export async function previewImportAction(
  _prev: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  await requireAdmin();

  const fileName = String(formData.get("fileName") ?? "upload.csv");
  const text = String(formData.get("fileText") ?? "");
  const strategy = readStrategy(formData);

  if (!text.trim()) {
    return { ok: false, message: "Choose a .csv or .json file first." };
  }

  const parsed = parseImportFile(text, fileName);
  if (parsed.errors.length > 0) {
    return { ok: false, message: parsed.errors.join(" "), fileName, strategy };
  }

  try {
    const existing = await listRecords();
    const plan = buildImportPlan(parsed.rows, existing, strategy);
    return {
      ok: true,
      plan,
      unknownColumns: parsed.unknownColumns,
      fileName,
      strategy,
    };
  } catch (error) {
    if (error instanceof SheetsError)
      return { ok: false, message: error.userMessage, fileName };
    console.error("[import] preview failed:", error);
    return {
      ok: false,
      message: "Could not read the register. Please try again.",
      fileName,
    };
  }
}

export type CommitState = {
  ok: boolean;
  message?: string;
  created?: number;
  updated?: number;
  skipped?: number;
  errored?: number;
  done?: boolean;
};

export async function commitImportAction(
  _prev: CommitState,
  formData: FormData,
): Promise<CommitState> {
  const session = await requireAdmin();

  const fileName = String(formData.get("fileName") ?? "upload.csv");
  const text = String(formData.get("fileText") ?? "");
  const strategy = readStrategy(formData);

  if (!text.trim())
    return { ok: false, message: "The uploaded file is no longer available." };

  const parsed = parseImportFile(text, fileName);
  if (parsed.errors.length > 0)
    return { ok: false, message: parsed.errors.join(" ") };

  try {
    // Re-planned against the register as it is right now, not as it was when
    // the preview was drawn.
    const existing = await listRecords();
    const plan = buildImportPlan(parsed.rows, existing, strategy);

    const creates = plan.rows
      .filter((row) => row.state === "new" && row.input)
      .map((row) => row.input!);
    const updates = plan.rows
      .filter((row) => row.state === "update" && row.input && row.existingId)
      .map((row) => ({ id: row.existingId!, input: row.input! }));

    const created =
      creates.length > 0
        ? (await bulkCreateRecords(creates, session.user.email)).length
        : 0;
    const updated =
      updates.length > 0
        ? await bulkUpdateRecords(updates, session.user.email)
        : 0;

    return {
      ok: true,
      done: true,
      created,
      updated,
      skipped: plan.counts.skip,
      errored: plan.counts.error,
    };
  } catch (error) {
    if (error instanceof SheetsError)
      return { ok: false, message: error.userMessage };
    console.error("[import] commit failed:", error);
    return {
      ok: false,
      message: "The import could not be completed. Please try again.",
    };
  }
}
