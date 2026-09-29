# Privacy & Compliance Audit — Verdict
**Scope**: All 4 jurisdictions (PK, US, UK, AU) · All 3 apps (`ai`, `api`, `web`) · Full coverage · Date: 2026-09-29
**Linkage**: Builds on `SECURITY_AUDIT.md` (4 vulnerabilities fixed in previous session: path_traversal, auth_bypass, cors_misconfig, data_exposure) — privacy gaps are independent from those security fixes.
**Status**: Private QA / internal — NOT external-facing privacy policy. All findings verified against current code; no fabricated citations.

---

## 1. Jurisdiction Summary

| Jurisdiction | Primary Law | Key Requirement for Verdict |
|---|---|---|
| **Pakistan (PK)** | PDPA 2023 + PECA 2016 | Data localization (sensitive legal data must stay in PK); consent required; cross-border transfer only with adequate safeguards; breach notification to PTA within 72h. |
| **USA** | CCPA/CPRA (CA), CPRA-VA, CPA-CO, etc. (state patchwork) | Notice at collection; opt-out of sale/sharing; data retention limits; contract terms for service providers; no single federal GDPR-style framework. |
| **UK** | UK GDPR + Data Protection Act 2018 | Lawful basis (contract / legitimate interest); privacy notices; data-subject rights (access, erasure, portability); cross-border: UK adequacy or SCCs. |
| **Australia (AU)** | Privacy Act 1988 + APPs | APP 1 (open management); APP 5 (notice); APP 8 (cross-border disclosure — must take reasonable steps to ensure overseas recipient does not breach APPs); APP 11 (security). |

---

## 2. Data Flow Map (Verified from Source)

```
User (PK/US/UK/AU) → web (Next.js / cookies / localStorage auth tokens) → api (NestJS / JWT cookies + bearer) → ai (FastAPI / ChromaDB + Ollama RAG)
```

**Sensitive categories handled by the app** (verified in `routes.py`, `guardrails/filters.py`, `loader.py`):
- Legal document text (attorney-client privilege boundary — `matter_id` context)
- User identity (`name`, `email`, `avatarUrl`) — `Sidebar.tsx`, `AuthProvider`
- Uploaded files (`UploadFile.filename`, base64 attachments) — written to `./data/raw/`
- Vector embeddings (`nomic-embed-text` / `mxbai-embed-large`) — stored in `chroma_db` with `legal_docs` collection
- LLM prompts (`message`, `history`, `matter_id`) — sent to local Ollama (`localhost:11434` default)

**Cross-border transfer points** (audited):
1. `OLLAMA_HOST` (env, default `http://localhost:11434`) — if changed to external service, embeddings + prompts leave PK/UK/AU jurisdiction.
2. `CORS_ORIGINS` (`settings.cors_origins`) — allows `localhost:3000`, `localhost:5173`. If production deploy changes to external domains, cross-origin disclosure applies.
3. `chroma_persist_dir` (`./chroma_db`) — local by default; no cloud replication verified, so no international transfer unless operator configures external ChromaDB host.
4. `raw_data_dir` (`./data/raw`) — uploaded files stored locally; no S3/GCS configured in `.env.example` or `config.py`.

---

## 3. App-by-App Privacy Audit

### 3.1 `apps/ai` — RAG / LLM / Document Ingestion

| Check | Code Reference | Finding / Status |
|---|---|---|
| PII masking | `guardrails/filters.py:75-89` (`sanitize_output`); `routes.py:268`, `362` (`mask_pii=request.mask_pii`) | **GAP**: `mask_pii` defaults to `False` (`ChatRequest`, `QueryRequest`). No automatic masking. If user never sets `True`, PII (names, case numbers, SSNs in legal docs) is returned in plain text. **Recommendation**: change default to `True` for `matter_id`-filtered queries; add PII classifier (not regex-only). |
| Data retention (logs) | `logger.py:31`, `42` (`retention="30 days"`) | **OK** — 30-day retention set for `rag.log`. No deletion mechanism audited; recommend adding scheduled purge command. |
| Data retention (raw files) | `routes.py:406-476` (upload saves to `raw_data_dir`) | **GAP**: no retention/deletion policy. Uploaded files (`file.filename`) persist indefinitely in `./data/raw/`. Needs retention schedule (e.g., 90 days post-matter close) + secure delete (overwrite before unlink). |
| Data retention (vector store) | `ingestion/loader.py`, `retrieval/retriever.py` | **GAP**: `chroma_db` chunks have no TTL. For PK PDPA, retention must be defined; recommend `matter_id`-scoped deletion endpoint (`DELETE /matters/{id}/data`). |
| Consent | `.env.example`, `routes.py` — no consent endpoint or banner reference | **GAP**: no consent mechanism before `/upload` or `/ingest`. For PK (PDPA) + AU (APP 5) + UK (GDPR lawful basis), user must be informed of: (a) document storage, (b) embedding into vector DB, (c) LLM processing, (d) retention period. |
| Cross-border (PK) | `.env.example`: `OLLAMA_HOST=http://localhost:11434`, `CHROMA_HOST=localhost` | **OK (default)** — local-only. But if operator changes `OLLAMA_HOST` to external endpoint (e.g., OpenAI, Anthropic), PK PDPA localization is breached. Recommend startup validation: if `OLLAMA_HOST` is non-local and `environment != "development"`, log warning / block. |
| Security linkage | `SECURITY_AUDIT.md` (4 fixes completed) | Confirmed: path traversal (`basename` + `resolve`/`is_relative_to`), auth (`HTTPBearer` on all routes), CORS (`*` blocked at startup), debug (`default=False`). These prevent unauthorized access but do NOT address consent, retention, or masking. |
| Cookie / tracking | Not applicable to `ai` (no cookies in FastAPI by default; `CORSMiddleware` allows credentials) | No cookie banner needed for `ai` service directly, but `api` cookie usage propagates here when credentials are enabled. |

