import { getEngine } from "@/lib/engine";
import type { AffectedObligation } from "@/lib/engine";
import { LegalText } from "@/components/brand";
import { formatIST } from "@/lib/format";
import {
  SurfaceShell,
  Citation,
  EngineErrorPanel,
} from "@/components/surfaces/surface-shell";

export const metadata = {
  title: "Instrument impact — Placedon",
  description:
    "A concept view that traces which obligations an amending or commencement instrument reaches — the reverse of asking which provision applies.",
  robots: { index: false, follow: false },
};

const SAMPLE_FRAGMENT = "880";

function AffectedRow({ item }: { item: AffectedObligation }) {
  if (typeof item === "string") {
    return (
      <li className="aff-row aff-bare">
        <span className="mono">{item}</span>
      </li>
    );
  }
  return (
    <li className="aff-row">
      <div className="aff-head">
        <span className="mono">{item.obligation_id}</span>
        {item.provision && <Citation provision={item.provision} />}
      </div>
      {item.duty && (
        <h3>
          <LegalText>{item.duty}</LegalText>
        </h3>
      )}
      {item.detail && (
        <p className="aff-detail">
          <LegalText>{item.detail}</LegalText>
        </p>
      )}
    </li>
  );
}

export default async function InstrumentsPage() {
  const engine = await getEngine();
  const result = await engine.instrumentAffected(SAMPLE_FRAGMENT);

  const shell = {
    eyebrow: "Product surface · Instrument impact",
    title: "Which duties an instrument reaches.",
    intro:
      "The reverse lookup: given an amending or commencement instrument, the obligations it bears on. Useful when a Gazette notification lands and you need to know what it moves.",
    active: "/product/instruments",
  } as const;

  if (!result.ok) {
    return (
      <SurfaceShell {...shell}>
        <EngineErrorPanel error={result.error} />
      </SurfaceShell>
    );
  }

  const data = result.data;

  return (
    <SurfaceShell {...shell}>
      <p className="surface-stamp">
        <span>
          Jurisdiction <strong>India · Companies Act, 2013</strong>
        </span>
        <span>
          Generated <span className="mono">{formatIST(data.generated_at)}</span>
        </span>
      </p>
      <div className="aff-instrument">
        <span className="aff-instrument-label">Instrument</span>
        <Citation provision={data.instrument} />
      </div>
      {data.obligations.length === 0 ? (
        <p className="surface-empty">
          No obligations are recorded against this instrument in the corpus.
        </p>
      ) : (
        <>
          <p className="aff-count">
            <span className="mono">{data.obligations.length}</span> obligation
            {data.obligations.length === 1 ? "" : "s"} reached
          </p>
          <ul className="aff-list">
            {data.obligations.map((item, i) => (
              <AffectedRow key={i} item={item} />
            ))}
          </ul>
        </>
      )}
    </SurfaceShell>
  );
}
