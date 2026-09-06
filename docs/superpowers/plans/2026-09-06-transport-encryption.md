# Frontend–Backend AES-256-GCM Transport Encryption Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Encrypt every application request and response body between the React frontend and Express backend with a fresh AES-256-GCM key per request, without placing a symmetric secret in frontend configuration.

**Architecture:** The backend owns an RSA private key and publishes only its SPKI public key and key identifier. The frontend generates a fresh AES-256-GCM key per request, wraps that key with RSA-OAEP-SHA-256, and sends the wrapped key plus an encrypted body envelope. Backend middleware decrypts requests and encrypts normal, binary, error, and streaming responses before they reach the network; the frontend shared fetch layer restores ordinary Response objects for existing domain clients.

**Tech Stack:** Node.js node:crypto, Express middleware, TypeScript, browser Web Crypto API, React/Vite shared API wrapper, Node test runner with tsx, existing npm workspaces and GitHub Actions CI.

## Global Constraints

- The backend private key is never committed, logged, returned by an API, or exposed through any VITE_* variable.
- Production startup must fail closed when the backend private key is absent or malformed.
- The frontend caches only the public key in memory and does not persist AES keys or private material in localStorage, sessionStorage, IndexedDB, or .env files.
- Only GET /api/analysis/health and GET /api/transport/public-key are plaintext response-body exceptions.
- Existing CORS, cookie, bearer-token, CSRF, rate-limit, and authorization checks remain required.
- The transport layer is confidentiality/integrity protection for bodies, not replay prevention. HTTPS remains mandatory in production.
- Every production function added by this feature has a test, and each test is observed failing before its implementation is added.
- The implementation contains at least 30 meaningful atomic commits with no empty, duplicate, filler, skipped-test, weakened-assertion, or advisory-quality-gate commits.
- Preserve unrelated working-tree changes on master; all feature work occurs in .worktrees/transport-encryption on feat/transport-encryption.

## File Map

### Backend transport boundary

- Create backend/src/modules/transport/domain/transport.ts for envelope, key metadata, request payload, response payload, and transport-file types.
- Create backend/src/modules/transport/infrastructure/TransportKeyStore.ts for RSA key loading, public-key serialization, and key identifiers.
- Create backend/src/modules/transport/infrastructure/TransportCrypto.ts for base64url, RSA-OAEP, and AES-256-GCM operations.
- Create backend/src/modules/transport/presentation/public-key-routes.ts for the plaintext public-key endpoint.
- Create backend/src/middleware/transport.ts for request decryption and response encryption.
- Create backend/src/modules/transport/index.ts for the module composition surface.
- Modify backend/src/config/index.ts, backend/src/app.ts, backend/src/bootstrap/routes.ts, and backend/src/config/cors.ts to configure and mount the boundary.

### Backend file and stream adapters

- Modify backend/src/modules/analysis/presentation/routes.ts and backend/src/modules/analysis/presentation/upload-routes.ts to consume encrypted transport files instead of raw multipart parsing.
- Modify backend/src/modules/analysis/presentation/controllers/AnalysisController.ts and backend/src/modules/analysis/presentation/controllers/UploadController.ts to use the transport-file contract.
- Modify backend/src/modules/developer/presentation/dashboard-routes.ts and backend/src/modules/developer/presentation/controllers/DeveloperDashboardController.ts for encrypted training-package imports.
- Modify backend/src/modules/chat/presentation/controllers/ChatController.ts only where stream headers or writes require transport metadata; do not alter the upstream Groq request contract.
- Modify backend/src/modules/chat/infrastructure/BufferedSseConnection.ts only if the response middleware needs an explicit stream marker.

### Frontend shared transport boundary

- Create frontend/src/shared/api/transport-types.ts for wire and logical payload types.
- Create frontend/src/shared/api/transport-crypto.ts for browser Web Crypto, base64url, key caching, request encryption, response decryption, and encrypted SSE stream transformation.
- Modify frontend/src/shared/api/fetch-with-timeout.ts, frontend/src/shared/api/request.ts, and frontend/src/shared/api/index.ts to make transport encryption automatic.
- Modify frontend/src/features/inspection-submission/api/upload-client.ts, frontend/src/entities/developer-metrics/api/developer-dashboard-client.ts, and frontend/src/entities/message/api/message-event-stream.ts for logical file and stream behavior.
- Modify frontend/src/features/developer-tools/model/api-docs-request.ts, api-docs-history.ts, use-api-docs.ts, and diagnostics only to keep logical data visible to the developer UI while excluding transport secrets.

