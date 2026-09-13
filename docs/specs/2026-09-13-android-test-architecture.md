# Android Test Architecture

**Status:** Proposed
**Date:** 2026-09-13

## Summary

Add Android-native test coverage that mirrors the frontend's layered test architecture while keeping browser user journeys in Playwright. The first phase covers the Capacitor shell only; it does not duplicate frontend WebView journeys as Android tests. The implementation must be delivered in at least 20 coherent, testable commits.

This supersedes the earlier test-architecture decision that explicitly excluded Android's conventional test layout.

## Goals

- Establish fast JVM unit and architecture coverage for Android-native contracts.
- Establish instrumented tests for the Capacitor activity and WebView shell.
- Provide reusable Android test support without introducing unnecessary abstractions.
- Add directly runnable Gradle and npm commands.
- Make the JVM suite a required CI gate for Android-relevant changes.
- Keep emulator execution available locally while avoiding an unstable required emulator lane.

## Non-goals

- No changes to product behavior or the Capacitor runtime configuration.
- No duplication of complete browser journeys already covered by Playwright.
- No Robolectric, Kotlin migration, or new test framework in this phase.
- No required GitHub Actions emulator runner until a stable hosted emulator setup is available.

## Architecture

Use the existing Android source-set conventions and organize tests first by test layer, then by native shell behavior:

```text
android/app/src/test/java/com/school/botchabuster/
  architecture/
  support/

android/app/src/androidTest/java/com/school/botchabuster/
  shell/
  support/
```

The generated `com.getcapacitor.myapp` placeholder tests will be replaced with tests under the application's real `com.school.botchabuster` namespace.

### JVM unit and architecture layer

Use the existing JUnit 4 dependency and the host JVM for fast, deterministic checks. These tests validate native contracts that do not require a device:

- The application identity and namespace remain `com.school.botchabuster`.
- `MainActivity` remains a `BridgeActivity` subclass.
- The launcher activity and exported state are declared correctly.
- Required native permissions remain declared, including internet and biometric access.
- Generated placeholder package names do not remain in maintained Android test or production sources.

Shared parsing/assertion helpers belong under `src/test/.../support` only when more than one architecture test needs them.

### Instrumented shell layer

Use AndroidX Test, `ActivityScenario`, and the existing Espresso dependency. These tests run on a device or emulator and verify the native boundary:

- `MainActivity` launches successfully.
- The activity reaches the resumed lifecycle state.
- The Capacitor-provided `WebView` exists and is displayed.
- The application package and launcher activity resolve through Android's package manager.

Shared view-tree or activity helpers belong under `src/androidTest/.../support` only when reused by multiple shell tests.

## Commands and CI

Add root-level commands that expose the Android layers consistently with the frontend commands:

```text
npm run test:android:unit
npm run test:android:instrumentation
npm run test:android
```

They map to:

```text
cd android
./gradlew :app:testDebugUnitTest
./gradlew :app:connectedDebugAndroidTest
./gradlew :app:testDebugUnitTest :app:assembleDebugAndroidTest
```

The combined command must run the JVM suite and compile the instrumentation APK without requiring a connected device. The instrumentation command remains available for local emulator execution.

Update CI path classification with an explicit Android category so Android changes do not depend on broad frontend/backend fallback classification. Add an Android JVM job that:

- Runs on Ubuntu.
- Uses Java 17 for Gradle/Android Gradle Plugin compatibility.
- Restores Gradle dependencies through the standard Gradle cache action.
- Runs `:app:testDebugUnitTest` and `:app:assembleDebugAndroidTest`.
- Uses a bounded 110-second command timeout.
- Is required for Android-relevant changes.

The CI summary and final quality gate must include the Android JVM job result. Emulator tests are not required in this phase.

## Commit strategy

Deliver the implementation as at least the following 20 logically complete commits. Each commit must contain the tests or validation needed for its slice, must not weaken an existing assertion, and should leave the relevant local checks passing. These are intentionally separated by architectural responsibility, not by arbitrary file count.

1. `test: define Android path classification contracts` — add failing repository CI-path tests for Android-only changes and the new Android result field.
2. `ci: classify Android changes explicitly` — implement the Android path classifier while preserving frontend/backend/shared classifications.
3. `test: expose Android Gradle command surface` — add the root Android test scripts and their package-validation coverage.
4. `test: replace generated Android test placeholders` — move the JVM and instrumentation examples to the real application namespace and establish the native test roots.
5. `test: add Android JVM test support` — add reusable host-side fixtures/assertions for Android project contracts without introducing a new framework.
6. `test: verify Android application identity` — cover namespace, application ID, and package identity through the JVM architecture layer.
7. `test: verify MainActivity Capacitor inheritance` — cover the `BridgeActivity` boundary and reject generated activity wiring.
8. `test: verify Android launcher manifest contract` — cover the exported launcher activity and main/launcher intent filters.
9. `test: verify Android permission contract` — cover the required internet and biometric permission declarations.
10. `test: add Android instrumentation support` — add reusable device-side activity and view-tree helpers under `androidTest`.
11. `test: verify MainActivity launches` — add the first instrumented activity launch test using `ActivityScenario`.
12. `test: verify MainActivity lifecycle readiness` — assert the shell reaches the resumed state and cleans up deterministically.
13. `test: verify Capacitor WebView presence` — assert the Capacitor WebView exists and is displayed after launch.
14. `test: verify Android package resolution` — assert the installed package manager resolves the expected launcher activity.
15. `test: compile the Android instrumentation suite` — add the no-device instrumentation APK compilation gate and keep it runnable locally.
16. `ci: configure Java 17 and Gradle caching` — add reproducible Android CI setup with bounded Gradle execution.
17. `ci: add the Android JVM quality job` — run JVM tests and instrumentation compilation for Android-relevant changes.
18. `ci: include Android results in the final quality gate` — publish the Android result in summaries and make failures blocking.
19. `docs: document Android testing architecture` — update `docs/testing-architecture.md` with layers, ownership, and commands.
20. `docs: document Android developer workflows` — update the README with local JVM, instrumentation, emulator, and CI instructions.

After these 20 commits, use one or more additional verification commits only if required by real failures or review findings. Do not create empty, formatting-only, or intentionally broken intermediate commits.

## Documentation

Update the repository testing-architecture documentation and README with:

- Android test layers and directory layout.
- JVM and instrumentation commands.
- The local emulator prerequisite for `connectedDebugAndroidTest`.
- The distinction between required JVM CI coverage and optional emulator execution.

## Verification and acceptance criteria

The implementation is complete when:

1. `./gradlew :app:testDebugUnitTest` passes with no generated placeholder assertions.
2. `./gradlew :app:assembleDebugAndroidTest` compiles the instrumentation suite.
3. `./gradlew :app:connectedDebugAndroidTest` passes when an Android emulator is available.
4. Android-relevant path classification activates the Android JVM CI job.
5. The Android JVM CI job passes within the 110-second lane budget.
6. Existing frontend, backend, contract, and Playwright coverage remains unchanged and passing.
7. No production Android behavior changes are introduced.

## Assumptions and defaults

- Native Android shell testing is the immediate goal; frontend Playwright remains the owner of browser workflows.
- JVM Android CI is required on Android-relevant changes.
- Emulator tests are documented and runnable locally, but are not yet a blocking GitHub Actions gate.
- Java 17 is the CI runtime for Gradle.
- Existing JUnit 4, AndroidX Test, and Espresso dependencies are sufficient.