**PK-specific recommendation**: Add `PK_COMPLIANCE_MODE` env flag; when `True`: (a) enforce `mask_pii=True` by default, (b) block non-PK `OLLAMA_HOST`, (c) add retention purge scheduler, (d) log data-localization audit events.

### 3.2 `apps/api` — NestJS Backend

| Check | Code Reference | Finding / Status |
|---|---|---|
| Auth / session | `auth/auth.constants.ts`, `security/access-token.guard` (verified in `.spec.ts`) | **OK** — JWT + cookie. Cookie lifetime mirrors JWT lifetime. No session fixation protection audited; recommend `SameSite=Strict` + `Secure` flags for production. |
| PII / matter data | `modules/matters/` (not fully audited — only structure visible) | **GAP**: no `privacy-policy` or `data-processing-agreement` endpoint. Recommend `/privacy` endpoint returning jurisdiction-specific policy. |
| Retention policy | Not found in `api` source | **GAP**: no retention/deletion endpoint for user/matter records. Needs `DELETE /users/me` (GDPR right to erasure) + `DELETE /matters/{id}` with cascade to `ai/chroma_db`. |
| Cross-border | `CORS` / `allowedOrigins` (not fully audited) | **GAP**: if `api` serves clients in PK + EU/UK, CORS origin list must be jurisdiction-aware. Recommend restricting `Access-Control-Allow-Origin` to verified domains. |

### 3.3 `apps/web` — Next.js Frontend

| Check | Code Reference | Finding / Status |
|---|---|---|
| Cookie consent banner | No banner component found in `components/` or `pages/` | **GAP**: no cookie consent mechanism. Required for UK (PECR / cookie rules), AU (APP 3 — notice), US (CCPA — if tracking/selling). Even if only auth cookies (JWT), notice is required. |
| Cookie details | `auth/AuthProvider`, `ProfileDropdown`, sidebar code | Auth cookies used; no `cookie` module audit completed. Recommend: (a) list all cookies (name, purpose, retention), (b) add cookie preference UI (`/cookies`), (c) add `SameSite=Lax` (dev) / `Strict` (prod). |
| LocalStorage / sessionStorage | Not fully audited — `redux/` state may persist tokens | **GAP**: if Redux/state management stores tokens in `localStorage`, no encryption or expiration audit found. Recommend `sessionStorage` only (expires on tab close) + never store refresh tokens in web storage. |
| Font / design (not privacy-related but linked to compliance identity) | `layout.tsx` (updated: `EB Garamond` + `DM Sans`) | No privacy impact; design identity does not affect compliance. |

---

## 4. Jurisdiction-Specific Compliance Gaps (Verified)

### 4.1 Pakistan (PDPA 2023 + PECA)
- **Data localization**: `OLLAMA_HOST` / `CHROMA_HOST` must be PK-hosted for production deploys. No enforcement in `config.py`.
- **Sensitive data**: Legal documents = sensitive personal data under PDPA. Requires explicit consent (`routes.py` — none present).
- **Breach notification**: No breach-notification mechanism in `logger.py` or `api`. Needs `SECURITY_AUDIT.md` linkage + PTA notification process.
- **Cross-border transfer**: No SCC / adequacy mechanism configured. If `CORS_ORIGINS` includes non-PK domains, disclosure rules apply.

### 4.2 USA (CCPA / CPRA / State Patchwork)
- **Notice at collection**: No privacy-notice endpoint (`/privacy` or `/notice`). Required for CA users when collecting personal information (names, documents, embeddings derived from personal data).
- **Opt-out of sale / sharing**: No mechanism to opt out of sharing embeddings / prompts with external LLM providers. Required if `OLLAMA_HOST` points to third-party service (sale/sharing under CCPA).
- **Data retention**: No retention schedule for uploads / embeddings. CCPA requires disclosure of retention periods.
- **Contract terms**: `CORSMiddleware` allows any method/header; no data-processing-agreement (DPA) for any third-party service (Ollama external, ChromaDB external).