### Tests, contracts, and documentation

- Add backend unit tests under backend/tests/unit/transport/ and backend integration tests under backend/tests/integration/security/.
- Add frontend unit tests under frontend/tests/unit/shared/api/ and integration tests under frontend/tests/integration/api/.
- Modify backend/tests/support/appFactory.ts, backend/tests/support/requestFactory.ts, tests/contracts/api-contract.test.ts, and affected route fixtures to use the encrypted test client.
- Modify .env.docker.example, backend/README.md, README.md, render.yaml, and deployment documentation with backend-only key setup and no frontend secret.

---

### Task 1: Add the transport domain contract

**Files:** Create backend/src/modules/transport/domain/transport.ts and backend/tests/unit/transport/transport-types.unit.test.ts.

**Interfaces:** Export TransportAlgorithm = 'A256GCM', TransportVersion = 1, EncryptedTransportEnvelope, TransportPublicKey, TransportRequestPayload, TransportResponsePayload, TransportFile, TransportContext, and assertTransportEnvelope(value: unknown).

- [ ] Write a failing runtime test asserting a version 1 A256GCM envelope is accepted and missing fields are rejected.
- [ ] Run npm run test:unit -w backend -- --test-name-pattern='transport domain contract'; expected: FAIL because the transport module does not exist.
- [ ] Implement the literal types and strict runtime validator.
- [ ] Re-run the same command; expected: PASS.
- [ ] Commit feat: define encrypted transport contract.

### Task 2: Add backend base64url codecs

**Files:** Modify backend/src/modules/transport/infrastructure/TransportCrypto.ts and create backend/tests/unit/transport/base64url.unit.test.ts.

**Interfaces:** Export encodeBase64Url(value: Uint8Array): string and decodeBase64Url(value: string): Uint8Array.

- [ ] Test binary round trips and rejection of padding, whitespace, malformed alphabet, and non-canonical values.
- [ ] Run the focused test; expected: FAIL because the codecs are absent.
- [ ] Implement strict Buffer conversion with no logging.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: add strict transport base64url codecs.

### Task 3: Add backend key-store configuration

**Files:** Modify backend/src/config/index.ts; create backend/src/modules/transport/infrastructure/TransportKeyStore.ts and backend/tests/unit/transport/transport-key-store.unit.test.ts.

**Interfaces:** Export TransportKeyStore, createTransportKeyStore(options), and publicKeyMetadata().

- [ ] Test escaped-newline PEM loading, stable TRANSPORT_KEY_ID, malformed-key rejection, and production rejection when TRANSPORT_RSA_PRIVATE_KEY is absent.
- [ ] Run the focused test; expected: FAIL because key-store configuration is missing.
- [ ] Add transportRsaPrivateKey, transportKeyId, and bounded envelope settings to Config; validate with crypto.createPrivateKey.
- [ ] Re-run the focused test; expected: PASS without private-key text in errors.
- [ ] Commit feat: load backend transport key securely.

### Task 4: Add an explicit in-memory test key seam

**Files:** Modify backend/src/modules/transport/infrastructure/TransportKeyStore.ts and backend/tests/support/appFactory.ts; create backend/tests/unit/transport/test-key-store.unit.test.ts.

**Interfaces:** Export createTestTransportKeyStore() for tests only; production construction remains Config-driven.

- [ ] Test that the test store exposes public metadata and unwraps keys without process environment access.
- [ ] Run the focused test; expected: FAIL because the seam is absent.
- [ ] Implement a generated 2048-bit RSA test pair and inject it through createTestApp().
- [ ] Re-run the focused test and backend unit tests; expected: PASS.
- [ ] Commit test: add isolated transport key fixture.

### Task 5: Implement backend AES-256-GCM

**Files:** Modify backend/src/modules/transport/infrastructure/TransportCrypto.ts; create backend/tests/unit/transport/aes-gcm.unit.test.ts.

**Interfaces:** Export encryptAesGcm(plaintext: Uint8Array, key: Buffer, aad: Buffer): AesGcmCiphertext and decryptAesGcm(ciphertext, key, aad): Buffer.

