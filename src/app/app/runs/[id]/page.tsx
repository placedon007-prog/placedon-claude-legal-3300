import type { Metadata } from "next";
import Link from "next/link";
import { getGateway } from "@/lib/gateway";
import type { RunStep } from "@/lib/gateway/types";
import { isLive } from "@/lib/gateway/types";
import { RunWatch } from "../run-watch";

export const metadata: Metadata = { title: "Run trace", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gateway = await getGateway();
  const [run, trace] = await Promise.all([gateway.run(id), gateway.trace(id)]);

  return (
    <>
      <h2>Run</h2>
      <p className="meta" style={{ marginBottom: "1.5rem" }}>
        <span className="mono">{id}</span> · <Link href="/app/runs">back to runs</Link>
      </p>

      {run.ok ? (
        <>
          <p className="lede" style={{ marginBottom: "0.4rem" }}>
            {run.data.intent}
          </p>
          {/* The status, the poll and Cancel live in a client component: a run no longer
              finishes inside the request that started it, so the page has to ask. */}
          <RunWatch
            initial={{
              id,
              status: run.data.status,
              refusalCode: run.data.refusal_code ?? null,
              live: isLive(run.data.status),
              steps: trace.ok
                ? trace.data.steps.map((s) => ({
                    capability: s.capability,
                    status: s.status,
                  }))
                : [],
              unreachable: null,
            }}
          />
        </>
      ) : (
        <section className="panel register-failure" role="alert" aria-label="Engine failure">
          <span className="register-label">Engine failure · {run.error.kind}</span>
          <p style={{ marginTop: "0.6rem" }}>
            <strong>This is not a refusal.</strong> The run could not be read.
          </p>
          <p className="quoted">{run.error.message}</p>
        </section>
      )}

      {trace.ok ? (
        <section className="panel" aria-label="Steps">
          <div className="panel-head">
            <h3>Steps</h3>
            <span className="meta">{trace.data.steps.length} recorded, in order</span>
          </div>
          <table className="steps">
            <thead>
              <tr>
                <th scope="col">Step</th>
                <th scope="col">Status</th>
                <th scope="col">Model</th>
                <th scope="col">Region</th>
                <th scope="col">Cost (INR)</th>
              </tr>
            </thead>
            <tbody>
              {trace.data.steps.map((s, i) => (
                <StepRow key={`${s.capability}-${i}`} step={s} />
              ))}
            </tbody>
          </table>
          <p className="meta" style={{ marginTop: "1rem" }}>
            <span className="unpriced">UNPRICED</span> is not zero. It means the call was
            made and this deployment has no verified price for that model, or that no model
            ran on the step. A billed provider can never record a cost of 0.
          </p>
        </section>
      ) : (
        <section className="panel register-failure" role="alert" aria-label="Engine failure">
          <span className="register-label">Engine failure · {trace.error.kind}</span>
          <p style={{ marginTop: "0.6rem" }}>The trace could not be read.</p>
          <p className="quoted">{trace.error.message}</p>
        </section>
      )}
    </>
  );
}

function StepRow({ step }: { step: RunStep }) {
  return (
    <tr>
      <td>
        <span className="mono">{step.capability}</span>
        {step.engine_capability ? (
          <div className="meta">{step.engine_capability}</div>
        ) : null}
      </td>
      <td>
        <span className="mono">{step.status}</span>
        {step.degraded ? <div className="meta">degraded route</div> : null}
      </td>
      <td>{step.model ? <span className="mono">{step.model}</span> : <span className="meta">—</span>}</td>
      <td>{step.region ? <span className="mono">{step.region}</span> : <span className="meta">—</span>}</td>
      <td>
        {/* Null is UNPRICED and says so. Rendering 0 here would claim the call was free,
            which is the exact falsehood the backend refuses to record. */}
        {step.cost_inr === null ? (
          <>
            <span className="unpriced">UNPRICED</span>
            {step.cost_note ? <div className="meta">{step.cost_note}</div> : null}
          </>
        ) : (
          <>
            <span className="mono">₹{step.cost_inr.toFixed(4)}</span>
            {step.cost_note ? <div className="meta">{step.cost_note}</div> : null}
          </>
        )}
      </td>
    </tr>
  );
}
