"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import {
  commitImportAction,
  previewImportAction,
  type CommitState,
  type PreviewState,
} from "@/lib/actions/import";
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from "@/lib/csv";
import { IMPORT_RULES, type DuplicateStrategy, type PlannedRow } from "@/lib/import";

const PREVIEW_EMPTY: PreviewState = { ok: false };
const COMMIT_EMPTY: CommitState = { ok: false };

const STATE_STYLES: Record<PlannedRow["state"], { label: string; className: string }> = {
  new: { label: "New", className: "bg-emerald-50 text-emerald-800 ring-emerald-600/20" },
  update: { label: "Duplicate — will update", className: "bg-blue-50 text-blue-800 ring-blue-600/20" },
  skip: { label: "Duplicate — will skip", className: "bg-amber-50 text-amber-900 ring-amber-600/20" },
  error: { label: "Error", className: "bg-red-50 text-red-800 ring-red-600/20" },
};

export function ImportWizard() {
  const [fileName, setFileName] = useState("");
  const [fileText, setFileText] = useState("");
  const [readError, setReadError] = useState("");
  const [strategy, setStrategy] = useState<DuplicateStrategy>("skip");

  const [preview, previewAction, previewPending] = useActionState(
    previewImportAction,
    PREVIEW_EMPTY,
  );
  const [commit, commitAction, commitPending] = useActionState(commitImportAction, COMMIT_EMPTY);

  const previewFormRef = useRef<HTMLFormElement>(null);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setReadError("");
    if (!file) {
      setFileName("");
      setFileText("");
      return;
    }

    // Checked here for an instant answer, and again on the server, which is
    // the check that actually counts.
    if (file.size > MAX_IMPORT_BYTES) {
      setFileName("");
      setFileText("");
      setReadError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB, over the ${MAX_IMPORT_BYTES / 1024 / 1024} MB limit. Please split it into smaller files.`,
      );
      return;
    }

    setFileName(file.name);
    setFileText(await file.text());
  }

  const plan = preview.plan;
  const hasPlan = Boolean(plan);
  const willWrite = (plan?.counts.create ?? 0) + (plan?.counts.update ?? 0);

  // Step 3 — finished
  if (commit.done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-base font-semibold text-emerald-900">Import complete</h2>
        <ul className="mt-3 space-y-1 text-sm text-emerald-900">
          <li>{commit.created} record{commit.created === 1 ? "" : "s"} created</li>
          <li>{commit.updated} updated</li>
          <li>{commit.skipped} skipped as already present</li>
          <li>{commit.errored} skipped because of errors</li>
        </ul>
        <div className="mt-5 flex gap-2">
          <Link
            href="/admin/records"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            View records
          </Link>
          <Link
            href="/admin/import"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Import another file
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1 — choose a file */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900">1. Choose a file</h2>

        <form ref={previewFormRef} action={previewAction} className="mt-4">
          <input type="hidden" name="fileName" value={fileName} />
          <input type="hidden" name="fileText" value={fileText} />
          <input type="hidden" name="strategy" value={strategy} />

          <label htmlFor="import-file" className="block text-sm font-medium text-slate-700">
            CSV or JSON file
          </label>
          <input
            id="import-file"
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={onFileChange}
            className="mt-1.5 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
          />

          <p className="mt-2 text-xs text-slate-500">
            Up to {MAX_IMPORT_BYTES / 1024 / 1024} MB and {MAX_IMPORT_ROWS.toLocaleString()} rows.{" "}
            <a href="/admin/import/template" className="font-medium text-slate-700 underline">
              Download a template
            </a>
          </p>

          {readError ? (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-800">
              {readError}
            </p>
          ) : null}

          {preview.message && !preview.ok ? (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-800">
              {preview.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!fileText || previewPending}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {previewPending ? "Checking…" : "Check file"}
          </button>
        </form>

        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Expected columns
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
            {IMPORT_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </details>
      </section>

      {/* Step 2 — preview */}
      {hasPlan && plan ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900">2. Check what will happen</h2>

          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
            <strong>{plan.counts.create}</strong> will be created ·{" "}
            <strong>{plan.counts.update}</strong> updated · <strong>{plan.counts.skip}</strong>{" "}
            skipped · <strong>{plan.counts.error}</strong> with errors
          </p>

          {preview.unknownColumns && preview.unknownColumns.length > 0 ? (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              These columns were not recognised and will be ignored:{" "}
              {preview.unknownColumns.join(", ")}
            </p>
          ) : null}

          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-slate-700">
              When a registration number already exists
            </legend>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-4">
              {(["skip", "update"] as const).map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="strategy-choice"
                    checked={strategy === option}
                    onChange={() => {
                      setStrategy(option);
                      // Re-check against the new strategy so the preview always
                      // reflects the choice on screen.
                      requestAnimationFrame(() => previewFormRef.current?.requestSubmit());
                    }}
                  />
                  {option === "skip" ? "Leave it unchanged" : "Update it from the file"}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-600 uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Line</th>
                  <th scope="col" className="px-3 py-2 font-medium">Registration</th>
                  <th scope="col" className="px-3 py-2 font-medium">Cooperative</th>
                  <th scope="col" className="px-3 py-2 font-medium">Outcome</th>
                  <th scope="col" className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plan.rows.map((row) => {
                  const style = STATE_STYLES[row.state];
                  return (
                    <tr key={row.line} className={row.state === "error" ? "bg-red-50/40" : undefined}>
                      <td className="px-3 py-2 text-xs text-slate-500">{row.line}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.registrationNumber || "—"}</td>
                      <td className="px-3 py-2">{row.cooperativeName || "—"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}
                        >
                          {style.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {row.problems.join("; ") || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Step 3 — commit */}
      {hasPlan && plan ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900">3. Import</h2>
          <p className="mt-2 text-sm text-slate-600">
            Nothing has been written yet. Rows with errors are never written — the rest of the
            file still imports.
          </p>

          {commit.message && !commit.ok ? (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-800">
              {commit.message}
            </p>
          ) : null}

          <form action={commitAction} className="mt-4">
            <input type="hidden" name="fileName" value={fileName} />
            <input type="hidden" name="fileText" value={fileText} />
            <input type="hidden" name="strategy" value={strategy} />
            <button
              type="submit"
              disabled={commitPending || willWrite === 0}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {commitPending
                ? "Importing…"
                : willWrite === 0
                  ? "Nothing to import"
                  : `Import ${willWrite} row${willWrite === 1 ? "" : "s"}`}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
