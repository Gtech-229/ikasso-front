import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PillTone = "pending" | "success" | "danger" | "dark" | "muted";

const TONES: Record<PillTone, string> = {
  pending: "bg-brand-soft text-ink",
  success: "bg-success/12 text-success",
  danger: "bg-danger/12 text-danger",
  dark: "bg-ink text-surface",
  muted: "border-border bg-canvas text-muted-ink",
};

/** Status pill from the design system (yellow pending, green ok, red issue, black ended). */
export function StatusPill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className={cn("h-6 border-transparent px-2.5 text-[13px] font-semibold", TONES[tone])}>
      {children}
    </Badge>
  );
}