- [ ] Test round trips, 32-byte key enforcement, 12-byte IVs, wrong-key failure, changed-AAD failure, and tampered-ciphertext failure.
- [ ] Run the focused test; expected: FAIL because AES helpers are absent.
- [ ] Implement createCipheriv('aes-256-gcm'), setAAD, getAuthTag, and authenticated deciphering.
- [ ] Re-run the focused test; expected: PASS with generic authentication failures.
- [ ] Commit feat: implement backend aes-256-gcm.

### Task 6: Implement backend RSA-OAEP key wrapping

**Files:** Modify backend/src/modules/transport/infrastructure/TransportCrypto.ts; create backend/tests/unit/transport/rsa-oaep.unit.test.ts.

**Interfaces:** Export wrapAesKey(key: Buffer, publicKey): string and unwrapAesKey(wrappedKey: string, privateKey): Buffer.

- [ ] Test a 32-byte key round trip, wrong private-key failure, and malformed wrapped-ciphertext failure.
- [ ] Run the focused test; expected: FAIL because RSA helpers are absent.
- [ ] Implement RSA_PKCS1_OAEP_PADDING with oaepHash 'sha256' and require a 32-byte unwrap result.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: add rsa-oaep transport key wrapping.

### Task 7: Add envelope parsing and request AAD

**Files:** Modify backend/src/modules/transport/domain/transport.ts and TransportCrypto.ts; create backend/tests/unit/transport/envelope-validation.unit.test.ts.

**Interfaces:** Export getTransportAad(method, path): Buffer, parseEncryptedTransportEnvelope(value, limits), and createEncryptedTransportEnvelope(...).

- [ ] Test canonical method/path AAD, invalid IV length, oversized ciphertext, mismatched key ID, and non-canonical base64url rejection.
- [ ] Run the focused test; expected: FAIL because parser/AAD helpers are absent.
- [ ] Implement strict validation and UTF-8 AAD derived from uppercase method plus normalized pathname.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: validate transport envelopes and aad.

### Task 8: Implement frontend Web Crypto primitives

**Files:** Create frontend/src/shared/api/transport-types.ts and frontend/src/shared/api/transport-crypto.ts; create frontend/tests/unit/shared/api/transport-crypto.unit.test.ts.

**Interfaces:** Export generateTransportRequestKey(), importTransportPublicKey(spki), encryptTransportBytes(bytes, key, aad), and decryptTransportBytes(envelope, key, aad).

- [ ] Test browser AES-GCM round trips, 32-byte generated keys, 12-byte IVs, and changed-AAD rejection.
- [ ] Run the focused frontend test; expected: FAIL because transport crypto is absent.
- [ ] Implement subtle.generateKey, raw AES export, RSA-OAEP SPKI import, subtle.encrypt, subtle.decrypt, and strict base64url conversion.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: add browser transport crypto primitives.

### Task 9: Add frontend public-key fetching and memory cache

**Files:** Modify frontend/src/shared/api/transport-crypto.ts; create frontend/tests/unit/shared/api/transport-key-cache.unit.test.ts.

**Interfaces:** Export getTransportPublicKey(forceRefresh?: boolean): Promise<TransportPublicKey> and clearTransportPublicKeyCache(): void.

- [ ] Test one fetch for concurrent callers, memory-only caching, force refresh, and malformed metadata rejection.
- [ ] Run the focused test; expected: FAIL because the cache is absent.
- [ ] Fetch /transport/public-key with no storage writes and coalesce the shared promise.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: cache transport public key in memory.

### Task 10: Add the plaintext public-key route

**Files:** Create backend/src/modules/transport/presentation/public-key-routes.ts and backend/src/modules/transport/index.ts; modify backend/src/bootstrap/routes.ts; create backend/tests/integration/security/transport-key-route.integration.test.ts.

**Interfaces:** Mount GET /api/transport/public-key and return version, algorithm, keyId, and publicKey only.

- [ ] Test status 200, absence of private-key content, and configured key ID.
- [ ] Run the focused test; expected: FAIL because the route is not mounted.
- [ ] Implement and mount the unauthenticated plaintext route.
- [ ] Re-run the test; expected: PASS.
- [ ] Commit feat: publish transport public key endpoint.

