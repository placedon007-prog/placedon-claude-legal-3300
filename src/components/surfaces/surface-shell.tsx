import type { ReactNode } from "react";
import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site-chrome";
import { LegalText } from "@/components/brand";
import type { ProductClass, EngineError } from "@/lib/engine";
import { formatIST } from "@/lib/format";
import "./surfaces.css";

/*
 * Presentational kit shared by the four product surfaces. Server-only markup
 * (no "use client"): these render an engine result the Server Component already
 * fetched. The engine is never imported here — only its result types.
 *
 * The central rule this kit enforces visually: an ENGINE ERROR is not an
 * ABSTENTION. EngineErrorPanel says so in words and looks different from
 * AbstentionCard, so a transport failure can never read as a verified "we
 * cannot answer".
 */

const SURFACES = [
  { href: "/product/compliance-pack", label: "Compliance pack" },
  { href: "/product/document-check", label: "Document check" },
  { href: "/product/events", label: "Currency events" },
  { href: "/product/instruments", label: "Instrument impact" },
] as const;

export function SurfaceShell({
  eyebrow,
  title,
  intro,
  active,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  active: string;
  children: ReactNode;
}) {
  return (
    <div className="dash">
      <SiteNav />
      <main id="main-content" className="surface">
        <div className="dash-container surface-head">
          <p className="eyebrow">{eyebrow}</p>
          <h1>
            <LegalText>{title}</LegalText>
          </h1>
          <p className="surface-intro">
            <LegalText>{intro}</LegalText>
          </p>
          <p className="surface-concept" role="note">
            Product concept — shown on fixed sample data, not a live answer for a
            real company. Registration is not open.
          </p>
          <nav className="surface-nav" aria-label="Product surfaces">
            {SURFACES.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                aria-current={s.href === active ? "page" : undefined}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="dash-container surface-body">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ── Answer-class badge — distinguished by icon + label, never colour alone ── */

const CLASS_META: Record<
  ProductClass,
  { label: string; note: string; icon: ReactNode }
> = {
  verified_fact: {
    label: "Verified fact",
    note: "A documented statutory basis.",
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="m4 12 5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  deterministic_conclusion: {
    label: "Determined",
    note: "A conclusion the rules compel from the facts given.",
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M5 8h14M5 16h14" strokeLinecap="round" />
      </svg>
    ),
  },
  predictive_signal: {
    label: "Signal — not asserted",
    note: "Shown for awareness; it is not a verified answer.",
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M3 12h4l3-7 4 14 3-7h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  abstained: {
    label: "Abstained",
    note: "No verified answer yet — here is what is missing.",
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="M9 10h6" strokeLinecap="round" />
      </svg>
    ),
  },
};

export function ClassBadge({ kind }: { kind: ProductClass }) {
  const meta = CLASS_META[kind];
  return (
    <span className={`class-badge cb-${kind}`}>
      {meta.icon}
      <span>{meta.label}</span>
    </span>
  );
}

export function classNote(kind: ProductClass): string {
  return CLASS_META[kind].note;
}

/* ── Citation, jurisdiction stamp ─────────────────────────────────────────── */

export function Citation({ provision }: { provision: string }) {
  return (
    <span className="cite mono" title="Statutory provision">
      {provision}
    </span>
  );
}

export function Stamp({
  asOf,
  lawAsOf,
  generatedAt,
}: {
  asOf: string;
  lawAsOf?: string;
  generatedAt?: string;
}) {
  return (
    <p className="surface-stamp">
      <span>
        Jurisdiction <strong>India · Companies Act, 2013</strong>
      </span>
      <span>
        As of <span className="mono">{asOf}</span>
      </span>
      {lawAsOf && (
        <span>
          Law as of <span className="mono">{lawAsOf}</span>
        </span>
      )}
      {generatedAt && (
        <span>
          Generated <span className="mono">{formatIST(generatedAt)}</span>
        </span>
      )}
    </p>
  );
}

/* ── Transport-error state — deliberately NOT an abstention ───────────────── */

export function EngineErrorPanel({ error }: { error: EngineError }) {
  return (
    <div className="surface-error" role="alert">
      <p className="eyebrow">Service unavailable</p>
      <h2>The record could not be reached.</h2>
      <p>
        This is a connection or service problem — not a legal finding. No
        answer, and no abstention, is implied. Nothing about the company&rsquo;s
        obligations has been established here. Try again.
      </p>
      <p className="surface-error-detail mono">
        {error.kind}
        {typeof error.status === "number" ? ` · ${error.status}` : ""}
      </p>
    </div>
  );
}

/* ── Abstention card — a verified product state, derived from a payload ───── */

export function AbstentionCard({
  provision,
  basis,
  missing,
  blockedBy,
}: {
  provision: string;
  basis: string;
  missing: readonly string[];
  blockedBy: string | null;
}) {
  return (
    <div className="abstain-card">
      <div className="abstain-head">
        <ClassBadge kind="abstained" />
        <Citation provision={provision} />
      </div>
      <p className="abstain-basis">
        <LegalText>{basis}</LegalText>
      </p>
      {missing.length > 0 && (
        <div className="abstain-missing">
          <p className="abstain-label">What would settle it</p>
          <ul>
            {missing.map((m) => (
              <li key={m} className="mono">
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
      {blockedBy && (
        <p className="abstain-blocked">
          Blocked by <span className="mono">{blockedBy}</span>
        </p>
      )}
    </div>
  );
}

/* ── Provenance footer ────────────────────────────────────────────────────── */

export function ProvenanceFooter({
  items,
}: {
  items: readonly { label: string; value: string; mono?: boolean }[];
}) {
  return (
    <dl className="surface-provenance">
      {items.map((it) => (
        <div key={it.label}>
          <dt>{it.label}</dt>
          <dd className={it.mono ? "mono" : undefined}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
