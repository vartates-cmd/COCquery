import { COC_STATUS_BADGE, UNKNOWN_STATUS_BADGE, isCocStatus } from "@/lib/constants";

/**
 * A COC status pill.
 *
 * The status word is always rendered as text, never conveyed by colour alone —
 * a colour-blind reader must be able to read "Deferred", and the badge has to
 * survive being printed in black and white.
 *
 * A blank or unrecognised value gets neutral styling rather than being hidden,
 * because the spreadsheet is hand-edited and a typo should be visible, not
 * silently swallowed.
 */
export function StatusBadge({ status }: { status: string }) {
  const trimmed = status.trim();

  if (!trimmed) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${UNKNOWN_STATUS_BADGE}`}
      >
        Not set
      </span>
    );
  }

  const classes = isCocStatus(trimmed) ? COC_STATUS_BADGE[trimmed] : UNKNOWN_STATUS_BADGE;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}
    >
      {trimmed}
    </span>
  );
}
