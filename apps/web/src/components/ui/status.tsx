import { cn } from "@/lib/cn";

type Tone = "positive" | "neutral" | "research" | "attention" | "negative" | "info";

const tones: Record<Tone, { dot: string; text: string }> = {
  positive: { dot: "bg-success", text: "text-success" },
  neutral: { dot: "bg-ink-3", text: "text-ink-2" },
  research: { dot: "bg-secondary", text: "text-secondary" },
  attention: { dot: "bg-accent-mark", text: "text-accent" },
  negative: { dot: "bg-error", text: "text-error" },
  info: { dot: "bg-info", text: "text-info" },
};

/** Status indicator: a dot plus a text label, never colour alone. */
export function StatusBadge({ tone, children, className }: { tone: Tone; children: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-label", tones[tone].text, className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", tones[tone].dot)} />
      {children}
    </span>
  );
}
