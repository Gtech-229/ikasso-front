import { cn } from "@/lib/utils";

/** "Ikasso" in the display font until the logo artwork exists. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="flex size-10 items-center justify-center rounded-control bg-brand font-display text-lg font-bold text-ink">
        I
      </span>
      <span className="font-display text-xl font-bold">Ikasso</span>
    </div>
  );
}