### Task 11: Add backend request decryption middleware

**Files:** Create backend/src/middleware/transport.ts; modify backend/src/app.ts; create backend/tests/unit/transport/request-middleware.unit.test.ts.

**Interfaces:** Export createTransportMiddleware(keyStore, options) and attach req.transportContext, req.body, and req.transportFiles.

- [ ] Test encrypted JSON decryption, bodyless request-key recovery, generic malformed-key 400 responses, and size limits.
- [ ] Run the focused test; expected: FAIL because middleware and request augmentation are absent.
- [ ] Implement header unwrap, envelope decrypt, AAD verification, JSON parsing, byte limits, and TransportFile extraction.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: decrypt transport requests before routing.

### Task 12: Preserve route ordering and bootstrap exceptions

**Files:** Modify backend/src/app.ts, backend/src/bootstrap/routes.ts, and backend/src/middleware/transport.ts; create backend/tests/integration/security/transport-bootstrap.integration.test.ts.

**Interfaces:** createApp(config, transportKeyStore?) mounts JSON parsing, transport middleware, routes, and global error handling in that order while bypassing only health/public-key responses.

- [ ] Test readable health/public-key bodies and generic failure for a normal bodyless route without a transport key.
- [ ] Run the focused test; expected: FAIL because normal responses are still plaintext.
- [ ] Implement method/path exception matching and middleware mounting before routes.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: isolate transport bootstrap endpoints.

### Task 13: Encrypt normal backend JSON and binary responses

**Files:** Modify backend/src/middleware/transport.ts; create backend/tests/unit/transport/response-middleware.unit.test.ts.

**Interfaces:** res.json(value), res.send(Buffer|string), and body-bearing res.end() emit encrypted wire envelopes; 204 remains bodyless.

- [ ] Test raw response absence of a known JSON value, decrypted body/metadata restoration, binary bytes, and 204 behavior.
- [ ] Run the focused test; expected: FAIL because response interception is absent.
- [ ] Patch response methods once per response and encrypt a TransportResponsePayload with request context.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: encrypt backend application responses.

### Task 14: Encrypt backend errors

**Files:** Modify backend/src/middleware/transport.ts and backend/src/middleware/errorHandler.ts; create backend/tests/integration/security/transport-errors.integration.test.ts.

**Interfaces:** Route, auth, validation, and global error responses use the request AES key; pre-key protocol failures remain generic.

- [ ] Test 401, 403, 404, and 500 errors through the encrypted client and assert logical messages are absent from raw bodies.
- [ ] Run the focused test; expected: FAIL because errors are readable JSON.
- [ ] Ensure wrapping is installed before auth/route middleware and preserve secure existing messages.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: encrypt backend error responses.

### Task 15: Update CORS for the transport header

**Files:** Modify backend/src/config/cors.ts; create backend/tests/unit/config/transport-cors.unit.test.ts.

**Interfaces:** createCorsOptions allows X-Transport-Key alongside the existing authorization, content-type, and CSRF headers.

- [ ] Test the exact allowed header set, credentials, and unchanged origin allowlist.
- [ ] Run the focused test; expected: FAIL because the transport header is absent.
- [ ] Add only X-Transport-Key.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit fix: allow encrypted transport key header in cors.

### Task 16: Implement frontend logical request serialization

**Files:** Modify frontend/src/shared/api/transport-types.ts and transport-crypto.ts; create frontend/tests/unit/shared/api/transport-request.unit.test.ts.

**Interfaces:** Export serializeTransportRequestBody(body): Promise<TransportRequestPayload|null> and createEncryptedRequest(input, init): Promise<PreparedTransportRequest>.

- [ ] Test JSON, URLSearchParams, Blob/ArrayBuffer, empty bodies, unsupported bodies, and bounded byte limits.
- [ ] Run the focused test; expected: FAIL because request serialization is absent.
- [ ] Implement UTF-8/base64 logical encodings, per-request AES generation, RSA wrapping, and X-Transport-Key creation without persistence.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: prepare encrypted frontend requests.

### Task 17: Integrate automatic request encryption

**Files:** Modify frontend/src/shared/api/fetch-with-timeout.ts, request.ts, and index.ts; create frontend/tests/unit/shared/api/fetch-transport.unit.test.ts.

