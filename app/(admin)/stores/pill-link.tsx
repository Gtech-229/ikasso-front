"use client";

import { cn } from "@/lib/utils";
import { ShallowLink } from "./shallow-link";

/** A count from the API: "—" until it answers, never a guessed number. */
export function shownCount(count: number | null | undefined): string {
  return count == null ? "—" : String(count);
}

/**
 * The pill links of the list filters, tabs and period switch: a shallow link
 * (no server render per change) marked `aria-current="page"` when active.
 * `count`: omitted for no count, `null` while it loads.
 */
export function PillLink({
  href,
  active,
  label,
  count,
  title,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number | null;
  title?: string;
}) {
  return (
    <ShallowLink
      href={href}
      aria-current={active ? "page" : undefined}
      title={title}
      className={cn(
        "flex min-h-11 items-center rounded-full px-4 text-[15px] font-semibold whitespace-nowrap transition-colors",
        active ? "bg-ink text-surface" : "bg-surface text-ink hover:bg-ink/5",
      )}
    >
      {count === undefined ? label : `${label} · ${shownCount(count)}`}
    </ShallowLink>
  );
}
