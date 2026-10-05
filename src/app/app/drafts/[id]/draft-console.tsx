"use client";

import { useActionState } from "react";
import {
  draftDiffAction,
  draftExportAction,
  draftReviseAction,
  type DiffState,
  type DraftState,
  type ExportState,
} from "../actions";
import type { DraftVersion, DraftVersions } from "@/lib/gateway/types";

const draftInitial: DraftState = { phase: "idle" };
const diffInitial: DiffState = { phase: "idle" };
const exportInitial: ExportState = { phase: "idle" };

/**
 * A slot's provenance, with a word for each. `MODEL_SUGGESTION` is the one that matters:
 * it is the backend's own term for text a person has not accepted, it BLOCKS approval, and
 * this screen never renders it as settled prose. A draft that showed a model's sentence in
 * the same register as a verified one would be asking a lawyer to sign something no one
 * has read.
 */
const ORIGIN: Record<string, { glyph: string; word: string; meaning: string }> = {
  VERIFIED: { glyph: "✓", word: "VERIFIED", meaning: "from a cited provision" },
  SUPPLIED: { glyph: "•", word: "SUPPLIED", meaning: "given by a person" },
  MODEL_SUGGESTION: {
    glyph: "~",
    word: "MODEL SUGGESTION",
    meaning: "written by a model and not yet accepted — this blocks approval",
  },
  UNKNOWN: { glyph: "?", word: "UNKNOWN", meaning: "no provenance recorded" },
};

function originOf(key: string | undefined) {
  return ORIGIN[key ?? "UNKNOWN"] ?? ORIGIN.UNKNOWN;
}

function Failure({ error }: { error: { message: string; kind: string; route: string;
  status?: number } }) {
  return (
    <div role="alert" className="transport-failure">
      <h3>The gateway did not answer</h3>
      <p>{error.message}</p>
      <p className="meta">
        {error.kind} · {error.route}
        {error.status ? ` · HTTP ${error.status}` : ""}
      </p>
      <p className="meta">
        A transport failure. Nothing was saved, and the draft is unchanged.
      </p>
    </div>
  );
}

