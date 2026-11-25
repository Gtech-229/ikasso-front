import { cn } from "@/lib/utils";

/**
 * The general loading state (user's example, in Ikasso's colors): two rings
 * spinning at different speeds, the title, an optional subtitle and the
 * construction stripe. `screen` covers the viewport; `inline` sits in its
 * container (a card). No client code: usable as a server Suspense fallback.
 */
export function LoadingScreen({
  variant = "screen",
  message,
}: {
  variant?: "screen" | "inline";
  message?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        variant === "screen"
          ? "fixed inset-0 z-50 bg-linear-to-br from-brand/10 to-canvas p-5"
          : "py-10",
      )}
    >
      <div role="status" className="flex flex-col items-center text-center">
        <div aria-hidden="true" className="relative mb-4 size-16">
          <div className="size-16 animate-spin rounded-full border-4 border-ink/10 border-t-brand motion-reduce:animate-none" />
          <div className="absolute top-2 left-2 size-12 animate-spin rounded-full border-2 border-transparent border-t-ink [animation-duration:0.8s] motion-reduce:animate-none" />
        </div>
        <p className="font-display text-xl font-bold text-ink">Chargement…</p>
        {message && <p className="mt-1 text-[15px] text-muted-ink">{message}</p>}
        <div aria-hidden="true" className="stripe mt-4 h-1.5 w-24 rounded-full" />
      </div>
    </div>
  );
}