**Interfaces:** Existing fetchWithTimeout(input, init, timeoutMs) remains unchanged for callers and encrypts application bodies transparently.

- [ ] Test captured JSON POST and bodyless GET requests; assert raw application data is absent and X-Transport-Key exists.
- [ ] Run the focused test; expected: FAIL because fetchWithTimeout sends plaintext.
- [ ] Apply auth/CSRF headers first, then prepare transport data before global fetch; leave health/public-key requests unencrypted.
- [ ] Re-run focused transport and timeout tests; expected: PASS.
- [ ] Commit feat: encrypt requests in shared fetch wrapper.

### Task 18: Decrypt normal frontend responses

**Files:** Modify frontend/src/shared/api/transport-crypto.ts and fetch-with-timeout.ts; create frontend/tests/unit/shared/api/fetch-response-decryption.unit.test.ts.

**Interfaces:** fetchWithTimeout returns a synthetic Response whose json, text, arrayBuffer, blob, status, headers, and body match the logical response.

- [ ] Test decrypted JSON, binary bytes, restored logical headers, and encrypted errors retaining HTTP status.
- [ ] Run the focused test; expected: FAIL because responses are raw envelopes.
- [ ] Parse the response envelope with the request-scoped AES key and construct the safe synthetic Response.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: decrypt encrypted responses in frontend fetch.

### Task 19: Add bounded key refresh and retry

**Files:** Modify frontend/src/shared/api/fetch-with-timeout.ts and transport-crypto.ts; create frontend/tests/unit/shared/api/transport-retry.unit.test.ts.

**Interfaces:** A key mismatch causes one forced public-key refresh and one complete re-encryption retry, never recursion.

- [ ] Test exactly two network attempts and exactly one refresh, then verify a second failure stops.
- [ ] Run the focused test; expected: FAIL because refresh handling is absent.
- [ ] Add bounded retry while preserving abort signals and existing CSRF retry behavior.
- [ ] Re-run transport and timeout tests; expected: PASS.
- [ ] Commit feat: refresh rotated transport keys once.

### Task 20: Add the encrypted backend integration client

**Files:** Modify backend/tests/support/requestFactory.ts and appFactory.ts; create backend/tests/integration/security/encrypted-test-client.integration.test.ts.

**Interfaces:** Export createEncryptedJsonRequest(baseUrl, path, body, init) and createEncryptedRequestClient(baseUrl, publicKeyMetadata).

- [ ] Test logical JSON request/response behavior and raw response unreadability.
- [ ] Run the focused test; expected: FAIL because helper/client support is absent.
- [ ] Implement the Node test client using the shared envelope contract and injected test key store.
- [ ] Re-run the test; expected: PASS.
- [ ] Commit test: add encrypted backend integration client.

### Task 21: Migrate backend and contract tests

**Files:** Modify direct application requests in backend/tests/integration/**/*.test.ts and tests/contracts/api-contract.test.ts.

**Interfaces:** Logical assertions remain unchanged; application requests use the encrypted client while health checks stay direct.

- [ ] Run affected tests before migration; expected: failures identify direct plaintext application requests.
- [ ] Replace only application request construction and preserve auth, cookie, CSRF, rate-limit, and status assertions.
- [ ] Run npm run test:backend:integration and npm run test:contract; expected: PASS with no skips.
- [ ] Commit test: migrate backend contracts to encrypted transport.

### Task 22: Serialize frontend FormData logically

**Files:** Modify frontend/src/shared/api/transport-crypto.ts; create frontend/tests/unit/shared/api/transport-files.unit.test.ts.

**Interfaces:** Export serializeTransportFormData(formData): Promise<TransportRequestPayload> with bounded TransportFile entries containing fieldName, fileName, mimeType, size, and bytes.

- [ ] Test image and ZIP files, text fields, preserved metadata, maximum size rejection, and absence of raw multipart boundaries.
- [ ] Run the focused test; expected: FAIL because FormData serialization is absent.
- [ ] Implement deterministic iteration, bounded reads, and encrypted JSON serialization.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: encrypt frontend file payloads.

### Task 23: Migrate inspection image upload

**Files:** Modify frontend/src/features/inspection-submission/api/upload-client.ts, backend/src/modules/analysis/presentation/upload-routes.ts, UploadController.ts, and backend/src/middleware/upload.ts; create upload tests.

