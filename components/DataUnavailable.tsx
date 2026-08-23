import type { SheetsErrorKind } from "@/lib/sheets/client";

/**
 * Shown when the records could be reached but the answer was a failure we
 * recognise. The message comes from the data layer and is already written for
 * a reader — this only decides how urgently to present it.
 *
 * A busy system is a wait-and-retry; anything else is worth telling the office
 * about, so the two get different wording and different colour.
 */
export function DataUnavailable({
  message,
  kind,
  title,
}: {
  message: string;
  kind: SheetsErrorKind;
  title?: string;
}) {
  const isTransient = kind === "rate_limited";

  return (
    <div
      role="alert"
      className={`rounded-2xl border p-6 ${
        isTransient
          ? "border-amber-200 bg-amber-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <h2
        className={`text-base font-semibold ${isTransient ? "text-amber-900" : "text-red-900"}`}
      >
        {title ??
          (isTransient ? "The system is busy" : "Records are unavailable")}
      </h2>
      <p
        className={`mt-2 text-sm leading-relaxed ${
          isTransient ? "text-amber-900" : "text-red-900"
        }`}
      >
        {message}
      </p>
      <p
        className={`mt-2 text-sm leading-relaxed ${
          isTransient ? "text-amber-800" : "text-red-800"
        }`}
      >
        {isTransient
          ? "Refreshing the page in a few seconds will usually work."
          : "Nothing has been lost. Refreshing may help; if it does not, the office needs to look at the connection to the spreadsheet."}
      </p>
    </div>
  );
}
