# CSRF Refresh Retry Design

## Problem

The browser keeps the CSRF token issued during auth bootstrap in memory. Backend CSRF tokens expire after 15 minutes, but the frontend does not refresh the token while the user remains on a page. A later mutating request, such as an administrator editing a user, therefore receives `403 Invalid CSRF token`.

The same symptom can occur if the browser's authenticated session and the in-memory token become out of sync. The fix must recover both cases without weakening backend CSRF validation.

## Design

Add a shared, one-time retry path to the frontend request wrapper:

1. Send the request normally with the current cached CSRF token.
2. If the response is `403` and its JSON error is exactly the backend's invalid-CSRF failure, invoke a registered session-refresh callback.
3. The callback calls `GET /auth/session`, stores the returned CSRF token in the existing in-memory token store, and returns the refreshed token.
4. Retry the original request once with the refreshed token explicitly set.
5. Return the retry response unchanged; if refresh fails or the retry still fails, surface the original API error behavior.

The refresh callback is registered by `AuthProvider`, keeping session/bootstrap ownership in the auth layer while avoiding a circular dependency between the generic request wrapper and `AuthClient`. Concurrent CSRF failures share one in-flight refresh operation rather than issuing multiple bootstrap requests.

Only invalid-CSRF responses trigger this flow. Other `403` responses, unsafe request methods without a CSRF failure, and already-retried requests are not retried.

## Testing

Add frontend unit coverage for the request wrapper that proves:

- an expired-token response refreshes the CSRF token and retries exactly once;
- a non-CSRF `403` is not retried;
- the refreshed token is sent on the retry.

Retain existing auth-client, timeout, and backend CSRF tests. Run focused frontend tests, typechecking, linting, and the repository's full CI test command before completion.

## Scope and safety

No backend authorization or CSRF verification rules change. Existing unrelated working-tree changes remain untouched. The retry is bounded to one attempt to avoid loops and preserve the original error if the session cannot be recovered.
