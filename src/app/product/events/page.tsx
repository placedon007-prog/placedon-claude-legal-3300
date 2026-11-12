import { getEngine } from "@/lib/engine";
import { eventProductClass, type EngineEvent } from "@/lib/engine";
import { LegalText } from "@/components/brand";
import {
  SurfaceShell,
  ClassBadge,
  Citation,
  Stamp,
  EngineErrorPanel,
  classNote,
} from "@/components/surfaces/surface-shell";

export const metadata = {
  title: "Currency events — Placedon",
  description:
    "A concept view of the law-change currency stream: statutory movements, each classed as a verified fact, a determined consequence, or a signal awaiting verification.",
  robots: { index: false, follow: false },
};

const SAMPLE_CIN = "U74999KA2021PTC145321";

function EventCard({ event }: { event: EngineEvent }) {
  const kind = eventProductClass(event.output_class);
  return (
    <li className="evt-card">
      <div className="evt-head">
        <ClassBadge kind={kind} />
        <span className="evt-dates">
          Occurred <span className="mono">{event.at}</span> · known{" "}
          <span className="mono">{event.known_at}</span>
        </span>
      </div>
      <h3>
        <LegalText>{event.title}</LegalText>
      </h3>
      <p className="evt-consequence">
        <LegalText>{event.consequence}</LegalText>
      </p>
      <p className="evt-meta">
        <span>
          Source <Citation provision={event.source.instrument} />
        </span>
        <span>
          Affects <span className="mono">{event.obligation_id}</span>
        </span>
      </p>
      <p className="evt-verified">
        {event.verified_by
          ? `Verified by ${event.verified_by}.`
          : "Not independently verified — this is why it is shown as a signal, not asserted."}
      </p>
      <p className="evt-note">{classNote(kind)}</p>
    </li>
  );
}

export default async function EventsPage() {
  const engine = await getEngine();
  const result = await engine.events(SAMPLE_CIN, { as_of: "2026-09-01" });

  const shell = {
    eyebrow: "Product surface · Currency events",
    title: "When the law behind a duty moves.",
    intro:
      "A time-ordered stream of statutory movements, each classed by how settled it is. A movement carries the instrument, the date it occurred, and the date it became known.",
    active: "/product/events",
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
      <Stamp asOf={data.as_of} generatedAt={data.generated_at} />
      <p className="surface-scope" role="note">
        This is the law-change currency stream (<span className="mono">{data.scope}</span>),
        not a per-company log. It is not filtered to one company — an absence
        here is not evidence that nothing affects a particular company.
      </p>
      {data.events.length === 0 ? (
        <p className="surface-empty">
          No law-change movements are recorded for this window.
        </p>
      ) : (
        <ul className="evt-list">
          {data.events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </ul>
      )}
    </SurfaceShell>
  );
}