**Interfaces:** uploadInspectionImage(file) remains unchanged; backend receives req.transportFiles.image and writes a bounded validated temporary file.

- [ ] Test ciphertext-only captured body and JPEG/PNG/WebP validation on the backend.
- [ ] Run focused upload tests; expected: FAIL because the route requires raw multer multipart data.
- [ ] Remove raw multipart parsing from this route, validate file MIME/size, generate a safe temp filename, and preserve cleanup.
- [ ] Re-run focused upload tests; expected: PASS.
- [ ] Commit feat: migrate inspection image upload to encrypted transport.

### Task 24: Migrate analysis image upload

**Files:** Modify backend/src/modules/analysis/presentation/routes.ts and AnalysisController.ts; create backend/tests/integration/security/encrypted-analysis-upload.integration.test.ts.

**Interfaces:** POST /api/analysis/analyze reads the encrypted image transport file and retains the existing analysis response contract.

- [ ] Test encrypted image bytes reaching analysis and encrypted missing/malformed-file errors.
- [ ] Run the focused test; expected: FAIL because multer is still required.
- [ ] Replace raw multipart middleware with the transport-file adapter and leave health plaintext.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: protect analysis upload payloads.

### Task 25: Migrate developer training-package import

**Files:** Modify frontend/src/entities/developer-metrics/api/developer-dashboard-client.ts, backend/src/modules/developer/presentation/dashboard-routes.ts, DeveloperDashboardController.ts, and backend/src/middleware/developerPackageUpload.ts; add import tests.

**Interfaces:** importTrainingRun(file) remains unchanged; controller receives req.transportFiles.package and preserves ZIP validation/cleanup.

- [ ] Test encrypted ZIP import, size limits, missing package, invalid manifest, and cleanup.
- [ ] Run focused tests; expected: FAIL because raw multer is still required.
- [ ] Replace raw multipart parsing with a bounded transport-file temp-file adapter.
- [ ] Re-run focused tests; expected: PASS.
- [ ] Commit feat: encrypt developer package imports.

### Task 26: Restore encrypted binary downloads

**Files:** Modify frontend/src/entities/developer-metrics/api/developer-dashboard-client.ts only if required; create frontend/tests/unit/shared/api/transport-binary-response.unit.test.ts.

**Interfaces:** exportDatasets(...): Promise<Blob> returns the same ZIP bytes and filename while raw bytes are encrypted.

- [ ] Test encrypted application/zip body and logical Content-Disposition restoration.
- [ ] Run the focused test; expected: FAIL if binary metadata conversion is incomplete.
- [ ] Keep response metadata inside the encrypted response payload and preserve Response.blob().
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: decrypt encrypted binary downloads.

### Task 27: Encrypt backend SSE response chunks

**Files:** Modify backend/src/middleware/transport.ts; create backend/tests/unit/transport/encrypted-sse.unit.test.ts.

**Interfaces:** For text/event-stream, each inner res.write chunk becomes an outer data: encrypted-envelope frame with a fresh IV; res.end emits no plaintext application chunk.

- [ ] Test assistant text, user-chat events, and heartbeats; assert raw output contains no original content and decryption reconstructs exact inner bytes.
- [ ] Run the focused test; expected: FAIL because stream interception is absent.
- [ ] Mark event-stream responses before first write, patch writes once, and preserve keep-alive headers/lifecycle.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: encrypt backend sse chunks.

### Task 28: Decrypt frontend SSE streams

**Files:** Modify frontend/src/shared/api/transport-crypto.ts and fetch-with-timeout.ts; create frontend/tests/unit/shared/api/transport-sse.unit.test.ts.

**Interfaces:** decryptTransportSseStream(body, key, aad): ReadableStream<Uint8Array> reconstructs inner SSE bytes from fragmented outer frames.

- [ ] Test fragmentation at every byte boundary, heartbeat preservation, malformed-frame rejection, and cancellation.
- [ ] Run the focused test; expected: FAIL because the decrypting stream is absent.
- [ ] Implement bounded TextDecoder/frame parsing and a TransformStream that decrypts each outer data envelope.
- [ ] Re-run the focused test; expected: PASS.
- [ ] Commit feat: decrypt encrypted frontend sse streams.

