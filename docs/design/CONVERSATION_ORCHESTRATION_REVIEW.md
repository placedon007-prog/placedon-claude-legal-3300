# Conversation orchestration and UX review

**Review date:** 13 October 2026
**Scope:** `conversation.send` through the model/retrieval path and the `/app` conversation screen.
**Evidence checked:** frontend branch `codex/lexis-imanage-ui`; backend branch `codex/lexis-imanage-foundation`; gateway source, provider adapters, orchestration code, and current conversation UI. This is a code review, not a claim that production deployment or vendor licensing is complete.

## Executive recommendation

Keep the conversation answer path narrow and evidence-led. Improve user understanding by showing the recorded model and processing region on demand, sourced from the existing run trace. Do not add another chat model, expose internal routing controls, or connect Voyage to the answer path until a measured retrieval bake-off and data-use checks justify it.

The clearest architectural problem is not that every adapter is pointless. It is that the repository contains several layers with different maturity: the gateway’s conversation route is live code, while `agents/runtime.py` and fixed plans in `agents/plans.py` form a separately tested orchestration prototype that is not the conversation request executor. Keeping those two pathways visually and operationally distinct will reduce confusion and prevent accidental duplicate orchestration.

## What runs for a conversation question

1. The browser calls the Next.js server action `sendAction`; the gateway key remains server-side.
2. `conversation.send` validates the request, deduplicates it using the request ID and payload digest, reserves the user/assistant turn, and either dispatches immediately or submits bounded queued work.
3. Intake classifies the task with rules. A supported research question is dispatched to `ask` / `agents.research_question`; unsupported intents abstain by name.
4. `ask` resolves the explicitly selected sources. Only the held Companies Act corpus is currently connected as answer evidence. The Wall System may be searched for matches but is not yet grounding for this legal-research answer; external legal providers can be reported as not searched or unavailable.
5. Deterministic retrieval selects statute sections. The narration model receives cleared public statute text and produces prose. Each sentence is checked against quoted spans; unsupported sentences are dropped. Citations are re-read through the citation endpoint when opened.
6. The gateway stores the run and returns an envelope plus source-selection/search outcomes. The UI distinguishes an answer, partial answer, abstention, queued work, and transport failure. A failure is not presented as a legal conclusion.

## Provider and API inventory

| Provider / adapter | API evidenced in the repository | Current role in conversation | Data boundary / status |
|---|---|---|---|
| Azure AI | Azure-hosted OpenAI-compatible `POST /openai/v1/chat/completions`; deployments include Llama 3.3 70B and GPT-5 mini | Narration route / fallback for public corpus text; not a direct OpenAI ChatGPT API call | Endpoint region is recorded. Azure’s configured evaluation resource is UAE North; client data is blocked unless the region gate permits it. |
| Amazon Bedrock | AWS SDK `converse` operation, using configured inference profiles | Preferred narration provider for approved client-data paths when its India-region profile is ready | The adapter validates the profile’s India regions. Access/readiness can refuse before a model call. |
| Gemini / Vertex AI | Gemini `generateContent`; Google AI Studio and Vertex endpoint code exist | Classification/OCR and limited public-text fallback paths; not the default conversation model | Availability depends on selected provider/task and privacy gates; do not imply every conversation uses Gemini. |
| Anthropic | Adapter code exists for Anthropic API | Router knowledge and candidate path; gateway `SERVEABLE` excludes it today | Do not say Claude is serving the conversation unless the run trace proves it. |
| Voyage AI | `POST /v1/embeddings` and `POST /v1/rerank` | Retrieval candidates only; not selected by the router and not in the answer-generation path | Current code documents public-text-only intended use and unresolved opt-out/retention preconditions. No user document or prompt caller was found. |
| Sarvam | Document AI digitise job API plus status/results polling | OCR candidate, not the current preferred OCR route and not conversation narration | Adapter documents material retention/training concerns; do not send client files without approved controls. |
| Ollama | Local generation endpoint | Explicitly named local fallback for selected high-consequence extraction; not an automatic conversation provider | Must be explicitly configured and must not resolve to a cloud-tagged model. |
| “Serum” | No matching provider/API was found in the reviewed repositories | Unknown | This may mean SerpAPI or another service; no connector should be planned until identified. |
| ChatGPT / OpenAI | No direct OpenAI API client or `api.openai.com` call was found in the reviewed backend paths | Not directly connected | GPT-5 mini is configured behind Azure’s OpenAI-compatible endpoint; that is distinct from a direct OpenAI/ChatGPT account integration. |

