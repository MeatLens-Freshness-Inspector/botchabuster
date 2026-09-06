# Frontend–Backend Transport Encryption Design

**Date:** 2026-09-06  
**Status:** Approved for specification review  
**Scope:** Encrypt every application request and response body between the React frontend and Express backend.

## Goal

Ensure that application payload bodies inspected in browser DevTools are encrypted ciphertext while keeping all symmetric transport keys out of the frontend build and frontend environment files.

This protects application bodies from passive payload inspection. It does not replace HTTPS, XSS prevention, authentication, CSRF protection, or authorization. URL paths, query strings, status codes, and authentication/CSRF headers remain visible unless separately redesigned.

## Chosen Architecture

Use a stateless hybrid envelope:

1. The backend owns an RSA private key configured only through backend deployment configuration.
2. The frontend obtains the corresponding public key and key identifier from plaintext `GET /api/transport/public-key`.
3. For every application request, the frontend generates a fresh 32-byte AES key and 12-byte IV using Web Crypto.
4. The frontend encrypts the request bytes with AES-256-GCM and wraps the AES key with RSA-OAEP-SHA-256.
5. The wrapped AES key is sent in a transport header so bodyless requests and streaming requests can also negotiate a response key.
6. The encrypted request body is a versioned envelope containing the IV and AES-GCM ciphertext. Multipart uploads are represented as encrypted bytes plus filename and MIME metadata inside the plaintext-before-encryption payload.
7. The backend unwraps and validates the AES key before route handling, exposes the decrypted body to existing controllers, and associates the request with the transport context.
8. Application responses are serialized into bytes and encrypted with the request AES key before they are written to the network.
9. The frontend converts successful and error encrypted responses into normal `Response` objects so existing API clients continue to consume `response.json()`, binary bodies, and status codes without route-by-route crypto code.

## Plaintext Exceptions

Only these endpoints are exempt from response-body encryption:

- `GET /api/analysis/health`, used by deployment health checks.
- `GET /api/transport/public-key`, used to bootstrap the public key.

Transport errors that occur before a request key can be recovered may be plaintext protocol errors because the server has no key with which to encrypt them. Normal route, validation, authentication, authorization, and application errors must use the request transport key.

## Envelope Contract

The wire envelope is JSON so it can be parsed before decryption, but the plaintext fields contain no application data:

```ts
type EncryptedTransportEnvelope = {
  version: 1;
  algorithm: "A256GCM";
  keyId: string;
  iv: string;          // base64url, 12 random bytes
  ciphertext: string;  // base64url, Web Crypto AES-GCM output including tag
};
```

The request transport header contains the RSA-OAEP wrapped AES key as base64url ciphertext. The response does not need to repeat the wrapped key because it reuses the request's AES key. The method and normalized path are authenticated as AES-GCM additional authenticated data so an encrypted body cannot be moved between routes without detection.

## Key Management

- The backend private key is never committed, logged, returned by an API, or exposed through any `VITE_*` variable.
- Production startup must fail closed when the backend private key is absent or malformed.
- Development and tests may use an explicitly generated in-memory key through a test seam; test fixtures must not become production defaults.
- The public key response contains only the public key, key identifier, and supported transport version.
- The frontend caches only the public key in memory. It does not persist AES keys or private material in localStorage, sessionStorage, IndexedDB, or `.env` files.
- If a key identifier is rejected, the frontend may refresh the public key once and retry the request once. It must not retry indefinitely.

## Streaming

Existing assistant streaming and user-chat SSE are application response bodies and must not emit plaintext event data.

- Each SSE `data:` payload is an independently encrypted transport envelope using a fresh IV and the request AES key.
- Event framing, heartbeats, and connection headers remain necessary protocol metadata; heartbeat content must not contain application data.
- The frontend retains custom `fetch`-based stream readers and decrypts each complete encrypted event before passing it to the existing assistant/chat parsers.
- Stream setup errors use the normal encrypted response path when a transport key exists.

## Middleware and Compatibility

Backend transport middleware will be mounted after JSON parsing and before route registration. It will:

- reject unsupported versions, algorithms, key identifiers, malformed base64url values, invalid IV lengths, oversized envelopes, and failed authentication tags;
- decrypt request bodies before controllers run;
- install response serialization/encryption for JSON, text, binary, and streaming responses;
- avoid double encryption for the two plaintext bootstrap endpoints;
- never include decrypted request or response data in logs or diagnostics.

The frontend shared `fetchWithTimeout` wrapper will own encryption and decryption so existing API clients remain focused on domain payloads. FormData callers will be converted to a bounded encrypted upload representation. The API documentation tool will show the logical request while never exposing the encrypted key material in generated cURL/history output.

## Security and Failure Behavior

- AES-GCM authentication failures produce a generic `400` protocol error and no plaintext details.
- RSA unwrap failures produce a generic `400` protocol error and no key-specific details.
- Decrypted payload size is bounded before allocation and after decoding.
- Error logs include route, status, and protocol failure category only; never ciphertext-derived plaintext, keys, tokens, or passwords.
- Existing CORS, cookie, bearer-token, CSRF, rate-limit, and authorization checks remain required.
- The transport layer is confidentiality/integrity protection for bodies, not replay prevention. HTTPS remains mandatory in production.

## Testing Strategy

Test-first coverage will include:

- backend AES-GCM round trips, tamper rejection, AAD mismatch rejection, RSA wrapping/unwrapping, key configuration, and envelope validation;
- backend middleware request decryption, encrypted response serialization, plaintext bootstrap exceptions, malformed protocol errors, size limits, and stream event encryption;
- frontend Web Crypto round trips, public-key caching/refresh, bodyless requests, JSON requests, encrypted uploads, response conversion, retry behavior, and stream decryption;
- integration and contract tests proving existing route behavior still receives logical bodies and that raw application response bodies are not readable JSON;
- frontend and backend CI lanes, typecheck, lint, architecture tests, builds, and relevant integration tests.

## Commit Discipline

Implementation will contain at least 30 meaningful atomic commits. Each commit will represent a reviewable test-backed slice; no empty, duplicate, filler, skipped-test, weakened-assertion, or advisory-quality-gate commits will be used.

