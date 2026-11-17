"use client";

/**
 * A link that changes the stores list URL in the browser only
 * (`history.pushState`, which Next syncs with `useSearchParams`): the client
 * queries load the new data, with no server render per filter change. A plain
 * `<a href>` keeps open-in-new-tab and the full-load path (server prefetch).
 */
export function ShallowLink({
  href,
  onClick,
  ...props
}: React.ComponentProps<"a"> & { href: string }) {
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
        if (event.defaultPrevented || event.button !== 0 || modified) return;
        event.preventDefault();
        window.history.pushState(null, "", href);
      }}
    />
  );
}

/** Same as a ShallowLink click, without a new history entry (search typing). */
export function replaceStoresUrl(href: string): void {
  window.history.replaceState(null, "", href);
}