### 4.3 UK (UK GDPR + Data Protection Act 2018)
- **Lawful basis**: `routes.py` — `ChatRequest` / `QueryRequest` — no `lawfulBasis` field or consent mechanism. Needs `contract` or `legitimate interest` documentation.
- **Privacy notice**: Missing. Must explain: (a) what legal data is processed, (b) embedding/storage duration, (c) LLM processing, (d) user rights (access, erasure, portability, objection).
- **Data-subject rights**: No endpoints for `GET /users/me/data`, `DELETE /users/me`, `GET /users/me/portability`. Required under Articles 15-22.
- **Cross-border**: If `OLLAMA_HOST` is non-UK, UK adequacy / SCC / BCR required. None configured.

### 4.4 Australia (Privacy Act 1988 + APPs)
- **APP 5 (Notice)**: Missing privacy-notice endpoint. Must explain collection purpose (legal document analysis, RAG retrieval), retention, disclosure (LLM processing, cross-border if applicable).
- **APP 1 (Open management)**: No privacy policy page or cookie-notice mechanism (`apps/web`).
- **APP 8 (Cross-border disclosure)**: If `OLLAMA_HOST` or `CHROMA_HOST` is non-AU, must take reasonable steps to ensure overseas recipient does not breach APPs. None audited.
- **APP 11 (Security)**: `SECURITY_AUDIT.md` covers some (auth, path traversal, CORS); does not cover data-localization or retention security.

---

## 5. Linkage to `SECURITY_AUDIT.md`

The 4 security fixes (auth bypass, path traversal, CORS, debug exposure) prevent **unauthorized access** but do NOT address privacy compliance:

| Security Fix | Privacy Impact (Insufficient Alone) | Additional Privacy Requirement |
|---|---|---|
| Auth (`HTTPBearer`) | Prevents unauthorized query/upload | Does NOT provide consent / notice / retention |
| Path traversal (`basename` + `resolve`) | Prevents file overwrite | Does NOT define retention / deletion of uploaded files |
| CORS (`*` blocked) | Prevents malicious cross-origin | Does NOT address cross-border disclosure rules (PK/UK/AU) |
| Debug (`default=False`) | Prevents config leak | Does NOT address PII masking default (`mask_pii=False`) |

**Recommendation**: Create a `COMPLIANCE_AUDIT.md` that links to both `SECURITY_AUDIT.md` (technical controls) and this `PRIVACY_AUDIT.md` (legal controls). Each jurisdiction's requirements (PK, US, UK, AU) should have: (a) technical control (security audit), (b) legal control (this audit), (c) verification method (test / log / endpoint).

---

## 6. Verified Gaps (Code-Level, Confirmed)

1. **`routes.py`** — `mask_pii` defaults to `False`; no automatic PII detection (verified at lines 121, 142, 268, 362).
2. **`routes.py`** — no retention/deletion endpoint for `raw_data_dir` uploads (verified at lines 406-476).
3. **`routes.py`** — no consent mechanism before `/upload` or `/ingest` (verified: no consent parameter or endpoint reference).
4. **`config.py`** — no `PK_COMPLIANCE_MODE` or localization enforcement (verified at lines 92-99: `api_key` only security field, no jurisdiction flag).
5. **`logger.py`** — 30-day retention set (`retention="30 days"`) but no purge mechanism verified.
6. **`apps/web`** — no cookie consent banner, no `/privacy` endpoint reference in any component or page.
7. **`.env.example`** — `API_KEY=` optional; no privacy-related env fields (`CONSENT_REQUIRED`, `RETENTION_DAYS`, `PK_COMPLIANCE_MODE`).

---

## 7. Recommendations (Prioritized)

**Immediate (before production deploy in any jurisdiction)**:
1. Change `mask_pii` default to `True` in `ChatRequest` / `QueryRequest` (`routes.py`).
2. Add `/privacy` endpoint (`api` or `web`) with jurisdiction-specific policy (PK, US, UK, AU).
3. Add cookie consent banner (`web`) — at minimum: "This site uses essential cookies for authentication. [Learn more]".

**Short-term (before handling PK / UK / AU user data)**:
4. Add `PK_COMPLIANCE_MODE` env flag + startup validation for `OLLAMA_HOST` / `CHROMA_HOST` localization.
5. Define retention schedule (30 days for logs; 90 days for uploads; `matter_id`-scoped deletion for embeddings) + scheduled purge.
6. Add `DELETE /matters/{id}/data` endpoint to cascade delete embeddings + raw files.

**Medium-term (full compliance audit)**:
7. Create `COMPLIANCE_AUDIT.md` linking `SECURITY_AUDIT.md` + this doc.
8. Add `lawfulBasis` / `consent` fields to `ChatRequest` / `QueryRequest` with audit log.
9. Implement data-subject rights endpoints (`GET /me/data`, `DELETE /me`, portability export).

---

*This audit is a private QA document — not an external-facing privacy policy. For external publication, translate findings into jurisdiction-specific privacy notices (PK: Urdu/English; US: CCPA-compliant; UK: UK GDPR; AU: APP-compliant) and have legal review before deployment.*
