import { z } from "zod";

/**
 * Validated server environment.
 *
 * Importing this module runs the check, so a missing or malformed variable
 * fails at boot with a message naming it, rather than surfacing later as a
 * cryptic 500 from somewhere inside the Sheets client.
 *
 * Server-only. Nothing here may be imported from a client component or from
 * middleware — see the note in lib/auth.config.ts about the Edge runtime.
 */
const envSchema = z.object({
  // Auth.js reads these three by name on its own; we validate them so their
  // absence is caught here rather than as an opaque OAuth failure.
  AUTH_SECRET: z.string().min(1, "required — generate one with: openssl rand -base64 32"),
  AUTH_URL: z.url("must be a full URL, e.g. http://localhost:3000").optional(),
  AUTH_GOOGLE_ID: z.string().min(1, "required — OAuth client ID from Google Cloud Console"),
  AUTH_GOOGLE_SECRET: z.string().min(1, "required — OAuth client secret"),

  GOOGLE_SHEET_ID: z
    .string()
    .min(1, "required — the long id in the spreadsheet URL, between /d/ and /edit"),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.email(
    "must be the service account address, ending in .iam.gserviceaccount.com",
  ),

  /**
   * The private key arrives from .env with its newlines escaped as literal "\n"
   * (they cannot survive a dotenv file otherwise). We restore them here, once,
   * so every consumer downstream receives a real PEM and no other file has to
   * remember this. Getting this wrong is the classic cause of "invalid_grant".
   */
  GOOGLE_PRIVATE_KEY: z
    .string()
    .min(1, "required — the private_key value from the service account JSON")
    .transform((key) => key.replace(/\n/g, "\n"))
    .refine(
      (key) => key.includes("BEGIN PRIVATE KEY"),
      "does not look like a PEM key — it should contain a -----BEGIN PRIVATE KEY----- line",
    ),

  BOOTSTRAP_ADMIN_EMAILS: z
    .string()
    .min(1, "required — at least one admin email, comma-separated"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Environment configuration is invalid:\n\n${problems}\n\n` +
        `Fix these in .env.local for local development, or in the Vercel project ` +
        `settings for a deployment. See .env.example for the full list.`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();