Provider adapters are not the same as active routes. The router’s candidate table lists Voyage and Sarvam separately from preferred routes, and the current gateway callable set is narrower than the full provider inventory. Never infer that a provider handled a turn from the model roster; use that run’s trace.

## Orchestration harness: what is real and what is prototype

### Active conversation orchestration

- Deterministic intake maps to declared tasks; it does not let a model invent a workflow.
- The gateway chooses synchronous work or a durable queue. The queue has an interactive lane, bounded depth, idempotent reservation, leases, retry/backoff, cancellation boundaries, and a terminal dead-letter state.
- The research cascade treats provider busy/rate-limit outcomes as availability events and verifier rejection as a separate correctness event. It does not count an outage as a bad answer or silently turn a transport error into a refusal.
- Retrieval and verification are separate from narration. The model phrases already-selected evidence; code validates sentences and records provenance.
- Run trace records status, capability, model/provider, region, cost and why a cost is unknown. This is the source for the UI provenance disclosure.

### Prototype / confusing seams

- `agents/plans.py` declares fixed step templates, and `agents/runtime.py` executes an injected model with a `MemoryStore`. The runtime explicitly says live provider wiring and a durable store are separate work. It is not the implementation called by `conversation.send` today.
- `agents/multi_supervisor.py` is used by the separate `research.multi` verb; it is not the ordinary one-question conversation path.
- The repository therefore has multiple orchestration vocabularies. Do not delete these modules merely because the conversation path does not import them: tests and other verbs may depend on them. First label the lifecycle and consumers in architecture docs, then measure import/call reachability before any removal.
- The “deterministic” cascade rung is currently a recorded no-op for legal-answer prose; deterministic code retrieves and verifies, but does not produce the final explanatory prose. The interface should not imply a deterministic answer was generated.

## User and engineering questions to resolve

### User questions

1. When a user selects a source, do they understand that selection is not proof it was searched or cited?
2. Can a lawyer quickly tell which legal text was actually used, which selected sources were not searched, and why?
3. Should users see the model and processing region in the answer view, in a disclosure, or only in an audit view? Recommendation: disclosure, sourced from the run trace.
4. If the Wall System is selected, does the interface clearly state whether a file was merely attached, read, or actually used as evidence?
5. What should a queued answer say after a provider outage or queue delay so the lawyer can safely decide whether to wait or retry?
6. Are there distinct workflows for research, document review, contract review, and drafting that need explicit user selection rather than an opaque classifier?

### Engineering and risk questions

1. Which provider/model/region actually served a turn, and is the trace persisted consistently on both inline and queued paths?
2. Can an outage, rate limit, timeout, queue saturation, or retry ever become “no legal evidence” in user-visible state? Tests must keep transport and legal abstention separate.
3. Are request IDs and payload digests stable across retries so retry does not duplicate work or change selected files/sources?
4. Can client text or Wall System content reach Voyage, Gemini free tier, or Azure outside approved residency/retention settings? Current intent is to block that; verify each entry point and test the negative path.
5. Which code is active, candidate-only, test-only, or prototype? Before deleting functions, produce a call graph and prove no route, worker, test, CLI, or MCP tool relies on them.
6. Are model usage and billing telemetry trustworthy under retries? `cost_inr: null` is unknown/unpriced, not zero; show its reason if surfaced.
7. What throughput target and tenant fairness limits should bound the queue? Current constants are guards, not evidence of production capacity.

## Proposed improvement and implementation plan

### Implemented in this change

1. Add an authenticated, schema-validated server action that reads only the run trace for a supplied run ID and returns a reduced set of display fields.
2. Add a lazy “Model and processing” disclosure inside the existing answer trace. Load on the user’s first open; do not add background requests or poll when the answer is complete.
3. Show provider/model and recorded region only when the run trace has those values. If no model ran, say “No model call was recorded.” If trace retrieval fails, say the details are unavailable; never infer or substitute a provider.
4. Show costs only with accurate wording: a numeric provider-reported price when present, otherwise “Not priced” with the recorded reason. Never render null as ₹0.
5. Keep answer prose, citations, source searched/not searched records, and model trace as separate concepts.
6. Allow a deliberate retry if loading run details fails. Keep the shared result line relevant: show draft playbook status only for contract review, and avoid static “test documents only” text on every answer.

### Next phases

**P1 — Make the workflow legible.** User-test source selection, file attachment/read/use distinctions, task choice, queue waiting, retry/recovery, and the new provenance disclosure. Target: a lawyer can answer “what did it search?” and “where did the model run?” without opening a technical run page.