### Task 29: Verify assistant and user-chat behavior

**Files:** Modify frontend/src/entities/message/api/message-event-stream.ts only for explicit stream headers if needed; modify frontend/src/features/assistant/model/use-assistant.ts only for encrypted response errors; add/update assistant and message stream tests.

**Interfaces:** Existing logical event parsers, token accumulation, auth-expired behavior, reconnect logic, and DONE handling remain unchanged.

- [ ] Test encrypted user-chat status/message events, encrypted assistant chunks, errors, and ciphertext-only captured stream chunks.
- [ ] Run focused stream tests; expected: FAIL until the shared wrapper is wired for event streams.
- [ ] Keep domain parsers consuming reconstructed inner SSE bytes and error bodies using decrypted Response.
- [ ] Re-run message/assistant tests; expected: PASS.
- [ ] Commit test: cover encrypted assistant and message streams.

### Task 30: Keep API docs and diagnostics logical but secret-free

**Files:** Modify frontend/src/features/developer-tools/model/api-docs-request.ts, api-docs-history.ts, use-api-docs.ts, and frontend/src/shared/api/api-transport-diagnostics.ts; add/update their unit tests.

**Interfaces:** API docs show logical request/response data; cURL/history/diagnostics never include X-Transport-Key, AES keys, encrypted body material, or decrypted sensitive payloads.

- [ ] Test logical API-doc rendering, redacted history, and diagnostic output containing only method/path/status.
- [ ] Run focused API-docs and diagnostics tests; expected: FAIL if transport headers leak.
- [ ] Base previews on logical editor values and remove transport headers before persistence/rendering.
- [ ] Re-run focused tests; expected: PASS.
- [ ] Commit fix: keep transport secrets out of api tooling.

### Task 31: Add backend-only deployment documentation

**Files:** Modify .env.docker.example, backend/README.md, README.md, render.yaml, and documentation/DEPLOYMENT.md if present; add documentation assertions where the repository test harness supports them.

**Interfaces:** Document TRANSPORT_RSA_PRIVATE_KEY and TRANSPORT_KEY_ID only under backend configuration and explicitly state no VITE transport secret exists.

- [ ] Test required variable names and absence of a frontend transport secret in tracked example files.
- [ ] Run npm run test:documentation; expected: FAIL if deployment docs omit transport setup.
- [ ] Add key generation/storage guidance without committing a private key.
- [ ] Re-run documentation tests; expected: PASS.
- [ ] Commit docs: document backend-only transport key setup.

### Task 32: Add black-box transport contract coverage

**Files:** Modify tests/contracts/api-contract.test.ts; create backend/tests/integration/security/transport-raw-body.integration.test.ts and frontend/tests/integration/api/transport-boundary.integration.test.ts.

**Interfaces:** Representative auth, inspection, profile, upload, binary download, and stream bodies are unreadable without the per-request AES key; existing logical clients still work.

- [ ] Write failing assertions that raw bodies do not contain known JSON strings, image bytes, ZIP bytes, or chat content, while health/public-key exceptions remain readable.
- [ ] Run focused contract tests; expected: FAIL for any remaining plaintext route.
- [ ] Implement only missing boundary wiring revealed by those tests; do not weaken assertions.
- [ ] Re-run focused contract tests; expected: PASS.
- [ ] Commit test: enforce encrypted application transport boundary.

### Task 33: Run the complete local CI gate and final audit

**Files:** No production files; inspect the feature diff and verification output.

**Interfaces:** The branch contains at least 33 meaningful commits, no frontend symmetric secret, and fresh verification for all affected CI lanes.

- [ ] Run npm run lint, npm run typecheck, npm run test:ci, npm run build, git diff --check, and the raw-body contract tests; expected: all required commands exit 0 with only existing lint warnings.
- [ ] Run git status --short, git log --oneline master..HEAD, and rg -n -S 'VITE_.*TRANSPORT|TRANSPORT_AES|TRANSPORT_SECRET' frontend .env*; expected: no frontend symmetric secret and only intentional feature files.
- [ ] Re-run any gate changed by generated output or dependency installation.
- [ ] Commit chore: finalize encrypted transport verification only when it contains a real reviewable verification artifact; otherwise leave the tree unchanged and report the verified commit count.

