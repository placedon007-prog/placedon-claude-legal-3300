"use client";

import { useActionState } from "react";
import {
  vaultFindAction,
  vaultUploadAction,
  vaultVerifyAction,
  type VaultState,
} from "./actions";
import type { VaultStatus } from "@/lib/gateway/types";

const initial: VaultState = { phase: "idle" };

/**
 * A glyph AND a word per upload state, so the file list is readable with no colour.
 *
 * `PENDING` is the one most easily misread, so its words say what it is: queued, and **not**
 * searchable yet. A tick beside it would say the opposite of the truth.
 */
const UPLOAD_STATE: Record<string, { glyph: string; word: string; meaning: string }> = {
  INGESTED: { glyph: "✓", word: "INGESTED", meaning: "read and searchable" },
  PENDING: { glyph: "·", word: "PENDING", meaning: "queued; not searchable yet" },
  PARTIAL: {
    glyph: "±",
    word: "PARTIAL",
    meaning: "some pages could not be read and are not indexed",
  },
  CANNOT_READ: { glyph: "✗", word: "CANNOT READ", meaning: "no text layer; OCR is blocked" },
  DELETED: { glyph: "–", word: "DELETED", meaning: "bytes destroyed; the record remains" },
};

function stateOf(key: string) {
  return (
    UPLOAD_STATE[key] ?? { glyph: "?", word: key, meaning: "a state this screen does not know" }
  );
}

