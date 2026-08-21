import { z } from "zod";
import { COC_STATUSES, STATUS_REQUIRING_REASON } from "@/lib/constants";

/**
 * The one definition of what a valid record is.
 *
 * Both the form and the server action validate against this. The server always
 * re-validates regardless of what the browser did — a Server Action is a public
 * endpoint, and anything the client checked can be bypassed by not using the
 * client.
 */

const emailOrBlank = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "Enter a valid email address, or leave blank for an admin-only record",
  });

export const recordSchema = z
  .object({
    registrationNumber: z.string().trim().min(1, "Registration number is required"),
    cooperativeName: z.string().trim().min(1, "Cooperative name is required"),
    accountEmail: emailOrBlank,
    cocStatus: z.enum(COC_STATUSES, {
      message: "Choose one of the listed statuses",
    }),
    reasonForDeferment: z.string().trim(),
    reportSubmissionStatus: z.string().trim(),
  })
  /**
   * The conditional rule lives in the schema, not just the UI. Hiding the
   * textarea when the status is not Deferred is a convenience; this is the part
   * that actually holds.
   */
  .refine(
    (data) => data.cocStatus !== STATUS_REQUIRING_REASON || data.reasonForDeferment.length > 0,
    {
      message: "A reason is required when the status is Deferred",
      path: ["reasonForDeferment"],
    },
  );

export type RecordFormValues = z.infer<typeof recordSchema>;

/** Field names, so the form inputs and the error map cannot drift apart. */
export const RECORD_FIELDS = [
  "registrationNumber",
  "cooperativeName",
  "accountEmail",
  "cocStatus",
  "reasonForDeferment",
  "reportSubmissionStatus",
] as const;

export type RecordField = (typeof RECORD_FIELDS)[number];

/** Pull the record fields out of a submitted form, as plain strings. */
export function readRecordForm(formData: FormData): Record<RecordField, string> {
  const values = {} as Record<RecordField, string>;
  for (const field of RECORD_FIELDS) {
    values[field] = String(formData.get(field) ?? "");
  }
  return values;
}
