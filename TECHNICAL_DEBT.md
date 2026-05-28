# Technical Debt Tracker

Items deferred from Foundations phase, to be addressed in subsequent phases.

## High Priority

### API keys stored in plain text
- **File:** `backend/app/modules/settings/service.py`
- **Issue:** OpenAI/Anthropic/Gemini API keys stored unencrypted in PostgreSQL database
- **Impact:** Security risk if database is compromised or accessed via SQL injection
- **Current State:** Keys stored via `_set(db, "llm_api_key", data.api_key)` with no encryption
- **Planned Phase:** Security hardening (Phase 4)
- **Effort:** 3h
- **Action Items:**
  - [ ] Implement encryption at rest (Fernet or similar)
  - [ ] Add key rotation mechanism
  - [ ] Create migration to encrypt existing keys
  - [ ] Add audit logging for key access

### Monolithic frontend component
- **File:** `frontend/src/app/(app)/scripts/[id]/page.tsx`
- **Issue:** Single component handles chat, diff display, apply changes, version management, and state management (567 lines)
- **Impact:** Hard to test, maintain, and extend; difficult to isolate bugs
- **Current State:** Mix of SSR, client-side effects, and business logic
- **Planned Phase:** Frontend refactor (Phase 5)
- **Effort:** 6h
- **Action Items:**
  - [ ] Extract AiChat to separate component
  - [ ] Extract DiffViewer to separate component
  - [ ] Extract version management to custom hook
  - [ ] Create context for script state management
  - [ ] Add component-level tests

### Backend service overload
- **File:** `backend/app/modules/scripts/service.py`
- **Issue:** Single service class mixes CRUD operations, AI modification, Google Sheets integration, and push logic
- **Impact:** Hard to unit test, high coupling, difficult to extend with new features
- **Current State:** All business logic in one file
- **Planned Phase:** Backend refactor (Phase 5)
- **Effort:** 4h
- **Action Items:**
  - [ ] Extract AI modification logic to separate service
  - [ ] Extract Google Sheets integration to separate module
  - [ ] Create repository pattern for data access
  - [ ] Add repository-level tests

### No test coverage
- **Scope:** Backend and frontend
- **Issue:** 0% test coverage, no pytest/jest configured, no test utilities or fixtures
- **Impact:** Regressions go undetected, refactoring is risky, onboarding new developers is harder
- **Planned Phase:** Test infrastructure (Phase 3)
- **Effort:** 24h
- **Action Items:**
  - [ ] Set up pytest with AsyncIO support for backend
  - [ ] Set up Jest for frontend
  - [ ] Create test fixtures and factories
  - [ ] Add CI/CD test runs
  - [ ] Aim for 70%+ coverage

### No error tracking / observability
- **Scope:** Backend and frontend
- **Issue:** Production errors are invisible, no Sentry/DataDog, no structured logging
- **Impact:** Bugs in production go unnoticed until users report them
- **Planned Phase:** Observability & monitoring (Phase 2)
- **Effort:** 4h
- **Action Items:**
  - [ ] Integrate Sentry for error tracking
  - [ ] Set up structured logging (python-json-logger)
  - [ ] Add performance monitoring
  - [ ] Create alerts for critical errors

## Medium Priority

### next-auth in beta
- **Dependency:** `next-auth@^5.0.0-beta.25`
- **File:** `frontend/package.json`, `frontend/src/auth.ts`
- **Issue:** NextAuth v5 is still in beta with unstable API and breaking changes possible
- **Impact:** May need migration path for future stable release
- **Action Items:**
  - [ ] Monitor for v5 stable release
  - [ ] Track API changes in beta releases
  - [ ] Create upgrade plan before switching to production

### TypeScript strict mode not enforced
- **File:** `frontend/tsconfig.json`, `frontend/next.config.ts`
- **Issue:** TypeScript not in strict mode; `ignoreBuildErrors: true` in next.config.ts masks compilation errors
- **Impact:** Type safety is reduced, errors are hidden from CI/CD
- **Current State:** Build succeeds even with type errors
- **Planned Phase:** Code quality (Phase 1 remaining)
- **Effort:** 2h
- **Action Items:**
  - [ ] Enable strict mode in tsconfig.json
  - [ ] Remove `ignoreBuildErrors: true`
  - [ ] Fix all type errors
  - [ ] Add `--noEmit` to CI

### No structured logging on backend
- **Files:** `backend/app/` (all modules)
- **Issue:** Uses `print()` statements and basic Python logging without structure (JSON, context, tracing)
- **Impact:** Hard to parse logs, no correlation IDs for requests, difficult to aggregate errors
- **Planned Phase:** Observability (Phase 2)
- **Effort:** 2h
- **Action Items:**
  - [ ] Replace print() with structured logging
  - [ ] Add python-json-logger
  - [ ] Add request ID middleware
  - [ ] Add correlation ID to all log entries

### Bare exception handlers
- **Scope:** Backend routes and services
- **Issue:** Several `except Exception` blocks that catch all exceptions generically
- **Impact:** Masking specific errors, harder to debug, security issues may be hidden
- **Planned Phase:** Code quality (Phase 1 remaining)
- **Effort:** 1h
- **Action Items:**
  - [ ] Replace with specific exception types
  - [ ] Add proper error responses with HTTP status codes
  - [ ] Log exception context (stack trace, request data)

## Low Priority

### No CI/CD workflows
- **Status:** No `.github/workflows/` directory
- **Issue:** No automated testing, linting, or deployment
- **Planned Phase:** DevOps (Phase 6)
- **Effort:** 4h
- **Action Items:**
  - [ ] Create GitHub Actions workflow for tests
  - [ ] Add linting checks (ruff, mypy, eslint)
  - [ ] Add type checking
  - [ ] Add build verification

### No git hooks
- **Issue:** No pre-commit hooks to catch errors before commit
- **Planned Phase:** Developer experience (Phase 1)
- **Effort:** 1h
- **Action Items:**
  - [ ] Set up husky or pre-commit
  - [ ] Add linting hooks
  - [ ] Add type checking hooks

### Limited CORS configuration
- **File:** `backend/app/main.py`
- **Current State:** Only allows `http://localhost:3011`
- **Issue:** Hardcoded CORS origin, will fail in production
- **Planned Phase:** Configuration (Phase 1)
- **Effort:** 0.5h
- **Action Items:**
  - [ ] Make CORS origins configurable via env var
  - [ ] Support comma-separated list of origins
  - [ ] Validate origins in production

### Missing environment validation
- **File:** `backend/app/core/config.py`
- **Issue:** No validation of required env vars at startup
- **Impact:** Cryptic errors at runtime when required var is missing
- **Planned Phase:** Code quality (Phase 1 remaining)
- **Effort:** 1h
- **Action Items:**
  - [ ] Add pydantic validation
  - [ ] Check all required vars at startup
  - [ ] Provide clear error messages

## Technical Debt Summary

| Category | Count | Phase |
|----------|-------|-------|
| High Priority | 5 | 2, 3, 4, 5 |
| Medium Priority | 4 | 1, 2, 5 |
| Low Priority | 3 | 1, 6 |
| **Total** | **12** | **1-6** |

## Phase Mapping

- **Phase 1:** Code quality & configuration (3h)
- **Phase 2:** Observability & error tracking (6h)
- **Phase 3:** Test infrastructure (24h)
- **Phase 4:** Security hardening (3h)
- **Phase 5:** Refactoring & maintainability (10h)
- **Phase 6:** DevOps & deployment (4h)

**Total Estimated Effort:** 50 hours
