import { getEngine } from "@/lib/engine";
import type { SupersededEntry, VerifiedEntry, RowState } from "@/lib/engine";
import { LegalText } from "@/components/brand";
import {
  SurfaceShell,
  Citation,
  Stamp,
  EngineErrorPanel,
  AbstentionCard,
} from "@/components/surfaces/surface-shell";

export const metadata = {
  title: "Document check — Placedon",
  description:
    "A concept view that reads whether the law behind a dated document moved between its date and today — flagging superseded positions and abstaining where a movement is unsettled.",
  robots: { index: false, follow: false },
};

const STATE_LABEL: Record<RowState, string> = {
  APPLIES_SATISFIED: "Satisfied",
  APPLIES_NOT_SATISFIED: "Not satisfied",
  APPLIES_UNDETERMINED: "Undetermined",
  DOES_NOT_APPLY: "Does not apply",
  CANNOT_DETERMINE: "Cannot determine",
};

function SupersededRow({ entry }: { entry: SupersededEntry }) {
  return (
    <li className="doc-super">
      <div className="ob-row-head">
        <h3>
          <LegalText>{entry.duty}</LegalText>
        </h3>
        <span className="ob-state" data-state="APPLIES_NOT_SATISFIED">
          Superseded
        </span>
      </div>
      <Citation provision={entry.provision} />
      <p className="doc-super-detail">
        <LegalText>{entry.detail}</LegalText>
      </p>
      <dl className="doc-thennow">
        <div>
          <dt>At the document date</dt>
          <dd>
            <LegalText>{entry.was_at_document_date}</LegalText>
          </dd>
        </div>
        <div>
          <dt>At the read date</dt>
          <dd>
            <LegalText>{entry.is_at_read_date}</LegalText>
          </dd>
        </div>
      </dl>
      <p className="doc-instrument">
        Moved by <Citation provision={entry.instrument} />
      </p>
    </li>
  );
}

function VerifiedRow({ entry }: { entry: VerifiedEntry }) {
  return (
    <li className="ob-row" data-state={entry.state}>
      <div className="ob-row-head">
        <h3>
          <LegalText>{entry.duty}</LegalText>
        </h3>
        <span className="ob-state" data-state={entry.state}>
          {STATE_LABEL[entry.state]}
        </span>
      </div>
      <Citation provision={entry.provision} />
      <p className="ob-basis">
        <LegalText>{entry.basis}</LegalText>
      </p>
    </li>
  );
}

export default async function DocumentCheckPage() {
  const engine = await getEngine();
  const result = await engine.documentCheck({
    company_class: "private",
    incorporation_date: "2021-04-01",
    document_date: "2021-06-30",
    as_of: "2026-09-01",
  });

  const shell = {
    eyebrow: "Product surface · Document check",
    title: "Did the law behind this document move?",
    intro:
      "Given a document&rsquo;s date, a read of whether the statutory positions it relied on still hold today — separating what was superseded, what still holds, and what cannot be verified.",
    active: "/product/document-check",
  } as const;

  if (!result.ok) {
    return (
      <SurfaceShell {...shell}>
        <EngineErrorPanel error={result.error} />
      </SurfaceShell>
    );
  }

  const doc = result.data;

  return (
    <SurfaceShell {...shell}>
      <Stamp asOf={doc.as_of} generatedAt={doc.generated_at} />
      <ul className="ob-summary" aria-label="Summary">
        <li>
          <span className="mono">{doc.summary.superseded}</span> superseded
        </li>
        <li>
          <span className="mono">{doc.summary.verified}</span> still holds
        </li>
        <li>
          <span className="mono">{doc.summary.cannot_verify}</span> abstained
        </li>
      </ul>
      <p className="surface-daterange">
        Document dated <span className="mono">{doc.document_date}</span>, read as
        of <span className="mono">{doc.as_of}</span>.
      </p>

      {doc.superseded.length > 0 && (
        <section aria-labelledby="doc-superseded">
          <h2 id="doc-superseded" className="surface-section-h">
            Superseded
          </h2>
          <ul className="ob-list">
            {doc.superseded.map((e) => (
              <SupersededRow key={e.obligation_id} entry={e} />
            ))}
          </ul>
        </section>
      )}

      {doc.cannot_verify.length > 0 && (
        <section aria-labelledby="doc-abstained">
          <h2 id="doc-abstained" className="surface-section-h">
            Cannot verify — abstained
          </h2>
          <ul className="ob-list">
            {doc.cannot_verify.map((e) => (
              <li key={e.obligation_id}>
                <AbstentionCard
                  provision={e.provision}
                  basis={e.detail}
                  missing={[]}
                  blockedBy={
                    e.shape === "movement_unverified" ? e.reference : null
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {doc.verified.length > 0 && (
        <section aria-labelledby="doc-verified">
          <h2 id="doc-verified" className="surface-section-h">
            Still holds
          </h2>
          <ul className="ob-list">
            {doc.verified.map((e) => (
              <VerifiedRow key={e.obligation_id} entry={e} />
            ))}
          </ul>
        </section>
      )}
    </SurfaceShell>
  );
}
