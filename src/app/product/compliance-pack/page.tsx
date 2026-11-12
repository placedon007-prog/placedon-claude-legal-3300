import { getEngine } from "@/lib/engine";
import {
  isAbstainingRowState,
  type ObligationRow,
  type RowState,
} from "@/lib/engine";
import { LegalText } from "@/components/brand";
import { formatIndianNumber } from "@/lib/format";
import {
  SurfaceShell,
  Citation,
  Stamp,
  EngineErrorPanel,
  AbstentionCard,
  ProvenanceFooter,
} from "@/components/surfaces/surface-shell";

export const metadata = {
  title: "Compliance pack — Placedon",
  description:
    "A concept view of a Companies Act, 2013 compliance pack: each duty, its provision, its state, and the basis — abstaining where the record is unsettled.",
  robots: { index: false, follow: false },
};

const STATE_LABEL: Record<RowState, string> = {
  APPLIES_SATISFIED: "Satisfied",
  APPLIES_NOT_SATISFIED: "Not satisfied",
  APPLIES_UNDETERMINED: "Undetermined",
  DOES_NOT_APPLY: "Does not apply",
  CANNOT_DETERMINE: "Cannot determine",
};

/** A non-abstaining obligation row: a determined state with its basis. */
function DeterminedRow({ row }: { row: ObligationRow }) {
  return (
    <li className="ob-row" data-state={row.state}>
      <div className="ob-row-head">
        <h3>
          <LegalText>{row.duty}</LegalText>
        </h3>
        <span className="ob-state" data-state={row.state}>
          {STATE_LABEL[row.state]}
        </span>
      </div>
      <Citation provision={row.provision} />
      <p className="ob-basis">
        <LegalText>{row.basis}</LegalText>
      </p>
    </li>
  );
}

export default async function CompliancePackPage() {
  const engine = await getEngine();
  const result = await engine.compliancePack({
    company_class: "private",
    incorporation_date: "2021-04-01",
    as_of: "2026-09-01",
    financial_year: "2025-26",
  });

  const shell = {
    eyebrow: "Product surface · Compliance pack",
    title: "Every duty, with the provision that imposes it.",
    intro:
      "A read of the duties the Companies Act, 2013 places on a company profile as of a date — each row carrying its provision, its state, and the basis for that state. Where the record is unsettled, the row abstains rather than guessing.",
    active: "/product/compliance-pack",
  } as const;

  if (!result.ok) {
    return (
      <SurfaceShell {...shell}>
        <EngineErrorPanel error={result.error} />
      </SurfaceShell>
    );
  }

  const pack = result.data;
  const prov = pack.provenance;
  const hasStamps = "law_as_of" in prov;

  return (
    <SurfaceShell {...shell}>
      <Stamp
        asOf={pack.as_of}
        lawAsOf={hasStamps ? prov.law_as_of : undefined}
        generatedAt={pack.generated_at}
      />

      <ul className="ob-summary" aria-label="Summary of obligation states">
        <li>
          <span className="mono">{formatIndianNumber(pack.summary.satisfied)}</span>{" "}
          satisfied
        </li>
        <li>
          <span className="mono">
            {formatIndianNumber(pack.summary.not_satisfied)}
          </span>{" "}
          not satisfied
        </li>
        <li>
          <span className="mono">
            {formatIndianNumber(
              pack.summary.undetermined + pack.summary.cannot_determine,
            )}
          </span>{" "}
          abstained
        </li>
        <li>
          <span className="mono">
            {formatIndianNumber(pack.summary.not_applicable)}
          </span>{" "}
          does not apply
        </li>
      </ul>

      <ul className="ob-list">
        {pack.rows.map((row) =>
          isAbstainingRowState(row.state) ? (
            <li key={row.obligation_id}>
              <AbstentionCard
                provision={row.provision}
                basis={row.basis}
                missing={row.missing_facts}
                blockedBy={row.blocked_by}
              />
            </li>
          ) : (
            <DeterminedRow key={row.obligation_id} row={row} />
          ),
        )}
      </ul>

      {pack.law_currency_watch.length > 0 && (
        <section className="surface-watch" aria-labelledby="watch-title">
          <h2 id="watch-title">Currency watch</h2>
          <p className="surface-watch-note">
            Instruments that may move a duty, still pending settlement in the
            record.
          </p>
          <ul>
            {pack.law_currency_watch.map((w) => (
              <li key={w.obligation_id + w.instrument}>
                <Citation provision={w.instrument} />
                <LegalText>{w.detail}</LegalText>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="surface-notes">
        {pack.what_this_is.length > 0 && (
          <div>
            <p className="surface-notes-label">What this is</p>
            <ul>
              {pack.what_this_is.map((t, i) => (
                <li key={i}>
                  <LegalText>{t}</LegalText>
                </li>
              ))}
            </ul>
          </div>
        )}
        {pack.what_it_is_not.length > 0 && (
          <div>
            <p className="surface-notes-label">What it is not</p>
            <ul>
              {pack.what_it_is_not.map((t, i) => (
                <li key={i}>
                  <LegalText>{t}</LegalText>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {hasStamps && (
        <ProvenanceFooter
          items={[
            { label: "Corpus", value: prov.corpus_version, mono: true },
            { label: "Benchmark", value: prov.benchmark_version, mono: true },
            { label: "Checker", value: prov.checker_commit, mono: true },
          ]}
        />
      )}
    </SurfaceShell>
  );
}
