# PlacedOn Product Expansion Plan

**Date**: 2026-11-18
**Status**: DRAFT — awaiting founder review
**Scope**: 11 practice areas, multilingual (22 Indian languages), Word add-in, contract redlining, legal translations, model routing

---

## 0. What We Have Today

Before the plan, the inventory — because every expansion decision depends on what already exists.

**Backend** (`placedon-law-backend`):
- `checker/scope.py`: 14 bodies of law declared. Only **CA2013** is `IN_CORPUS` (527 sections held). SEBI LODR is `CURRENT_ONLY` (consolidated text, no history). The rest (LLP, SEBI other, FEMA, IBC, Competition, Contract Act, Arbitration Act, Stamp, DPDP) are `DECLARED` — the engine knows they exist and refuses them by name.
- `checker/anthropic_model.py`: Three-tier Claude model (Opus for extraction, Sonnet for narration, Haiku for classification). Character-level citation provenance via `CitationCharLocation`.
- `checker/gemini_model.py`: Gemini Flash for OCR/page reading (86.3 chrF++ on real Devanagari scans vs Claude's 82.2). Free-tier, zero SDK dependency (raw `urllib`).
- `gateway/circuit.py`: Per-provider circuit breaker. CLOSED → OPEN (3 consecutive failures) → HALF_OPEN (one trial). Open breaker yields `PROVIDER_CIRCUIT_OPEN`, outcome `FAILED` — never `NOT_FOUND`.
- `gateway/verbs.py`: Single verb table generates REST routes, MCP tools, and CLI.
- `addin/`: Working Word add-in skeleton. Reads document text + date, sends to backend, annotates via Comments API only. Never modifies document body.

**Frontend** (`placedon-claude-legal-3300`):
- Practice area selector in sidebar (11 areas, 3 available, 8 coming soon). `src/lib/practice-areas.ts` + `src/app/app/practice-selector.tsx`.
- Conversation layer (C2): `POST /v2/conversation/send`, `GET /v2/conversation/{id}`, `POST /v2/citation`.
- Contract review: `POST /v2/review-contract`, `GET /v2/runs/{run_id}`, `GET /v2/runs/{run_id}/trace`.
- Source panel with citation verification, section display with passage marking.

---

## 1. Practice Area Expansion

### 1a. The Mapping: Practice Area → Bodies of Law → Acquisition Work

Each practice area is a **routing label** that selects which bodies of law the engine queries. The backend authority is `checker/scope.py`. A practice area can answer questions only against bodies that are `IN_CORPUS`.

| Practice Area | Bodies Required | Current Status | Acquisition Work |
|---|---|---|---|
| **Corporate** | CA2013 | IN_CORPUS | Done. Add delegated rules (3 remain unresolved). |
| **Due Diligence** | CA2013 + SEBI LODR + IBC + FEMA | CA2013 held; rest DECLARED or CURRENT_ONLY | SEBI LODR → wire obligations. IBC/FEMA → acquire instruments. |
| **Transactions** | CA2013 + Contract Act + Stamp Act + FEMA | CA2013 held; rest DECLARED | Contract Act = 266 sections, clean text, low acquisition cost. Stamp = 25+ State variants. |
| **Capital Markets** | SEBI Act + SEBI LODR + SEBI ICDR/SAST/PIT + Companies Act Ch III–IV | LODR is CURRENT_ONLY; ICDR/SAST/PIT DECLARED | SEBI regulations are natively text PDFs. Acquisition route is straightforward. |
| **Banking & Finance** | RBI Act + SARFAESI + Banking Reg Act + NHB Act | None declared | New corpus. RBI circulars are web-published but change frequently. |
| **Disputes** | Contract Act + Limitation Act + Specific Relief Act | Contract Act DECLARED | Limitation Act is 137 sections. Specific Relief is 42 sections. Small corpora. |
| **Litigation** | CPC 1908 + BSA 2023 (Evidence) + Limitation Act | None declared | CPC is 158 sections + 51 Orders. BSA 2023 replaces Indian Evidence Act. Large but structured. |
| **Arbitration** | Arbitration Act 1996 + Contract Act | Arb Act DECLARED | 86 sections. Cross-references to CPC must be mapped. |
| **In-House** | All of the above, routed by company profile | Depends on above | No new corpus — routes to whichever body matches the question. |
| **Advisory** | All of the above + cross-instrument reasoning | Depends on above | Multi-instrument opinion engine. Hardest feature to build correctly. |
| **Real Estate** | RERA 2016 + Transfer of Property Act + Registration Act + State stamp laws | None declared | RERA has State-level variations (each State regulator). Federal act is 92 sections. |

### 1b. How Acquisition Works (the algorithm)

This is the pipeline that turns a statute into something the engine can answer questions against:

```
1. LOCATE the authoritative source
   ├─ Gazette of India (for central Acts, rules, notifications)
   ├─ SEBI/RBI/IBBI website (for regulator-made instruments)
   └─ State Gazette (for State amendments, stamp schedules)

2. ACQUIRE the text
   ├─ If natively text PDF → extract with pdftotext, preserve section numbers
   ├─ If scanned/image PDF → OCR pipeline (see §3b)
   └─ If HTML on regulator site → scrape with structure preservation

3. STRUCTURE into sections
   ├─ Parse section boundaries (regex: "^(\d+[A-Z]?)\.\s")
   ├─ Parse sub-section boundaries ((1), (2), (a), (b))
   ├─ Map cross-references ("Section 185 of the Companies Act")
   └─ Tag each section with its amending history (which notification changed it, when)

4. HASH-STAMP each section
   ├─ SHA-256 of the canonical text
   ├─ Record the source document (Gazette notification number, date)
   └─ This is the provenance anchor — every answer traces back to this hash

5. REGISTER in scope.py
   ├─ Move from DECLARED → IN_CORPUS
   ├─ Wire obligations (what this section requires, who it applies to, deadlines)
   └─ The test suite asserts no obligation exists for a body not IN_CORPUS

6. TWO-HUMAN-CHECK
   ├─ A second person verifies the acquired text against the source document
   ├─ Signs off on the hash-stamp
   └─ This is non-negotiable — a wrong section number is a wrong legal answer
```

### 1c. Build Order (by dependency and revenue impact)

**Phase 1 (Q1 2027)**: Corporate (complete remaining rules) + Due Diligence (wire SEBI LODR obligations + acquire IBC) + Transactions (acquire Contract Act + Stamp Act federal)
- These three are the most asked-for by in-house counsel
- Contract Act and IBC are small, clean corpora
- Stamp Act federal is 60 sections; State variants are Phase 3

**Phase 2 (Q2 2027)**: Capital Markets (acquire SEBI ICDR/SAST/PIT) + Banking & Finance (acquire RBI Act + SARFAESI) + Disputes (Limitation Act + Specific Relief Act)
- SEBI regulations are well-structured text PDFs
- RBI circulars need a feed-based acquisition (they change monthly)

**Phase 3 (Q3 2027)**: Litigation (CPC + BSA 2023) + Arbitration (Arb Act) + Real Estate (RERA + TPA)
- CPC is the largest corpus (158 sections + 51 Orders with sub-rules)
- RERA has State variations — start with Maharashtra, Delhi, Karnataka

**Phase 4 (Q4 2027)**: In-House (routing layer) + Advisory (multi-instrument reasoning)
- These are features, not corpora — they layer on top of everything above

### 1d. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Gazette PDFs are scanned images, not text | OCR errors propagate into the corpus, producing wrong section text | Gemini Flash OCR (best on Devanagari scans per benchmark) + two-human-check |
| State-level variations (Stamp, RERA) | A "national" answer is wrong by construction | Refuse State-specific questions until State variant is held. `scope.py` already supports this — `STAMP` body note says "must be State-qualified or refused" |
| Cross-references between Acts | A section in IBC references Companies Act definitions — engine must follow | Build a cross-reference index during structuring (step 3). Query expansion includes referenced sections. |
| Amending notifications arrive faster than acquisition | Corpus goes stale | RSS/Atom feeds where available (SEBI has one: `sebi.gov.in/sebirss.xml`). Manual check monthly for others. |

### 1e. Testing

- **Corpus integrity test**: For every section in the corpus, `hash(text) == stored_hash`. Runs on every deploy.
- **Obligation coverage test**: Every obligation references a body that is `IN_CORPUS`. Already exists in `scope.py`.
- **Refusal test**: A question about a `DECLARED` body gets a named refusal, never an answer. Write 10 questions per declared body.
- **Cross-reference test**: For every cross-reference in the index, the target section exists in the corpus.

---

## 2. AI Legal Research — The RAG Pipeline

### 2a. How It Works Today

```
User question
  → conversation.send (gateway, authenticated)
    → extract entities (which Act, which section, what date)
    → retrieve relevant sections from corpus (by entity match)
    → LLM generates answer WITH citations (Claude Opus, citations:enabled)
    → reasoning.review() validates every cited span is IN THE DOCUMENT
    → drops sentences where the span is not found
    → returns answer with verified citations
```

This is not a general RAG system. The corpus is a closed, hash-stamped set of statutory text. Retrieval is entity-based (which Act, which section), not vector-similarity-based.

### 2b. What Changes for Multi-Practice-Area

The current retriever knows Companies Act sections. For 11 practice areas, retrieval must handle:

**Problem**: A question like "What are the board composition requirements for a listed company?" touches CA2013 (Section 149) AND SEBI LODR (Regulation 17). The retriever must search across multiple bodies.

**Algorithm — Hybrid Retrieval**:

```
1. ENTITY EXTRACTION (which bodies of law, which sections, what date)
   ├─ Rule-based: regex for section numbers, Act names, abbreviations
   ├─ LLM-assisted: for natural language ("board composition" → CA2013 s.149 + SEBI LODR Reg 17)
   └─ Practice area context narrows the search space

2. KEYWORD SEARCH (BM25)
   ├─ Why: exact section numbers, specific terms ("Section 185"), threshold amounts
   ├─ BM25 on the section-level index
   └─ Returns top-k sections by keyword relevance

3. SEMANTIC SEARCH (vector)
   ├─ Why: conceptual matching ("related party" → s.188, Reg 23)
   ├─ Embedding: legal-domain model (InLegalBERT or fine-tuned e5-large)
   ├─ Index: section-level chunks in a vector store
   └─ Returns top-k sections by cosine similarity

4. MERGE + RERANK
   ├─ Union of BM25 and vector results
   ├─ Reciprocal Rank Fusion (1/(k+rank)) to combine scores
   └─ Rerank with cross-encoder if the merged list exceeds 20 sections

5. DATE FILTER
   ├─ The corpus is bitemporal — each section has an "in force from" date
   ├─ Filter to sections in force on the query date
   └─ This is PlacedOn's core differentiator: "what did the law say on date X?"

6. GENERATION + GROUNDING
   ├─ Claude Opus with citations:enabled
   ├─ Receives only the filtered, ranked sections as context
   ├─ reasoning.review() checks every quoted span
   └─ Drops ungrounded claims
```

**Why hybrid?** [Multiple sources](https://www.vaquill.ai/blog/how-ai-legal-research-works-rag) confirm that vector search alone misses exact section numbers and specific legal terms. BM25 catches "Section 185" exactly; vectors catch "loans to directors" conceptually. [Stanford RegLab](https://arxiv.org/pdf/2405.20362) found that even with RAG, leading legal tools hallucinate on 1 in 6+ queries — the grounding step (checking citations against the actual document) is what closes this gap.

### 2c. Embedding Strategy

| Option | Size | Legal Performance | Self-Hosted Cost |
|---|---|---|---|
| InLegalBERT | 110M params | Trained on Indian legal text | CPU-feasible |
| e5-large-v2 | 335M params | General but strong on retrieval benchmarks | 1 GPU (A10G) |
| Voyage Law-2 | API-only | Purpose-built for legal | $0.12/M tokens |

Recommendation: Start with InLegalBERT (CPU, zero API cost, Indian legal domain). Benchmark against e5-large. Migrate only if retrieval quality demands it.

### 2d. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Hallucination in generated answers | Wrong legal advice delivered to in-house counsel | Grounding check is mandatory. `reasoning.review()` drops ungrounded sentences. Never claim an accuracy rate. |
| Retrieval misses a relevant section | Answer is correct but incomplete | Multi-body retrieval + practice area routing ensures cross-Act coverage. Test with curated question sets per practice area. |
| Stale corpus | Answer cites repealed or amended text | Bitemporal model catches this for dated queries. For "current" queries, corpus freshness SLA: monthly check against official sources. |
| Embedding model doesn't understand Indian legal terms | "Charge" (Companies Act) ≠ "charge" (criminal law) | Fine-tune embedding model on Indian legal text. Use the [MILPaC benchmark](https://dl.acm.org/doi/10.1145/3748313) for evaluation. |

### 2e. Testing

- **Retrieval quality**: Curate 50 questions per practice area with known relevant sections. Measure Recall@10 and MRR. Target: Recall@10 ≥ 0.9.
- **Grounding accuracy**: For every answer, verify that every cited span exists in the source section. This is already automated in `reasoning.review()`.
- **Hallucination detection**: Use the [citation hallucination benchmark](https://arxiv.org/abs/2606.21155) (1,300 excerpts with injected citation errors, taxonomy from real court filings). GPT-5 reaches 84.4% recall in agentic framework; content misrepresentation is hardest to detect.
- **Regression suite**: Golden answers for 20 questions where the answer changed due to an amendment. Verify the engine gives the correct answer for both the pre-amendment and post-amendment dates.

---

## 3. Multilingual Legal Processing (22 Indian Languages)

### 3a. The 22 Languages and Their Status

The Eighth Schedule lists: Assamese, Bengali, Bodo, Dogri, Gujarati, Hindi, Kannada, Kashmiri, Konkani, Maithili, Malayalam, Manipuri, Marathi, Nepali, Odia, Punjabi, Sanskrit, Santali, Sindhi, Tamil, Telugu, Urdu.

**Reality check**: Most Indian statutes exist in English and Hindi. Some exist in a few other languages. Most do NOT exist in all 22. [MILPaC benchmark](https://dl.acm.org/doi/10.1145/3748313) confirms: "many Indian Acts exist in English and Hindi but few exist in other Indian languages."

### 3b. The Pipeline — End to End

```
INPUT: Document in language X (PDF, image, or text)

STAGE 1: LANGUAGE DETECTION
├─ Script detection (Devanagari, Bengali, Tamil, etc.)
├─ Language classifier within script family (Devanagari → Hindi vs Marathi vs Sanskrit)
└─ Confidence threshold: below 0.85 → ask the user

STAGE 2: OCR (if scanned/image)
├─ For Devanagari: Gemini Flash (86.3 chrF++ on real handwritten legal docs)
│   Source: arXiv 2512.18004, tested on Marathi legal documents
├─ For other scripts: Tesseract 5 with script-specific models + Gemini Flash fallback
├─ Layout analysis FIRST: detect multi-column, tables, stamps, seals
│   Problem: "long, multi-column legal layouts confuse OCR segmentation,
│   so extracted text often needs manual reordering" (MILPaC)
├─ Post-OCR error correction: legal dictionary + n-gram language model
└─ Output: structured text with section boundaries preserved

STAGE 3: SECTION BOUNDARY EXTRACTION
├─ Regex patterns per language for section numbering
│   Hindi: "धारा (\d+)" or "अनुच्छेद (\d+)"
│   English: "Section (\d+)" or "s\.(\d+)"
├─ Fallback: LLM-based boundary detection for non-standard formatting
└─ Output: list of (section_number, text, language) tuples

STAGE 4: TRANSLATION (if not English)
├─ Primary: IndicTrans2 (MIT license, all 22 languages)
│   Model: ai4bharat/indictrans2-indic-en-1B (1.2B params)
│   Fine-tuned variant: InLegalTrans-En2Indic-1B (legal domain, QLoRA, JUST-NLP 2025)
│   Hardware: A10G (24 GB VRAM), or 200M distilled model for lower latency
├─ Legal terminology overlay:
│   Problem: generic translators miss legal terms ("दाय" ≠ "gift", it's "bequest")
│   Solution: post-translation dictionary lookup for 2000 core legal terms per language
│   Source: compile from existing bilingual legal glossaries + manual curation
├─ Fallback: Gemini Flash (free tier) for languages where IndicTrans2 quality is poor
└─ Output: English text with alignment back to source language spans

STAGE 5: PROCESS IN ENGLISH (the existing pipeline)
├─ Entity extraction, retrieval, generation, grounding — all in English
├─ Citations reference the English-translated text
└─ The source panel shows both English and original language side by side

STAGE 6: TRANSLATE BACK (for user-facing output)
├─ Answer text: IndicTrans2 En→Indic
├─ Legal citations: NOT translated (section numbers are language-independent)
├─ Confidence annotation: low-confidence translations are marked with ⚠
└─ User can toggle between English and translated view
```

### 3c. Why Not Translate the Entire Corpus Upfront?

Because of the two-human-check requirement. Every translated section would need verification by a person fluent in both the target language and Indian legal terminology. For 22 languages × 527 CA2013 sections alone, that's 11,594 verification tasks. The on-demand translation pipeline translates the retrieved sections at query time, keeping the verification burden manageable.

### 3d. OCR Error Propagation — The Biggest Risk

[arXiv 2512.18004](https://arxiv.org/abs/2512.18004) ("Seeing Justice Clearly") studied handwritten Marathi legal documents and found:
- Two-stage OCR-then-translate pipelines compound mistakes
- OCR errors degraded translation quality
- Translation models produced incoherent or mixed-language output from noisy OCR text
- Vision-language models (direct image→English) sometimes outperformed the two-stage pipeline

**Mitigation**:
1. Use Gemini Flash for Devanagari (best benchmark score on real scans)
2. For other scripts, run TWO OCR engines and diff the results — disagreements go to human review
3. Post-OCR spell checking against a legal dictionary per language
4. For handwritten documents, offer the VLM path (Gemini 2.5 Pro image→English) as an alternative
5. NEVER silently pass OCR output through — confidence scores on every extracted section, flagged sections go to review queue

### 3e. IndicTrans2 Deployment

| Variant | Params | VRAM | Latency (est.) | Quality |
|---|---|---|---|---|
| indictrans2-indic-en-1B | 1.2B | ~6 GB | ~2s per paragraph | Best |
| indictrans2-en-indic-dist-200M | 200M | ~1 GB | ~0.3s per paragraph | 90-95% of 1B |
| Krutrim Translate | Unknown | API | Claims 4x faster than IndicTrans2 | Vendor claim, unverified |

Recommendation: Start with the 200M distilled model for latency. Benchmark against 1B on a legal test set. Upgrade if quality gap is measurable on legal terms.

**Hardware**: One A10G (24 GB) on Azure (Hyderabad, same region as the backend). Serves both OCR and translation. Estimated cost: ~$0.80/hr on-demand, ~$0.30/hr reserved.

### 3f. Testing

- **OCR accuracy**: Use [GlotOCR Bench](https://arxiv.org/pdf/2604.12978) for multi-script evaluation. Build a 100-page test set of real Indian legal documents (10 per major script).
- **Translation quality**: Use [MILPaC benchmark](https://dl.acm.org/doi/10.1145/3748313) (purpose-built for Indian legal translation evaluation). Measure chrF++ and BLEU per language pair.
- **End-to-end**: Take 20 legal questions in Hindi, Bengali, Tamil, Marathi, Telugu. Run the full pipeline (OCR if from image → translate → retrieve → answer → translate back). Compare answers to English-only pipeline on the same questions. Answers should be semantically identical.
- **Legal terminology**: Curate a glossary of 200 high-stakes legal terms per language. Verify translation accuracy. Zero tolerance for terms where mistranslation changes legal meaning (e.g., "void" vs "voidable").

---

## 4. Contract Redlining & Drafting

### 4a. How the Algorithm Works

Contract redlining is NOT general-purpose document editing. It is a structured pipeline that compares a contract against a **playbook** (the company's standard positions) and flags deviations.

```
INPUT: Contract document (PDF, DOCX, or text) + Company playbook

STAGE 1: DOCUMENT INGESTION
├─ DOCX: python-docx extraction preserving paragraph boundaries
├─ PDF text: pdftotext with layout preservation
├─ PDF image: OCR pipeline from §3b
└─ Output: list of paragraphs with positions

STAGE 2: CLAUSE BOUNDARY EXTRACTION
├─ Problem: contracts don't have clean section numbers like statutes
├─ Signals: numbered paragraphs, heading styles, indentation changes,
│   keywords ("WHEREAS", "NOW THEREFORE", "Indemnification", "Termination")
├─ Algorithm:
│   1. Rule-based: regex for numbered clauses (1.1, 1.1.1, (a), (i))
│   2. Style-based: bold/underline headings in DOCX metadata
│   3. LLM fallback: for unstructured contracts, ask Claude to identify boundaries
│   4. Merge: combine signals, resolve conflicts (rule-based wins when clear)
└─ Output: list of (clause_id, clause_text, clause_heading) tuples

STAGE 3: CLAUSE CLASSIFICATION
├─ Assign each clause a type from a fixed taxonomy:
│   indemnity, limitation_of_liability, termination, ip_ownership,
│   confidentiality, non_compete, governing_law, dispute_resolution,
│   force_majeure, assignment, warranty, representation, payment_terms,
│   data_protection, insurance, anti_bribery, compliance, boilerplate
├─ Method: Claude Haiku (classification tier) with few-shot examples
├─ Confidence threshold: below 0.8 → flag as "unclassified" for human review
└─ Evaluation: ACORD dataset (ACL 2025, 126K query-clause pairs) for benchmarking

STAGE 4: PLAYBOOK COMPARISON
├─ Each clause type has a playbook entry:
│   {
│     type: "indemnity",
│     acceptable: "mutual indemnity, capped at contract value",
│     red_flags: ["uncapped indemnity", "one-sided indemnity favouring counterparty"],
│     suggested_alternative: "Each party shall indemnify the other..."
│   }
├─ Comparison is LLM-based (Claude Sonnet):
│   "Compare this clause against the playbook. Is it: MATCHES, DEVIATES, MISSING?"
│   "If DEVIATES, what specifically deviates and why?"
├─ The LLM never decides the law — only whether the clause matches company standards
└─ Output: list of (clause_id, status, deviation_reason, suggested_edit)

STAGE 5: LEGAL BODY CHECK (new, PlacedOn-specific)
├─ For each flagged clause, check if it touches a DECLARED body of law
│   e.g., dispute resolution clause → Arbitration Act 1996 (DECLARED)
│   e.g., non-compete clause → Indian Contract Act s.27 (DECLARED)
├─ If the body is DECLARED (not held): flag as NEEDS_LAWYER
│   "This clause may be affected by the Indian Contract Act, 1872 (Section 27),
│    which we have declared but not yet acquired. A lawyer should review."
├─ If the body is IN_CORPUS: check the clause against the actual statute
│   "This non-compete exceeds what Section 27 permits"
└─ This is what makes PlacedOn's redlining different from commodity tools

STAGE 6: ANNOTATION
├─ In the web UI: inline annotations on the contract text
│   Status chips (MATCHES · DEVIATES · MISSING · NEEDS_LAWYER)
│   Suggested edits shown as diff (old text strikethrough, new text highlighted)
├─ In Word add-in: Comments API (Range.insertComment)
│   Each finding becomes a comment on the relevant text range
│   Comment text includes: status, deviation reason, suggested alternative
│   NEVER modify the document body
└─ Every result carries playbook_status: DRAFT until a lawyer approves the rules
```

### 4b. Playbook Management

The playbook is the company's standard — it is NOT a legal rule. A playbook entry says "we prefer mutual indemnity capped at contract value." The law says whether a clause is enforceable; the playbook says whether it matches what this company wants.

**Storage**: JSON files per company, versioned. Each entry has:
- `type`: clause taxonomy ID
- `acceptable`: description of acceptable language
- `red_flags`: list of patterns that trigger DEVIATES
- `suggested_alternative`: template text
- `approved_by`: who signed off on this playbook entry
- `approved_at`: when

**Default playbook**: A generic Indian corporate playbook ships as the default. Companies customize from there.

### 4c. Multilingual Contract Redlining

A contract in Hindi or Marathi goes through the translation pipeline (§3b) first. The clause extraction and playbook comparison happen in English. The annotations are translated back and shown alongside the original language text.

**The key problem**: clause boundaries in Indian-language contracts often don't follow English numbering conventions. Hindi contracts may use Devanagari numerals (१, २, ३) or Hindi keywords ("खंड", "उपखंड"). The boundary extraction regex set must be extended per language.

### 4d. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Clause boundary extraction fails on poorly formatted contracts | Clauses merged or split incorrectly → wrong classification | Multi-signal approach (regex + style + LLM). Confidence threshold. Human review queue for low-confidence extractions. |
| Playbook is too generic | DEVIATES on everything, alert fatigue | Default playbook is conservative. Per-company customization is the product. |
| LLM hallucinates a clause that doesn't exist | Phantom finding in the report | Every finding anchors to a specific text span. Grounding check verifies the span exists. |
| Indian-language clause boundary extraction | Devanagari numerals, Hindi legal terms | Build regex sets per language. Test on 20 real contracts per language. |
| Playbook says MATCHES but clause is legally void | Company relies on a clause that won't hold up | The Legal Body Check (Stage 5) catches this — if the relevant law is held, the engine checks. If DECLARED, it says "a lawyer should review." |

### 4e. Testing

- **Clause extraction**: 50 contracts (mix of well-formatted and poorly-formatted). Manually annotate clause boundaries. Measure precision and recall of extraction. Target: F1 ≥ 0.85.
- **Classification**: Use [ACORD dataset](https://aclanthology.org/2025.acl-long.1206.pdf) (126K query-clause pairs). Measure accuracy per clause type.
- **Playbook comparison**: 30 contracts with known deviations (manually reviewed by a lawyer). Measure: does the engine flag the same deviations? False positive rate? False negative rate on critical clauses (indemnity, liability cap, termination)?
- **End-to-end**: 10 contracts through the full pipeline. Compare output to a junior lawyer's review. The engine should catch everything the lawyer catches, plus flag NEEDS_LAWYER where it reaches a declared-but-unheld body.

---

## 5. Microsoft Word Integration

### 5a. Architecture

The add-in is an HTML/JS task pane that runs inside Word's webview. It communicates with PlacedOn's backend via HTTPS. The backend holds all credentials — the task pane never touches an API key.

```
┌─────────────────────────────────────────────────┐
│  Microsoft Word                                  │
│  ┌────────────────┐  ┌───────────────────────┐  │
│  │  Document       │  │  Task Pane (HTML/JS)  │  │
│  │                 │  │                       │  │
│  │  ← Comments API │  │  Office.js            │  │
│  │     (annotate)  │  │  ├─ Read body text    │  │
│  │                 │  │  ├─ Read properties    │  │
│  │  ← NEVER modify │  │  ├─ Insert comments   │  │
│  │     body text   │  │  └─ MSAL.js (SSO)     │  │
│  │                 │  │                       │  │
│  └────────────────┘  │  fetch() ──────────────│──┐
│                       └───────────────────────┘  │ │
└─────────────────────────────────────────────────┘ │
                                                     │ HTTPS
                                                     ▼
                                        ┌──────────────────────┐
                                        │  PlacedOn Backend     │
                                        │  (Azure App Service)  │
                                        │                       │
                                        │  /v1/document-check   │
                                        │  /v2/review-contract  │
                                        │  /v2/conversation/send│
                                        │                       │
                                        │  Credentials stay here│
                                        │  Audit log per call   │
                                        └──────────────────────┘
```

### 5b. What the Add-In Does

**Today** (existing skeleton in `addin/`):
1. Reads document body text and date (Office.js WordApi 1.1 for body, 1.3 for properties)
2. Sends text + date to `/v1/document-check`
3. Renders findings in the task pane
4. User can click a finding to insert a comment on the relevant text range (WordApi 1.5, `Range.insertComment`)

**Expansion** — three modes:

| Mode | Backend Route | What It Does |
|---|---|---|
| **Currency Check** | `/v1/document-check` | "Is this document's law still current?" — the existing feature |
| **Contract Review** | `/v2/review-contract` | Full redlining pipeline (§4a). Findings appear as comments. |
| **Ask** | `/v2/conversation/send` | Select text, ask a question about it. Answer appears in task pane. |

### 5c. How Comments Work (the only safe annotation method)

```javascript
// Find the text range that matches the finding's span
await Word.run(async (context) => {
  const body = context.document.body;
  const ranges = body.search(finding.clause_text.substring(0, 255), {
    matchCase: true,
    matchWholeWord: false,
  });
  ranges.load("items");
  await context.sync();

  if (ranges.items.length > 0) {
    const range = ranges.items[0];
    range.insertComment(
      `[${finding.status}] ${finding.deviation_reason}\n\nSuggested: ${finding.suggested_edit}`,
    );
    await context.sync();
  }
});
```

**Why comments and not highlights/formatting?** The `addin/taskpane.js` docstring explains: "font.highlightColor would be a real formatting edit — visible under Track Changes and in a version diff — and there is no overlay layer independent of the document object model, so comments are not one option among several. They are the only non-destructive one."

### 5d. Deployment

| Step | Method | Notes |
|---|---|---|
| Dev | Self-signed cert + localhost | Existing `serve.py` handles this |
| Staging | Azure Static Web App serving the task pane HTML | CDN-backed, CORS configured for Office.js origin |
| Production | M365 Admin Center sideload (enterprise) | XML manifest upload. Admin enables for the tenant. |
| Public | AppSource submission | Requires Microsoft review. 2-4 week process. |

**Manifest**: XML format (not JSON) for LTSC/on-prem compatibility. Existing `manifest.xml` declares `en-IN` locale, WordApi 1.3 minimum, `ReadWriteDocument` permission.

### 5e. Latency Problem

[Multiple practitioners report](https://helion360.com/blog/how-i-built-ai-powered-features-into-microsoft-word-and-excel) that API latency inside an Office task pane feels slower than in a web app. The task pane is a webview, and each call goes through the Office.js proxy layer.

**Mitigation**:
1. Show a progress indicator immediately on click (before the API call)
2. Stream the response — the task pane renders findings as they arrive, not after the full response
3. Cache the document text in the pane's session — don't re-read the entire document on every action
4. Prefetch: when the user opens the pane, start reading the document in the background

### 5f. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| User sends a privileged document to the backend | Data sovereignty concern | Backend is in Hyderabad (Azure). Document text is ephemeral (session-only, `checker/session.py`). No persistent storage of document content. |
| Task pane loses connection mid-review | Partial results, confused state | Store review run_id in sessionStorage. On reconnect, poll `GET /v2/runs/{run_id}` to restore state. |
| Comment count explosion on a 50-page contract | Unusable document | Cap at 50 comments per review. Group minor findings into a single summary comment. |
| LTSC / older Word versions don't support WordApi 1.5 | Comments API unavailable | Graceful degradation: show findings in the task pane only, with a message "Upgrade Word to annotate directly." |

### 5g. Testing

- **Unit**: Office.js mock (`@testing-library/office-addin-mock-helpers`). Test that findings correctly map to comment insertions.
- **Integration**: Sideload in Word desktop + Word Online. Run a known contract through the review. Verify comments appear on correct ranges.
- **Latency**: Measure time from button click to first finding rendered. Target: < 5s for a 10-page contract (time to first finding, not full review).
- **Offline resilience**: Disconnect network mid-review. Verify the pane shows an error (not an abstention) and recovers on reconnect.

---

## 6. Legal Translations

### 6a. What "Legal Translation" Means Here

Three distinct features, each with different requirements:

| Feature | Input | Output | Accuracy Requirement |
|---|---|---|---|
| **Document translation** | A legal document in language X | Same document in language Y, preserving structure | High — a mistranslated clause changes its meaning |
| **Answer translation** | An English answer from the RAG pipeline | Same answer in the user's language | Medium — user can toggle to English |
| **Corpus translation** | English statute text | Translated text for display alongside English | Low priority — reference only, English is authoritative |

### 6b. The Translation Pipeline

```
INPUT: Text in language X, target language Y

1. SEGMENT
   ├─ Split into sentences (not paragraphs — translation quality drops on long inputs)
   ├─ Preserve section numbers, dates, amounts (do not translate these)
   └─ Tag legal terms for dictionary lookup

2. TRANSLATE
   ├─ IndicTrans2 (200M distilled for speed, 1B for quality-critical)
   ├─ Legal terminology post-processing:
   │   For each sentence, check output against legal glossary
   │   If a glossary term was translated differently, substitute the glossary version
   │   Log the substitution for review
   └─ Align translated sentences back to source

3. VALIDATE
   ├─ Back-translate (Y → X) and compare to original
   │   If back-translation diverges significantly → flag for human review
   ├─ Check structural preservation:
   │   Same number of sections? Same numbering? Amounts unchanged?
   └─ Confidence score per sentence

4. OUTPUT
   ├─ Side-by-side view: original + translation
   ├─ Flagged sentences highlighted
   ├─ User can edit translations inline (edits are stored, improve future translations)
   └─ Download as bilingual PDF (original on left, translation on right)
```

### 6c. The Glossary Problem

Generic translation models don't know legal terminology. Examples:

| Hindi | Generic Translation | Correct Legal Translation |
|---|---|---|
| दाय | gift | bequest / inheritance |
| वाद | case | suit / litigation |
| प्रतिभू | guarantor | surety |
| विलेख | document | deed |
| अधिनियम | rule | Act (of Parliament) |

**Solution**: Build a legal glossary per language (target: 2,000 terms per language for the top 6 languages, 500 for the rest). Source from:
1. Existing bilingual legal dictionaries (India Code publishes some)
2. Manual curation by legal translators
3. Mining parallel corpora where available (Hindi ↔ English Acts exist for many central laws)

### 6d. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Mistranslated legal term changes meaning | User relies on wrong translation | Glossary override + back-translation check + flagging. User can toggle to English. |
| IndicTrans2 quality varies by language | Poor quality for low-resource languages (Bodo, Dogri, Santali, Kashmiri) | Start with top 6 (Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati). Add others only after quality benchmarking. |
| Translation adds latency to every query | Slow user experience | 200M model on GPU: ~300ms per paragraph. Cache translated sections. Pre-translate common passages. |
| Layout breaks in translated documents | Tables, columns, numbering misaligned | Structure-preserving pipeline per [arXiv 2606.28796](https://arxiv.org/pdf/2606.28796). Process structure separately from content. |

### 6e. Testing

- **Quality**: [MILPaC benchmark](https://dl.acm.org/doi/10.1145/3748313) per language pair. Report chrF++ and BLEU.
- **Glossary accuracy**: 200 high-stakes terms per language. Manual verification. Zero tolerance for meaning-changing errors.
- **Structural preservation**: 20 documents with tables, numbered lists, multi-column layouts. Verify structure survives translation.
- **Back-translation divergence**: Automated check. Flag rate target: < 10% of sentences.

---

## 7. Backend Architecture — Model Routing & Fallback

### 7a. Current Model Architecture

The backend already uses two models with distinct roles:

```
Claude (Anthropic):
  EXTRACT  = claude-opus-5      → reads document, proposes facts WITH spans
  NARRATE  = claude-sonnet-5    → phrases results (cannot introduce new facts)
  CLASSIFY = claude-haiku-4-5   → document classification

Gemini (Google):
  OCR      = gemini-2.5-flash   → page reading (best on Devanagari scans)
```

This is NOT multi-provider routing for cost. It is "the model that wins the specific modality."

### 7b. How the Circuit Breaker Works

Already implemented in `gateway/circuit.py`:

```
State machine:
  CLOSED → (3 consecutive failures) → OPEN
  OPEN → (cooldown expires) → HALF_OPEN
  HALF_OPEN → (1 trial call succeeds) → CLOSED
  HALF_OPEN → (1 trial call fails) → OPEN (restart cooldown)

Key properties:
  - FAILURE_THRESHOLD = 3 consecutive failures
  - Cooldown = long enough for a restarting provider to restart
  - Successes reset the failure count (a provider that fails 1 in 20 is not down)
  - Open breaker yields FAILED, NEVER NOT_FOUND
  - Per-provider: Claude breaker is independent of Gemini breaker
```

### 7c. Expansion: Gemini as Fallback for Generation

**When to fall back**: When Claude is down (circuit open) AND the task is generation (not extraction).

**What changes**:

```python
# In gateway/models.py (new)

TASK_ROUTING = {
    "extract": {
        "primary": "anthropic:claude-opus-5",
        "fallback": None,  # Extraction requires citation provenance. No fallback.
        "reason": "CitationCharLocation is Anthropic-only. Falling back loses provenance."
    },
    "narrate": {
        "primary": "anthropic:claude-sonnet-5",
        "fallback": "google:gemini-2.5-flash",
        "reason": "Narration cannot introduce facts. Any model that phrases correctly works."
    },
    "classify": {
        "primary": "anthropic:claude-haiku-4-5",
        "fallback": "google:gemini-2.5-flash",
        "reason": "Classification is a closed-set task. Either model handles it."
    },
    "ocr": {
        "primary": "google:gemini-2.5-flash",
        "fallback": None,  # Best on Devanagari. No better option available.
        "reason": "86.3 chrF++ on real scans. No fallback improves this."
    },
    "translate": {
        "primary": "self:indictrans2-200m",
        "fallback": "google:gemini-2.5-flash",
        "reason": "IndicTrans2 is self-hosted. Gemini fallback for outage."
    },
}
```

**Why extraction has no fallback**: The `anthropic_model.py` docstring explains: "citations: {enabled: true} returns char_location with exact start/end indices into the document — the character-level provenance this product sells." Gemini does not offer equivalent character-level citation. Falling back would silently downgrade provenance quality.

**What happens when extraction's provider is down**: The circuit breaker opens. The request returns `PROVIDER_CIRCUIT_OPEN` with outcome `FAILED`. The UI shows "Did not arrive — this is not a refusal" with a dashed ink box and "Try again." The user sees a transport failure, never an abstention.

### 7d. The Routing Algorithm

```
For each API call:

1. Look up task type in TASK_ROUTING
2. Check primary provider's circuit breaker state
   ├─ CLOSED or HALF_OPEN → try primary
   │   ├─ Success → return result, record success (resets failure count)
   │   └─ Failure → record failure, check if fallback exists
   │       ├─ Fallback exists → check fallback's breaker
   │       │   ├─ CLOSED/HALF_OPEN → try fallback
   │       │   └─ OPEN → return FAILED
   │       └─ No fallback → return FAILED
   └─ OPEN → check if fallback exists
       ├─ Fallback exists → try fallback (same breaker check)
       └─ No fallback → return FAILED immediately (no API call wasted)

3. NEVER retry within the same request
   (Retries would double the response time. The breaker handles recovery.)

4. NEVER switch providers mid-stream
   (Partial output from provider A followed by provider B = corrupt response.
    See: "switching after partial streaming output causes duplicate tool calls,
    broken JSON, or mixed output" — multiple production guides confirm this.)
```

### 7e. Rate Limiting

Gemini free tier limits bind on **tokens per minute**, not requests per day. The `gemini_model.py` docstring warns: "an earlier plan in this project was off by roughly 50x by reading the wrong number."

```
Gemini 2.5 Flash free tier (as of 2026-11):
  - 1M tokens/min input
  - 500K tokens/min output
  - Varies by region and time of day

Strategy:
  - Track token usage per minute in-memory (a counter that resets every 60s)
  - When approaching limit: queue requests, don't fail them
  - When over limit: return RATE_LIMITED (distinct from FAILED)
  - The circuit breaker does NOT open on rate limits (the provider is healthy)
```

### 7f. Cost Model

| Task | Model | Cost per 1M tokens (USD) | Volume Estimate | Monthly Cost |
|---|---|---|---|---|
| Extract | claude-opus-5 | $5/$25 (in/out) | 50M in, 10M out | $500 |
| Narrate | claude-sonnet-5 | $2/$10 | 20M in, 5M out | $90 |
| Classify | claude-haiku-4-5 | $1/$5 | 10M in, 2M out | $20 |
| OCR | gemini-2.5-flash | Free | — | $0 |
| Translate | IndicTrans2 (self-hosted) | GPU cost: ~$220/mo (A10G reserved) | — | $220 |
| **Total** | | | | **~$830/mo at launch volume** |

### 7g. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Gemini free tier disappears or degrades | OCR and fallback generation gone | Monitor Gemini pricing page. Budget for paid tier ($0.15/M tokens). Self-hosted OCR (Tesseract) as emergency fallback. |
| Claude rate limits during peak usage | Extraction requests queue up | Per-tenant rate limiting. Prioritize extraction over narration. Alert at 80% of rate limit. |
| Model version changes break output parsing | `_parse()` in anthropic_model.py fails | Pin to exact model versions (already done). Test against new versions before switching. |
| Cross-provider output format differences | Gemini narration formatted differently from Claude | Normalize output format in a post-processing step. Test fallback output format in CI. |

### 7h. Testing

- **Circuit breaker**: Inject failures, verify state transitions. Already tested in `circuit.py` (docstring: "Run: PYTHONPATH=. python3 gateway/circuit.py --test").
- **Fallback routing**: Mock primary as down, verify fallback activates for narrate/classify but NOT for extract.
- **Rate limiting**: Simulate burst traffic, verify queuing behavior and that the breaker doesn't open on rate limits.
- **Output parity**: For narrate and classify, run the same 100 inputs through both Claude and Gemini. Verify outputs are functionally equivalent (not identical, but same classification/same meaning).

---

## 8. Competitive Positioning

### 8a. The Market

| Player | Strength | Weakness (for PlacedOn's target) |
|---|---|---|
| **Harvey** | $5B valuation, India office (Nov 2025), deep AI research | US-centric training data, limited Indian statute depth, data leaves India |
| **SpotDraft** | $62M raised, strong CLM product, good UI | Contract management, not statutory compliance. No bitemporal corpus. |
| **Jhana.ai** | Indian-focused, good marketing | Unknown depth. No public information on statutory coverage. |
| **NyayNidhi** | Open-source Indian legal LLM | Research project, not a product. No audit trail. |
| **Lucio** | Indian legal AI, growing | Early stage, limited public information on architecture. |

### 8b. PlacedOn's Moat

1. **The bitemporal corpus**: "What did the law say on this date?" No other tool answers this for Indian law.
2. **The scope register**: Declares what it holds AND what it doesn't. A silence is never an answer.
3. **Character-level citation provenance**: Every claim traces to exact characters in the source text.
4. **The two-human-check**: Every acquired section is verified. No other Indian legal AI tool publishes this standard.
5. **Multilingual OCR on real documents**: Gemini Flash at 86.3 chrF++ on handwritten Devanagari — benchmarked, not claimed.

### 8c. What We Do NOT Compete On

- **Drafting from scratch**: We review and check, we don't generate boilerplate. SpotDraft and Harvey do this.
- **Case law search**: We cover statutes and regulations, not court judgments (yet). This is a future expansion.
- **Legal project management**: Not our product. CLM tools handle this.

---

## 9. Execution Timeline

| Quarter | Milestone | Dependencies | Validation Gate |
|---|---|---|---|
| **Q1 2027** | Complete CA2013 (remaining rules) + acquire Contract Act + IBC. Launch Due Diligence and Transactions practice areas. | Two-human-check capacity (need 2 legal reviewers) | 50-question retrieval test per new body. Recall@10 ≥ 0.9. |
| **Q1 2027** | Deploy IndicTrans2 (200M) on Azure GPU. Launch Hindi and Bengali translation. | A10G instance in Hyderabad | MILPaC benchmark: chrF++ ≥ 70 for Hindi, ≥ 65 for Bengali |
| **Q2 2027** | Contract redlining (English). Playbook management UI. | Clause extraction pipeline built and tested | 30-contract test. F1 ≥ 0.85 on clause extraction. |
| **Q2 2027** | Word add-in: Currency Check + Contract Review modes. Sideload for pilot customers. | Office.js WordApi 1.5 | 10-contract integration test in Word desktop + Online |
| **Q2 2027** | Acquire SEBI ICDR/SAST/PIT + RBI Act. Launch Capital Markets and Banking practice areas. | Regulator PDF acquisition | Corpus integrity test. Obligation coverage test. |
| **Q3 2027** | Add Tamil, Telugu, Marathi, Gujarati translation. Contract redlining in Hindi. | Legal glossary (2000 terms per language) | Glossary accuracy: 100% on high-stakes terms |
| **Q3 2027** | Hybrid retrieval (BM25 + vector). Cross-body retrieval for multi-Act questions. | Embedding model fine-tuned on Indian legal text | Retrieval benchmark: Recall@10 ≥ 0.9 on cross-Act questions |
| **Q3 2027** | Acquire CPC + BSA 2023 + Arbitration Act. Launch Litigation and Arbitration. | Largest acquisition batch (CPC alone is 158 sections + 51 Orders) | Same gates as Q1 |
| **Q4 2027** | Word add-in on AppSource (public). Ask mode in Word. | Microsoft review process (2-4 weeks) | Latency: < 5s to first finding on 10-page contract |
| **Q4 2027** | In-House routing layer. Advisory multi-instrument reasoning. | All Phase 1-3 corpora acquired | 20-question advisory test: answers correctly cite multiple Acts |
| **Q4 2027** | Remaining 16 languages (quality-gated: only languages where chrF++ ≥ 60) | Glossary curation for each language | MILPaC benchmark per language |

---

## 10. Architecture Operations — How It Runs in Production

### 10a. Current Production Stack

```
Frontend:    Vercel (placedon-legal.vercel.app → placedon.com)
             Next.js, Hobby plan, BOM1 region
Backend:     Azure App Service (placedon-api-hyd, Hyderabad)
             Python, connects to:
Database:    Azure Postgres (placedon-pg-uae, UAE North)
Models:      Claude API (Anthropic, remote)
             Gemini API (Google, remote, free tier)
GPU (new):   Azure A10G (Hyderabad) for IndicTrans2 + OCR
```

### 10b. What Gets Added

```
Existing:
  gateway/verbs.py        → add review-contract-multilingual, translate verbs
  gateway/circuit.py      → add per-task routing (§7d)
  checker/scope.py        → add new bodies as acquired
  addin/                  → expand to three modes

New services:
  translation/server.py   → IndicTrans2 inference server (FastAPI on GPU instance)
  translation/glossary.py → legal terminology override
  retrieval/hybrid.py     → BM25 + vector search + reranker
  retrieval/embeddings.py → embedding index management
  redline/pipeline.py     → clause extraction → classification → playbook comparison
  redline/playbook.py     → playbook CRUD

New infrastructure:
  Azure A10G (Hyderabad)  → GPU for IndicTrans2 + embedding inference
  Vector store            → Qdrant (self-hosted on the GPU instance) or Azure AI Search
  BM25 index              → SQLite FTS5 (simple, zero-dependency, same machine as the corpus)
```

### 10c. Monitoring

| What | How | Alert Threshold |
|---|---|---|
| Circuit breaker state changes | Log every CLOSED→OPEN and OPEN→CLOSED transition | OPEN for > 5 minutes |
| API latency per route | Middleware timer on every gateway verb | p95 > 10s for extraction, > 5s for narration |
| Retrieval recall (sampled) | Weekly automated run of the 50-question benchmark | Recall@10 drops below 0.85 |
| OCR error rate | Sample 10% of OCR outputs, compare to previous run | Error rate > 5% (new Gemini version may regress) |
| Translation quality (sampled) | Weekly back-translation divergence check | Divergence rate > 15% |
| GPU utilization | Azure Monitor on A10G instance | Sustained > 85% (need to scale) or < 10% (wasting money) |
| Corpus freshness | Last-acquired date per body | Any body > 60 days since last check |

### 10d. Incident Response

| Scenario | Detection | Response |
|---|---|---|
| Claude API down | Circuit breaker opens (3 consecutive failures) | Narration and classification fall back to Gemini. Extraction returns FAILED. Frontend shows "Did not arrive" with retry. |
| Gemini API down | Circuit breaker opens | OCR queue pauses. Translation falls back to IndicTrans2 only (no Gemini backup for OCR). |
| GPU instance down | Health check fails | Translation requests return "Translation temporarily unavailable" (not an abstention). Queue builds, drains when GPU recovers. |
| Wrong section in corpus | User reports, or corpus integrity test fails | Immediate: mark section as under review. Same day: two-human-check reacquisition. No obligation may cite an under-review section. |
| Gemini free tier removed | API returns 403 or pricing page changes | Switch to paid tier (budgeted at $0.15/M tokens). Alert the team. |

---

## 11. What This Plan Does NOT Cover (Declared Scope Boundaries)

- **Case law search**: Court judgments, tribunal orders. Future expansion, different acquisition pipeline.
- **Legal project management / CLM**: Not our product.
- **Consumer-facing legal advice**: We serve in-house legal teams, not individuals.
- **Data protection (DPDP 2023)**: Declared in scope.py but not prioritized for acquisition. The SDF designation is a gazette lookup.
- **Criminal law**: Out of scope entirely.
- **International law / cross-border**: India-only.

---

## Appendix A: Research Sources

- [Stanford RegLab: Hallucination-Free?](https://arxiv.org/pdf/2405.20362) — 17-33% hallucination in legal AI tools
- [ACORD dataset (ACL 2025)](https://aclanthology.org/2025.acl-long.1206.pdf) — 126K query-clause pairs for contract clause evaluation
- [MILPaC benchmark](https://dl.acm.org/doi/10.1145/3748313) — Indian legal translation evaluation across languages
- [Seeing Justice Clearly (arXiv 2512.18004)](https://arxiv.org/abs/2512.18004) — OCR + VLM on handwritten Marathi legal documents
- [GlotOCR Bench](https://arxiv.org/pdf/2604.12978) — Multi-script OCR evaluation
- [Citation hallucination benchmark (arXiv 2606.21155)](https://arxiv.org/abs/2606.21155) — 1,300 excerpts, citation error taxonomy
- [Structure-preserving Marathi translation (arXiv 2606.28796)](https://arxiv.org/pdf/2606.28796) — Multi-stage LLM pipeline
- [LLM circuit breaker patterns](https://www.getmaxim.ai/articles/retries-fallbacks-and-circuit-breakers-in-llm-apps-a-production-guide/) — Production fallback architecture
- [IndicTrans2](https://ai4bharat.iitm.ac.in/?p=6796) — MIT-licensed, 22 Indian languages
- [Enterprise Legal RAG architecture](https://dev.to/ayanpal98/architecture-breakdown-building-an-enterprise-grade-legal-rag-system-from-ingestion-to-ragas-4m0c) — Ingestion to evaluation
- [Word add-in architecture](https://metadesignsolutions.com/blog/creating-ai-powered-plugins-for-microsoft-word-using-azure-openai) — Task pane + backend pattern
