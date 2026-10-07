/**
 * The Placedon mark, inline. Traced from brand-kit/logo/placedon-logo-original.jpeg
 * (1024 × 1024): two white planes split by a band, a bookmark cut through both, and the
 * tail at the foot. On a black tile, as the owner supplied it.
 *
 * Colours come from tokens (`text-fg` tile, `--c-ground` planes), so it follows the
 * console's black and white. Decorative by default; pass `title` where it names the product.
 */
export function PlacedonMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="1024" height="1024" rx="200" fill="currentColor" />
      {/* Inline, with a white fallback: the mark must not depend on a stylesheet loading. */}
      <g style={{ fill: "var(--c-ground, white)" }}>
        <path d="M182 147H848L757 405H624V309Q624 287 602 287H428Q406 287 406 309V405H274Z" />
        <path d="M274 487H406V630L515 561L624 630V487H757L848 747H406V897L182 747Z" />
      </g>
    </svg>
  );
}
