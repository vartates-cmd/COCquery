"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const MESSAGES: Record<string, string> = {
  created: "Record created.",
  updated: "Record updated.",
  deleted: "Record deleted.",
};

/**
 * Success notice after a redirect from a Server Action.
 *
 * The message travels in the URL, so it survives the redirect without any
 * client state. It is cleared from the address bar once shown — otherwise a
 * refresh or a shared link would claim something was just saved when it wasn't.
 */
export function SavedBanner({ saved }: { saved?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [message, setMessage] = useState(() => (saved ? MESSAGES[saved] : undefined));

  useEffect(() => {
    if (!saved || !MESSAGES[saved]) return;
    router.replace(pathname);
  }, [saved, pathname, router]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(undefined), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <p
      role="status"
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
    >
      {message}
    </p>
  );
}
