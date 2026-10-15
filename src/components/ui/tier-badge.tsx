import type { SourceTier } from "@/lib/gateway/types";

const TIER_LABEL: Record<SourceTier, string> = {
  HELD: "Held",
  LICENSED: "Licensed",
  PUBLIC: "Public",
};

/**
 * The console's source-tier register, in one word — never colour (AGENTS.md: answer and
 * source registers are told apart by shape and words, colour carries nothing). One component
 * so HELD, LICENSED and PUBLIC read the same way everywhere a source's tier is shown; today
 * only LICENSED judgments use it, HELD and PUBLIC are wired for the sources that need them.
 */
export function TierBadge({ tier }: { tier: SourceTier }) {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-chip border border-line-control px-1.5 font-mono text-caption text-fg-2">
      {TIER_LABEL[tier]}
    </span>
  );
}
