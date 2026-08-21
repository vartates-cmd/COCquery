import { requireAdmin } from "@/lib/guards";
import { TEMPLATE_CSV } from "@/lib/csv";

/**
 * Downloadable starter file. Guarded like every other admin route — it reveals
 * the shape of the register, which is not secret, but there is no reason to
 * serve it to anyone who is not signed in as an administrator.
 */
export async function GET() {
  await requireAdmin();

  return new Response(TEMPLATE_CSV, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="coc-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
