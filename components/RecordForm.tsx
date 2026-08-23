"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { COC_STATUSES, STATUS_REQUIRING_REASON } from "@/lib/constants";
import type { RecordFormState } from "@/lib/actions/records";
import type { RecordField } from "@/lib/schema";
import type { CocRecord } from "@/lib/sheets/records";

/**
 * Shared create/edit form.
 *
 * `Date Updated` and `Updated By` are deliberately absent — they are stamped by
 * the data layer, and offering them as inputs would invite an audit trail that
 * lies.
 */

const EMPTY: RecordFormState = { ok: true };

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-700">
      {message}
    </p>
  );
}

const labelClass = "block text-sm font-medium text-slate-800";
const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none";
const errorInputClass =
  "border-red-400 focus:border-red-600 focus:ring-red-600";

export function RecordForm({
  action,
  record,
  submitLabel,
}: {
  action: (
    prev: RecordFormState,
    formData: FormData,
  ) => Promise<RecordFormState>;
  record?: CocRecord;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, EMPTY);

  // Prefer what the server echoed back after a rejection, so a failed submit
  // does not silently discard what the admin typed.
  const initial = (field: RecordField, fallback: string) =>
    state.values?.[field] ?? fallback;

  const [status, setStatus] = useState<string>(
    initial("cocStatus", record?.cocStatus ?? "Submitted"),
  );
  const needsReason = status === STATUS_REQUIRING_REASON;
  const errors = state.fieldErrors ?? {};

  /**
   * Repair the select after a rejected submit.
   *
   * React 19 resets a form once its action returns. Text inputs recover because
   * they re-read `defaultValue`, but a controlled <select> does not: the native
   * reset snaps it back to the first option, while React still sees the same
   * `value` prop as last render and so never re-applies it.
   *
   * Left alone, the dropdown would read "Submitted" while a Reason for
   * Deferment field sat underneath it demanding an answer — and saving again
   * would quietly store Submitted instead of Deferred. Re-asserting the value
   * here keeps what the admin chose.
   */
  const statusRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (statusRef.current && statusRef.current.value !== status) {
      statusRef.current.value = status;
    }
  });

  return (
    <form action={formAction} className="space-y-5">
      {state.message && !state.ok ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <label htmlFor="registrationNumber" className={labelClass}>
          Registration number
        </label>
        <input
          id="registrationNumber"
          name="registrationNumber"
          defaultValue={initial(
            "registrationNumber",
            record?.registrationNumber ?? "",
          )}
          aria-invalid={Boolean(errors.registrationNumber)}
          aria-describedby={
            errors.registrationNumber ? "registrationNumber-error" : undefined
          }
          className={`${inputClass} ${errors.registrationNumber ? errorInputClass : ""}`}
        />
        <FieldError
          id="registrationNumber-error"
          message={errors.registrationNumber}
        />
      </div>

      <div>
        <label htmlFor="cooperativeName" className={labelClass}>
          Cooperative name
        </label>
        <input
          id="cooperativeName"
          name="cooperativeName"
          defaultValue={initial(
            "cooperativeName",
            record?.cooperativeName ?? "",
          )}
          aria-invalid={Boolean(errors.cooperativeName)}
          aria-describedby={
            errors.cooperativeName ? "cooperativeName-error" : undefined
          }
          className={`${inputClass} ${errors.cooperativeName ? errorInputClass : ""}`}
        />
        <FieldError
          id="cooperativeName-error"
          message={errors.cooperativeName}
        />
      </div>

      <div>
        <label htmlFor="accountEmail" className={labelClass}>
          Account email
        </label>
        <input
          id="accountEmail"
          name="accountEmail"
          type="email"
          defaultValue={initial("accountEmail", record?.accountEmail ?? "")}
          aria-invalid={Boolean(errors.accountEmail)}
          aria-describedby="accountEmail-help"
          className={`${inputClass} ${errors.accountEmail ? errorInputClass : ""}`}
        />
        <p id="accountEmail-help" className="mt-1 text-xs text-slate-500">
          The Google account allowed to view this record. Leave blank to keep it
          visible to administrators only.
        </p>
        <FieldError id="accountEmail-error" message={errors.accountEmail} />
      </div>

      <div>
        <label htmlFor="cocStatus" className={labelClass}>
          COC status
        </label>
        <select
          id="cocStatus"
          name="cocStatus"
          ref={statusRef}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-invalid={Boolean(errors.cocStatus)}
          className={`${inputClass} ${errors.cocStatus ? errorInputClass : ""}`}
        >
          {COC_STATUSES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <FieldError id="cocStatus-error" message={errors.cocStatus} />
      </div>

      {needsReason ? (
        <div>
          <label htmlFor="reasonForDeferment" className={labelClass}>
            Reason for deferment <span className="text-red-600">*</span>
          </label>
          <textarea
            id="reasonForDeferment"
            name="reasonForDeferment"
            rows={3}
            defaultValue={initial(
              "reasonForDeferment",
              record?.reasonForDeferment ?? "",
            )}
            aria-invalid={Boolean(errors.reasonForDeferment)}
            aria-describedby={
              errors.reasonForDeferment
                ? "reasonForDeferment-error"
                : "reasonForDeferment-help"
            }
            className={`${inputClass} ${errors.reasonForDeferment ? errorInputClass : ""}`}
          />
          <p
            id="reasonForDeferment-help"
            className="mt-1 text-xs text-slate-500"
          >
            Shown to the cooperative on their dashboard, so write it for them to
            read.
          </p>
          <FieldError
            id="reasonForDeferment-error"
            message={errors.reasonForDeferment}
          />
        </div>
      ) : (
        // Kept in the payload while hidden so switching away from Deferred and
        // back does not silently wipe a reason that was already recorded.
        <input
          type="hidden"
          name="reasonForDeferment"
          value={initial(
            "reasonForDeferment",
            record?.reasonForDeferment ?? "",
          )}
        />
      )}

      <div>
        <label htmlFor="reportSubmissionStatus" className={labelClass}>
          Report submission status
        </label>
        <input
          id="reportSubmissionStatus"
          name="reportSubmissionStatus"
          defaultValue={initial(
            "reportSubmissionStatus",
            record?.reportSubmissionStatus ?? "",
          )}
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-3 border-t border-slate-200 pt-5">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        <Link
          href="/admin/records"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
