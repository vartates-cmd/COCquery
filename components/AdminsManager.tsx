"use client";

import { useActionState, useState } from "react";
import {
  addAdminAction,
  removeAdminAction,
  type AddAdminState,
  type RemoveAdminState,
} from "@/lib/actions/admins";
import type { AdminRow } from "@/lib/sheets/admins";

const ADD_EMPTY: AddAdminState = { ok: false };
const REMOVE_EMPTY: RemoveAdminState = { ok: false };

function Notice({ ok, message }: { ok: boolean; message?: string }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className={`rounded-lg border px-3 py-2 text-sm ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {message}
    </p>
  );
}

export function AdminsManager({
  admins,
  bootstrapAdmins,
  currentEmail,
}: {
  admins: AdminRow[];
  /** From BOOTSTRAP_ADMIN_EMAILS — read-only here by design. */
  bootstrapAdmins: string[];
  currentEmail: string;
}) {
  const [addState, addAction, addPending] = useActionState(
    addAdminAction,
    ADD_EMPTY,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeAdminAction,
    REMOVE_EMPTY,
  );
  const [pendingRemoval, setPendingRemoval] = useState<AdminRow | null>(null);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900">
          Add an administrator
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          They get full access to every record, the import tool, and this page.
          Give it only to people who would be trusted with the spreadsheet
          itself.
        </p>

        <form
          action={addAction}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <div className="flex-1">
            <label htmlFor="admin-email" className="sr-only">
              Email address
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              required
              placeholder="name@cda.gov.ph"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>
          <div className="sm:w-48">
            <label htmlFor="admin-name" className="sr-only">
              Name (optional)
            </label>
            <input
              id="admin-name"
              name="name"
              placeholder="Name (optional)"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={addPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {addPending ? "Adding…" : "Add"}
          </button>
        </form>

        <div className="mt-3">
          <Notice ok={addState.ok} message={addState.message} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">
          Administrators ({admins.length})
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Added from this page or by editing the <em>Admins</em> tab directly.
        </p>

        <div className="mt-3">
          <Notice ok={removeState.ok} message={removeState.message} />
        </div>

        {admins.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
            No administrators have been added here yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {admins.map((admin) => {
              const isSelf = admin.email === currentEmail;
              return (
                <li
                  key={admin.email}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {admin.email}
                      {isSelf ? (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
                          you
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {admin.name || "No name recorded"}
                      {admin.addedOn ? ` · added ${admin.addedOn}` : ""}
                      {admin.addedBy ? ` by ${admin.addedBy}` : ""}
                    </p>
                  </div>

                  {isSelf ? (
                    <span className="text-xs text-slate-500">
                      Cannot remove yourself
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPendingRemoval(admin)}
                      className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">
          From server configuration ({bootstrapAdmins.length})
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          These come from the{" "}
          <code className="rounded bg-slate-100 px-1">
            BOOTSTRAP_ADMIN_EMAILS
          </code>{" "}
          setting and cannot be changed here. They stay administrators even when
          the spreadsheet is unreachable, which is what makes them the way back
          in if something breaks. To change them, edit the environment variable
          in the deployment settings and redeploy.
        </p>

        {bootstrapAdmins.length === 0 ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            None configured. If the spreadsheet ever becomes unreachable, nobody
            will be able to sign in as an administrator.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {bootstrapAdmins.map((email) => (
              <li
                key={email}
                className="flex items-center justify-between gap-3 p-4"
              >
                <span className="truncate text-sm text-slate-800">
                  {email}
                  {email === currentEmail ? (
                    <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
                      you
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-slate-500">Read-only</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pendingRemoval ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-admin-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2
              id="remove-admin-title"
              className="text-base font-semibold text-slate-900"
            >
              Remove this administrator?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              <strong className="font-medium text-slate-900">
                {pendingRemoval.email}
              </strong>{" "}
              will lose access to the administration area immediately.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              If their email is also on a record, they will still be able to
              sign in and see that record as an ordinary user.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingRemoval(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <form
                action={(formData) => {
                  removeAction(formData);
                  setPendingRemoval(null);
                }}
              >
                <input
                  type="hidden"
                  name="email"
                  value={pendingRemoval.email}
                />
                <button
                  type="submit"
                  disabled={removePending}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {removePending ? "Removing…" : "Remove"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