**P2 — Simplify the architecture map.** Maintain an inventory with ACTIVE, CANDIDATE, PROTOTYPE, and UNUSED-with-proof states. Trace imports and entry points before retiring any function. Reconcile `agents/runtime.py` / `agents/plans.py` with the production gateway pipeline in documentation; do not merge them until a migration can preserve persistence and legal-state invariants.

**P3 — Protect reliability under load.** Load-test accepted queue depth, tenant fairness, concurrency, lease duration, retry storms, duplicate request delivery, slow provider response, and dead-letter recovery. Add metrics for queue age/depth, provider latency/rate-limits, failure class, trace completeness, and cost gaps. Keep provider timeouts shorter than worker lease or renew leases.

**P4 — Retrieval and connector governance.** Keep Voyage disabled in the answer path until the frozen retrieval evaluation shows a statistically supported improvement over BM25+MiniLM and privacy/retention terms are approved. Treat LexisNexis and iManage as unavailable until licensing/API credentials and contract terms are validated. Do not forward Wall System documents to any connector by default.

**P5 — Security and data tests.** Add negative tests for tenant/matter boundary crossing, untrusted instructions in attached documents, prompt injection, provider region mismatch, provider credential redaction, oversized input, rate limiting, and all provider outage states. Run security review on the queue and source/file path before production launch.

## Simulation / verification matrix

The safe simulation uses the repository’s fake transports, in-memory queue, and gateway fixtures; it sends no paid provider calls and uses no client data.

| Scenario | Expected backend state | Expected conversation behavior |
|---|---|---|
| Held corpus selected, provider succeeds, citations verify | Answer/partial with run trace | Show answer and citations; lazy trace reports exact provider/model/region recorded. |
| Held corpus not selected | Abstained; no model call | Say nothing was read from the held law; show selected sources and “not searched” accurately. |
| Provider busy / rate limited | Try permitted next route or named refusal | Keep this separate from “no evidence”; show run outcome, not a false legal conclusion. |
| Provider timeout / transport error | FAILED | “Did not arrive”; retry/recover same request; no refusal language. |
| Queue full | BUSY before reservation | Explain request was not submitted; do not show a queued turn. |
| Source trace endpoint unavailable | Answer remains unchanged | Provenance details show unavailable; answer and citations still render. |
| Trace endpoint recovers after a temporary failure | Answer remains unchanged | User can choose “Try again”; no automatic retry loop is started. |
| Run has no provider/model fields | Trace is valid with empty model details | Say no model call was recorded; never fill in a configured/default model. |
| Run cost is null | Unknown/unpriced with note | Never show ₹0. |

## Three review passes / self-critique

1. **Correctness:** Does the UI report observed trace values rather than configured defaults? Is “no model” distinct from a trace read failure? Does it preserve source-search and citation semantics? This design requires those distinctions.
2. **Security and load:** Does it add provider credentials or send user content? No. Does it create background polling or call the trace endpoint before a deliberate user action? No. The server action rechecks session, validates the ID, and returns only display fields.
3. **Usability and accessibility:** Is the main answer still uncluttered? Yes; the details are nested in the existing disclosure. Is it keyboard operable and understandable without color? Use native disclosure semantics, visible text labels, and explicit loading/unavailable states.

## Acceptance checks

- Lint, strict typecheck, unit tests, production build.
- Test lazy load, repeated activation/single-flight, unavailable response, no-model trace, and null cost rendering.
- Inspect 360px and desktop widths; keyboard open/close; reduced-motion remains unaffected.
- Confirm backend `run.trace` response shape against the gateway schema and the mock fixture.
- Push a reviewable GitHub branch/PR; deployment checks are reported separately from code checks.

## Verification performed

- Frontend test suite: 119 passed; lint, strict typecheck, and production build passed on the isolated branch from `main`.
- Browser simulation used the recorded synthetic Section 96 fixture. At 360px, opening the trace and loading details on demand displayed the fixture's recorded `azure` provider, `azure/llama-3-3-70b` model, `UAE North` region, `PARTIAL` step status, and ₹0.07 price. There was no horizontal overflow and no browser console error. This is a UI contract check, not a live legal answer or provider call.
- Production dependency audit (`npm audit --omit=dev`) reported zero advisories. The full development dependency tree reported 10 high-severity advisories during install; they are pre-existing dependency findings outside this feature and were not auto-upgraded here.
- PR #17 is mergeable, but its Vercel check currently fails because the Vercel account deployment is blocked. The local production build passed; GitHub's deployment status is not represented as passing.