function Slots({ version }: { version: DraftVersion }) {
  if (version.slots.length === 0) {
    return <p className="meta">This version records no slots.</p>;
  }
  return (
    <table className="vault-table">
      <caption className="meta">
        Where each value came from. A MODEL SUGGESTION is marked and blocks approval until a
        person accepts it.
      </caption>
      <thead>
        <tr>
          <th scope="col">Slot</th>
          <th scope="col">Value</th>
          <th scope="col">Origin</th>
        </tr>
      </thead>
      <tbody>
        {version.slots.map((sl) => {
          const o = originOf(sl.origin);
          const suggestion = sl.origin === "MODEL_SUGGESTION";
          return (
            <tr key={sl.name} className={suggestion ? "slot-suggestion" : undefined}>
              <th scope="row">{sl.name}</th>
              <td>
                {sl.value ? (
                  suggestion ? (
                    // Marked in the markup, not only in a colour: a reader and a screen
                    // reader both learn this is a suggestion.
                    <>
                      <span className="suggestion-tag">suggestion</span>{" "}
                      <em>{sl.value}</em>
                    </>
                  ) : (
                    sl.value
                  )
                ) : (
                  <span className="meta">blank</span>
                )}
              </td>
              <td>
                <span aria-hidden="true">{o.glyph}</span> {o.word}
                <span className="meta origin-meaning"> — {o.meaning}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function DraftConsole({ draft }: { draft: DraftVersions }) {
  const [saved, reviseAction, saving] = useActionState(draftReviseAction, draftInitial);
  const [diff, diffAction, diffing] = useActionState(draftDiffAction, diffInitial);
  const [exported, exportAction, exporting] = useActionState(
    draftExportAction,
    exportInitial,
  );

  const latest = draft.versions[draft.versions.length - 1];
  // After a successful save the latest version is the one just written. The base sent with
  // the NEXT edit follows it, so a second save from this tab is not a stale one.
  const currentVersion = saved.phase === "saved" ? saved.data.version : latest.version;

  return (
    <>
      <p className="meta">
        {draft.versions.length} version(s) · reading version {latest.version}
        {latest.ready ? "" : " · not approvable"}
      </p>

      {!latest.ready && latest.blocking.length > 0 && (
        <div role="status" className="blocking-note">
          <p>
            Approval is blocked by: {latest.blocking.join(", ")}.
          </p>
          <p className="meta">
            A slot written by a model blocks approval until a person accepts it. Accepting is
            a save with your name on it — there is no button that clears this without one.
          </p>
        </div>
      )}

      <section aria-label="Revise">
        <h3>Revise</h3>
        <form action={reviseAction}>
          <input type="hidden" name="draft_id" value={draft.draft_id} />
          {/* The version this edit was based on. If another writer saves first, this value
              is stale and the save is refused with both numbers rather than overwriting. */}
          <input type="hidden" name="base_version" value={currentVersion} />

          <label htmlFor="body">Text</label>
          <textarea id="body" name="body" rows={8} defaultValue={latest.body} />

          <label htmlFor="approved_by">Approve as (optional)</label>
          <input id="approved_by" name="approved_by" type="text"
                 placeholder="your name, to accept the suggestions and approve"
                 aria-describedby="approve-help" />
          <p className="meta" id="approve-help">
            Leaving this blank saves a new version without approving it. Filling it accepts
            the model&rsquo;s slots and records who accepted them.
          </p>

          <button type="submit" disabled={saving} className="primary">
            {saving ? "Saving…" : `Save as version ${currentVersion + 1}`}
          </button>
          <p className="meta">
            Based on version {currentVersion}. Every save is a new version; nothing is
            edited in place.
          </p>
        </form>

        {saved.phase === "invalid" && (
          <p role="alert" className="invalid">{saved.message}</p>
        )}
        {saved.phase === "failed" && <Failure error={saved.error} />}
        {saved.phase === "refused" && (
          <div role="status" className="verb-refusal">
            <h3>Refused: {saved.code}</h3>
            <p>{saved.detail}</p>
          </div>
        )}

        {/* The CONFLICT, with BOTH versions. A product state — the gateway answered and
            declined — so it takes the refusal register, not the failure one. */}
        {saved.phase === "conflict" && (
          <div role="status" className="verb-refusal conflict">
            <h3>
              <span aria-hidden="true">⇄</span> CONFLICT — someone else saved first
            </h3>
            <table className="vault-table">
              <tbody>
                <tr>
                  <th scope="row">Your edit was based on</th>
                  <td className="meta">version {saved.data.base_version}</td>
                </tr>
                <tr>
                  <th scope="row">The draft is now at</th>
                  <td className="meta">version {saved.data.latest_version}</td>
                </tr>
              </tbody>
            </table>
            <p>{saved.data.detail}</p>
            <p className="meta">
              Nothing has been overwritten and nothing has been merged. Reload to read
              version {saved.data.latest_version}, then revise from it.
            </p>
          </div>
        )}
        {saved.phase === "saved" && (
          <div role="status">
            <p>Saved as version {saved.data.version}.</p>
            <p className="meta">{saved.data.note}</p>
            {saved.data.blocking.length > 0 && (
              <p className="meta">
                Still blocking: {saved.data.blocking.join(", ")}
              </p>
            )}
          </div>
        )}
      </section>

      <section aria-label="Provenance">
        <h3>Where version {latest.version} came from</h3>
        <Slots version={latest} />
      </section>

      <section aria-label="Versions">
        <h3>Versions</h3>
        <ol className="version-list">
          {draft.versions.map((v) => (
            <li key={v.version}>
              <p>
                Version {v.version}
                {v.approved ? ` — approved by ${v.approved_by}` : " — not approved"}
              </p>
              <p className="meta">{v.created_at}</p>
              {v.blocking.length > 0 && (
                <p className="meta">blocked by {v.blocking.join(", ")}</p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Compare">
        <h3>Compare two versions</h3>
        <form action={diffAction} className="inline-form">
          <input type="hidden" name="draft_id" value={draft.draft_id} />
          <label htmlFor="from_version">From</label>
          <input id="from_version" name="from_version" type="number" min={1}
                 max={draft.versions.length} defaultValue={1} />
          <label htmlFor="to_version">To</label>
          <input id="to_version" name="to_version" type="number" min={1}
                 max={draft.versions.length} defaultValue={draft.versions.length} />
          <button type="submit" disabled={diffing}>
            {diffing ? "Comparing…" : "Compare"}
          </button>
        </form>
        {diff.phase === "invalid" && (
          <p role="alert" className="invalid">{diff.message}</p>
        )}
        {diff.phase === "failed" && <Failure error={diff.error} />}
        {diff.phase === "diffed" && (
          <div role="status">
            {diff.data.text_changed ? (
              <pre className="diff">{diff.data.text.join("\n")}</pre>
            ) : (
              <p className="meta">The text is identical between these versions.</p>
            )}
            {diff.data.newly_blocking.length > 0 && (
              <p className="meta">
                Newly blocking: {diff.data.newly_blocking.length} slot(s). This is the change
                a text diff cannot show — identical words whose support is gone.
              </p>
            )}
            {diff.data.note && <p className="meta">{diff.data.note}</p>}
          </div>
        )}
      </section>

      <section aria-label="Export">
        <h3>Export</h3>
        <form action={exportAction} className="inline-form">
          <input type="hidden" name="draft_id" value={draft.draft_id} />
          <label htmlFor="version">Version</label>
          <input id="version" name="version" type="number" min={1}
                 max={draft.versions.length} defaultValue={draft.versions.length} />
          <button type="submit" disabled={exporting}>
            {exporting ? "Building…" : "Export text"}
          </button>
        </form>
        {exported.phase === "failed" && <Failure error={exported.error} />}
        {exported.phase === "exported" && (
          <div role="status">
            <p className="meta">
              {exported.data.filename}
              {exported.data.ready_for_approval ? "" : " · not approvable"}
            </p>
            <pre className="csv-preview">{exported.data.text}</pre>
            <p className="meta">{exported.data.note}</p>
          </div>
        )}
      </section>

      <p className="meta hosting-note">
        playbook_status DRAFT — the templates behind this draft are not lawyer approved.
        Model hosting: UAE North; no client document may be sent there.
      </p>
    </>
  );
}