function FileList({ data }: { data: VaultStatus }) {
  const states = Object.entries(data.by_state);
  return (
    <>
      <p className="meta">
        {data.documents} document(s) · {data.unsearchable} cannot be searched ·{" "}
        {data.deleted} deleted
      </p>
      {states.length === 0 ? (
        <p className="cal-empty">
          Nothing in this firm&rsquo;s vault yet. That is not “no document matches” — there
          is nothing to match against.
        </p>
      ) : (
        <table className="vault-table">
          <caption className="meta">
            One row per upload state. A count beside a state, not a tick: PENDING means
            queued, and a document that is queued is not yet searchable.
          </caption>
          <thead>
            <tr>
              <th scope="col">State</th>
              <th scope="col">Documents</th>
              <th scope="col">What it means</th>
            </tr>
          </thead>
          <tbody>
            {states.map(([key, count]) => {
              const s = stateOf(key);
              return (
                <tr key={key}>
                  <th scope="row">
                    <span aria-hidden="true">{s.glyph}</span> {s.word}
                  </th>
                  <td className="meta">{count}</td>
                  <td>{s.meaning}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="meta">{data.note}</p>
    </>
  );
}

function Failure({ state }: { state: Extract<VaultState, { phase: "failed" }> }) {
  return (
    <div role="alert" className="transport-failure">
      <h3>The gateway did not answer</h3>
      <p>{state.error.message}</p>
      <p className="meta">
        {state.error.kind} · {state.error.route}
        {state.error.status ? ` · HTTP ${state.error.status}` : ""}
      </p>
      <p className="meta">
        A transport failure. Nothing was uploaded, searched or verified, and no document has
        been judged either way.
      </p>
    </div>
  );
}

function Refusal({ state }: { state: Extract<VaultState, { phase: "refused" }> }) {
  // A named refusal is a product answer. It gets its own register — not the failure one,
  // which would say the gateway broke, and not a silent empty state.
  return (
    <div role="status" className="verb-refusal">
      <h3>Refused: {state.code}</h3>
      <p>{state.detail}</p>
      <p className="meta">
        The gateway answered, and declined. This is a decision with a name, not an error.
      </p>
    </div>
  );
}

export function VaultConsole({ initialList }: { initialList: VaultStatus | null }) {
  const [upload, uploadAction, uploading] = useActionState(vaultUploadAction, initial);
  const [find, findAction, finding] = useActionState(vaultFindAction, initial);
  const [verify, verifyAction, verifying] = useActionState(vaultVerifyAction, initial);

  const list = upload.phase === "uploaded" ? upload.data : initialList;

  return (
    <>
      <section aria-label="Upload">
        <h3>Add a document</h3>
        <form action={uploadAction}>
          <label htmlFor="file">File</label>
          <input id="file" name="file" type="file" accept=".docx,.pdf,.txt,.md"
                 aria-describedby="vault-file-help" />
          <p className="meta" id="vault-file-help">
            .docx, or a .pdf with a real text layer. A scan is refused rather than stored:
            bytes no search can reach are not a document in a vault.
          </p>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text"
                 placeholder="taken from the file when you choose one" />
          <button type="submit" disabled={uploading} className="primary">
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>

        {upload.phase === "invalid" && (
          <p role="alert" className="invalid">{upload.message}</p>
        )}
        {upload.phase === "failed" && <Failure state={upload} />}
        {upload.phase === "refused" && <Refusal state={upload} />}
        {upload.phase === "uploaded" && (
          <div role="status" className="vault-uploaded">
            <p>
              <span aria-hidden="true">{stateOf(upload.state).glyph}</span>{" "}
              {upload.name} — {stateOf(upload.state).word}
            </p>
            <p className="meta">{upload.note}</p>
          </div>
        )}
      </section>

      <section aria-label="The vault">
        <h3>In this firm&rsquo;s vault</h3>
        {list ? <FileList data={list} /> : <Failure state={{ phase: "failed",
          error: { kind: "transport_error", route: "/v2/vault/status",
                   message: "The vault could not be read." } }} />}
      </section>

      <section aria-label="Search">
        <h3>Search</h3>
        <form action={findAction}>
          <label htmlFor="query">Words to find</label>
          <input id="query" name="query" type="text" placeholder="governing law" />
          <button type="submit" disabled={finding}>
            {finding ? "Searching…" : "Search"}
          </button>
        </form>
        {find.phase === "invalid" && <p role="alert" className="invalid">{find.message}</p>}
        {find.phase === "failed" && <Failure state={find} />}
        {find.phase === "found" && (
          <div role="status">
            <p className="meta">
              {find.data.hits.length} passage(s) · searched{" "}
              {find.data.searched_documents} document(s) ·{" "}
              {find.data.unsearchable} could not be looked at
            </p>
            {find.data.hits.length === 0 ? (
              <p className="cal-empty">{find.data.note}</p>
            ) : (
              <ul className="vault-hits">
                {find.data.hits.map((h) => (
                  <li key={h.document_id}>
                    <p>{h.name ?? h.document_id}</p>
                    {h.quote && <blockquote className="evidence">{h.quote}</blockquote>}
                    <p className="meta">{h.document_id}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="meta">{find.data.scope_note}</p>
          </div>
        )}
      </section>

      <section aria-label="Verify">
        <h3>Verify the stored bytes</h3>
        <form action={verifyAction}>
          <label htmlFor="document_id">Document id</label>
          <input id="document_id" name="document_id" type="text"
                 placeholder="the sha256 the document is stored under"
                 aria-describedby="verify-help" />
          <p className="meta" id="verify-help">
            Each check is reported on its own line. There is no single real-or-fake verdict:
            “the bytes are gone” and “the bytes hash to something else” are different
            problems with different remedies, and one badge would make them the same answer.
          </p>
          <button type="submit" disabled={verifying}>
            {verifying ? "Verifying…" : "Verify"}
          </button>
        </form>
        {verify.phase === "invalid" && (
          <p role="alert" className="invalid">{verify.message}</p>
        )}
        {verify.phase === "failed" && <Failure state={verify} />}
        {verify.phase === "refused" && <Refusal state={verify} />}
        {verify.phase === "verified" && "checks" in verify.data && verify.data.checks && (
          <div role="status">
            <table className="vault-table">
              <caption className="meta">
                One line per check, in the order they were run.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Check</th>
                  <th scope="col">Result</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {verify.data.checks.map((c) => (
                  <tr key={c.name}>
                    <th scope="row">{c.name}</th>
                    <td>
                      <span aria-hidden="true">
                        {c.result === "PASS" ? "✓" : c.result === "FAIL" ? "✗" : "–"}
                      </span>{" "}
                      {c.result}
                    </td>
                    <td className="meta">{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {verify.data.stored_sha256 && (
              <p className="meta">
                stored {verify.data.stored_sha256} · computed{" "}
                {verify.data.computed_sha256}
              </p>
            )}
            {verify.data.note && <p className="meta">{verify.data.note}</p>}
          </div>
        )}
      </section>

      <p className="meta hosting-note">
        playbook_status DRAFT — the vault&rsquo;s classifier and clause rules are not lawyer
        approved. Model hosting: UAE North; no client document may be sent there.
      </p>
    </>
  );
}
