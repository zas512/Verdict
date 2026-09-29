# Security Audit — Verdict Codebase

**Scope**: `apps/ai` (Python FastAPI RAG service), `apps/api` (NestJS backend), `apps/web` (Next.js frontend)
**Date**: 2026-09-29
**Branch**: main (no PR diff — full-codebase audit)

---

## Summary

| # | Severity | File | Line | Category |
|---|----------|------|------|----------|
| 1 | HIGH | `apps/ai/src/api/routes.py` | 397 | path_traversal |
| 2 | HIGH | `apps/ai/src/api/routes.py` | 200 | auth_bypass |
| 3 | MEDIUM | `apps/ai/src/api/routes.py` | 46 | cors_misconfig |
| 4 | MEDIUM | `apps/ai/src/config.py` | 113 | sensitive_data_exposure |

---

## Vuln 1 — Path Traversal: `apps/ai/src/api/routes.py:397`

* Severity: High
* Category: path_traversal
* Description: `file.filename` from the multipart upload is joined directly into `save_dir / file.filename` with no sanitization. An attacker can supply `../../etc/critical.conf` or similar to write anywhere the process has write access.
* Exploit Scenario: Attacker uploads a file with filename `../../chroma_db/exploit.py` or `../../tmp/backdoor.txt`, overwriting ChromaDB data or planting code in a writable directory the service later reads/executes.
* Fix: Sanitize filename — `Path(file.filename).name` (basename only), or validate against a whitelist of extensions, and resolve the final path to ensure it stays inside `save_dir`.

```python
# Safe variant
safe_name = Path(file.filename).name
save_path = settings.raw_data_dir / safe_name
if not save_path.resolve().is_relative_to(settings.raw_data_dir.resolve()):
    raise HTTPException(400, "Invalid filename")
```

---

## Vuln 2 — Missing Auth on AI Endpoints: `apps/ai/src/api/routes.py:200`

* Severity: High
* Category: auth_bypass
* Description: The `/chat`, `/chat/stream`, `/query`, and `/upload` endpoints have no authentication or authorization decorators. Anyone who can reach the Python service (even on localhost in dev) can query the entire legal document index, upload arbitrary documents, and extract document contents including `text_preview` and `content` fields returned in the ingest response.
* Exploit Scenario: An unauthenticated attacker hits `POST /api/ai/query` with `{"question": "list all documents", "include_sources": true}` and retrieves the full document corpus with source excerpts — violating attorney-client privilege boundaries.
* Fix: Add an auth dependency (JWT or API-key) to the router or individual endpoints. The NestJS `api` layer already has `AccessTokenGuard` and `RolesGuard` — mirror that at the Python service or, at minimum, require an `X-API-Key` header.

---

## Vuln 3 — CORS Credentials + Configurable Origins: `apps/ai/src/api/routes.py:46`

* Severity: Medium
* Category: cors_misconfig
* Description: `allow_credentials=True` is set alongside `allow_origins=settings.cors_origins`. If `CORS_ORIGINS` is ever set to `*` (or a wildcard) in any environment, browsers will reject the combination — but if it's set to an attacker-controlled origin (e.g. via compromised env var or shared `.env.example`), credentials (cookies, Authorization headers) are sent cross-origin.
* Exploit Scenario: A compromised subdomain or leaked `.env` with `CORS_ORIGINS=http://evil.example` allows that origin to send authenticated requests to the AI API with credentials, exfiltrating legal document contents.
* Fix: Explicitly disallow `*` — validate `cors_origins` at startup; fail if any entry is `*` while `allow_credentials=True`.

---

## Vuln 4 — Debug Mode Prints Config to Stdout: `apps/ai/src/config.py:113`

* Severity: Medium
* Category: sensitive_data_exposure
* Description: When `debug=True` (the default), the module prints `environment`, `data_dir`, `ollama_llm_model`, `ollama_embed_model`, and `api_prefix` to stdout. If `OLLAMA_HOST`, API keys, or other secrets are added to the config later, they will be printed in plaintext on startup.
* Exploit Scenario: A deployment accidentally ships `debug=True` to production; startup logs (captured by systemd, Docker, or cloud watch) contain the full model and host configuration, revealing internal service topology and potentially credentials if the config class is extended.
* Fix: Change default `debug=False`. Remove the `print()` block entirely or gate it behind `if settings.debug and settings.environment == "development"`. Never print config values in production.

---

## Excluded (per audit rules)

| Pattern | Reason |
|---------|--------|
| LLM prompt injection via `request.message` | Per rule #14 — user-controlled content in AI prompts is not flagged |
| `json.loads(metadata_json)` at routes.py:409 | Controlled form field, not a gadget chain; FastAPI parses before this |
| `base64` attachment decode at routes.py:172 | Decoded content goes to DocumentLoader, not `eval`/`pickle` |
| `uvicorn.run(..., reload=reload)` at main.py:26 | `reload` is CLI-only, not user-controllable |
| `ChromaDB` collection name from settings | Static config, not user input |
| Next.js XSS vectors | Per rule #6 — React 19 escapes by default; no `dangerouslySetInnerHTML` found |
| Rate limiting absence | Per exclusion list |
| `.env` file on disk | Per rule #2 — secrets on disk handled by other processes |
