"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Routes that exist today. Later phases append to this list. */
const LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/records", label: "Records", exact: false },
  { href: "/admin/import", label: "Import", exact: false },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Administration" className="-mb-px flex gap-1 overflow-x-auto">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
              active
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
