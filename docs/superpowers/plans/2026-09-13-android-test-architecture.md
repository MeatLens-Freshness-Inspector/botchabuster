# Android Test Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a layered Android-native test architecture for the Capacitor shell, expose it through Gradle/npm commands, and make the JVM Android gate required in CI without duplicating frontend Playwright journeys.

**Architecture:** Keep Android's conventional `src/test` and `src/androidTest` source sets, organized by test layer and native-shell behavior. JVM tests cover deterministic application and source contracts; AndroidX instrumentation tests cover activity launch, lifecycle, WebView presence, and package-manager integration. CI runs JVM tests and instrumentation compilation; emulator execution remains local and optional.

**Tech Stack:** Gradle 8.14.3, Android Gradle Plugin 8.13.0, Java 17 in CI, JUnit 4, AndroidX Test, Espresso, Capacitor Android, Node test runner for repository CI-path/package contracts.

## Global Constraints

- Preserve all existing frontend, backend, contract, and Playwright coverage.
- Do not change production Android behavior.
- Do not introduce Robolectric, Kotlin, or a new test framework.
- Keep the Android application namespace `com.school.botchabuster`.
- Keep the CI command bounded to the repository's 110-second lane budget.
- Deliver at least 20 coherent, testable commits; no empty or formatting-only commits.
- Use a dedicated git worktree before implementation begins.
- Follow TDD: each behavior test must be observed failing before its implementation or wiring is added.

---

## File and Layer Map

The implementation will touch these responsibilities:

- `android/app/src/test/java/com/school/botchabuster/architecture/` — host-side Android project and source contracts.
- `android/app/src/test/java/com/school/botchabuster/support/` — reusable JVM contract helpers.
- `android/app/src/androidTest/java/com/school/botchabuster/shell/` — device-side Capacitor shell tests.
- `android/app/src/androidTest/java/com/school/botchabuster/support/` — reusable instrumentation helpers.
- `scripts/ci-paths.mjs` and `scripts/ci-paths.test.mjs` — Android change classification.
- `package.json`, `.github/workflows/ci.yml`, `README.md`, and `docs/testing-architecture.md` — commands, CI, and documentation.

The generated tests under `com.getcapacitor.myapp` will be replaced by real application-package tests. Existing unrelated working-tree files must not be staged.

## Commit-by-Commit Implementation

### Task 1: Define Android path classification contracts

**Commit:** `test: define Android path classification contracts`

**Files:**
- Modify: `scripts/ci-paths.test.mjs`
- Test: existing classifier contract suite

- [ ] **Step 1: Add failing Android classification assertions.**

Extend every expected classifier result with `android: false`, and add a case asserting that `android/app/src/test/...` produces `android: true` without incorrectly setting frontend or backend ownership.

- [ ] **Step 2: Run the classifier tests.**

Run: `node --test scripts/ci-paths.test.mjs`

Expected: FAIL because the classifier does not yet expose an Android result.

- [ ] **Step 3: Commit the red test contract.**

```bash
git add scripts/ci-paths.test.mjs
git commit -m "test: define Android path classification contracts"
```

### Task 2: Implement explicit Android change classification

**Commit:** `ci: classify Android changes explicitly`

**Files:**
- Modify: `scripts/ci-paths.mjs`
- Test: `scripts/ci-paths.test.mjs`
- Modify: `.github/workflows/ci.yml` change-detection output declaration

- [ ] **Step 1: Implement `isAndroidPath`.**

Recognize paths beginning with `android/`, set `android: true`, preserve `docsOnly: false` and `anyRelevantChanges: true`, and keep Android changes out of frontend/backend flags unless the changed file is also shared.

- [ ] **Step 2: Publish the Android output from the workflow.**

Add `android: ${{ steps.classify.outputs.android }}` to the `changes.outputs` mapping and ensure workflow-dispatch/schedule paths emit `android=true`.

- [ ] **Step 3: Run the classifier and script suites.**

Run: `node --test scripts/ci-paths.test.mjs scripts/*.test.mjs`

Expected: PASS with the new Android result included in CLI output.

- [ ] **Step 4: Commit.**

```bash
git add scripts/ci-paths.mjs scripts/ci-paths.test.mjs .github/workflows/ci.yml
git commit -m "ci: classify Android changes explicitly"
```

### Task 3: Expose Android test commands

**Commit:** `test: expose Android Gradle command surface`

**Files:**
- Modify: `package.json`
- Modify: `scripts/package-validation.test.mjs`
- Create: `scripts/run-android-gradle.mjs`

- [ ] **Step 1: Add failing package-script assertions.**

Assert that root scripts expose:

```json
{
  "test:android:unit": "node scripts/run-android-gradle.mjs :app:testDebugUnitTest",
  "test:android:instrumentation": "node scripts/run-android-gradle.mjs :app:connectedDebugAndroidTest",
  "test:android:compile": "node scripts/run-android-gradle.mjs :app:testDebugUnitTest :app:assembleDebugAndroidTest",
  "test:android": "npm run test:android:compile"
}
```

The package contract should first fail because the commands and cross-platform wrapper launcher do not exist.

- [ ] **Step 2: Run the package validation test.**

Run: `node --test scripts/package-validation.test.mjs`

Expected: FAIL with missing Android command assertions.

- [ ] **Step 3: Commit the command contract.**

```bash
git add scripts/package-validation.test.mjs
git commit -m "test: expose Android Gradle command surface"
```

### Task 4: Replace generated Android test placeholders

**Commit:** `test: replace generated Android test placeholders`

**Files:**
- Modify: `android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java`
- Modify: `android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java`
- Modify: `android/app/build.gradle`
- Modify: `scripts/run-android-gradle.mjs`

- [ ] **Step 1: Move both generated tests into `com.school.botchabuster`.**

Use the conventional source-set layout and remove the generated package assertion for `com.getcapacitor.app`.

- [ ] **Step 2: Implement the cross-platform Gradle launcher.**

Add `scripts/run-android-gradle.mjs` that selects `gradlew.bat` on Windows and `./gradlew` elsewhere, runs from the `android` directory, forwards all Gradle arguments, inherits stdio, and exits with the Gradle status.

The root commands from Task 3 must call this launcher. Do not add `android` as an npm workspace; it is a Gradle project, not a Node dependency workspace.

- [ ] **Step 3: Run the JVM task.**

Run: `android\gradlew.bat :app:testDebugUnitTest`

Expected: PASS with the placeholder unit test in the real package.

- [ ] **Step 4: Commit.**

```bash
git add android/app/src/test android/app/src/androidTest android/app/build.gradle scripts/run-android-gradle.mjs
git commit -m "test: replace generated Android test placeholders"
```

### Task 5: Add JVM Android test support

**Commit:** `test: add Android JVM test support`

**Files:**
- Create: `android/app/src/test/java/com/school/botchabuster/support/AndroidProjectContract.java`
- Create: `android/app/src/test/java/com/school/botchabuster/support/AndroidSourceAssertions.java`
- Test: new support tests under `android/app/src/test/java/com/school/botchabuster/architecture/`

- [ ] **Step 1: Define the support API through a failing contract test.**

Define helpers that load maintained Android source files relative to the app module and expose assertions for required text, XML attributes, and absent generated package names.

- [ ] **Step 2: Implement the smallest helpers.**

Keep file resolution deterministic from the Android app module working directory. Fail with the absolute path and missing contract name when a source file cannot be loaded.

- [ ] **Step 3: Run the focused JVM suite.**

Run: `android\gradlew.bat :app:testDebugUnitTest`

Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add android/app/src/test/java/com/school/botchabuster/support
git commit -m "test: add Android JVM test support"
```

### Task 6: Verify Android application identity

**Commit:** `test: verify Android application identity`

**Files:**
- Create: `android/app/src/test/java/com/school/botchabuster/architecture/ApplicationIdentityTest.java`

- [ ] **Step 1: Write failing identity assertions.**

Assert that `android/app/build.gradle` declares namespace and application ID `com.school.botchabuster`, and that the maintained Java source uses the same package.

- [ ] **Step 2: Run the test and observe the contract failure if identity is wrong.**

Run: `android\gradlew.bat :app:testDebugUnitTest --tests "com.school.botchabuster.architecture.ApplicationIdentityTest"`

- [ ] **Step 3: Make only the minimum source/package correction required.**

- [ ] **Step 4: Re-run and commit.**

```bash
git add android/app/src/test/java/com/school/botchabuster/architecture/ApplicationIdentityTest.java android/app/src/main android/app/build.gradle
git commit -m "test: verify Android application identity"
```

### Task 7: Verify MainActivity Capacitor inheritance

**Commit:** `test: verify MainActivity Capacitor inheritance`

**Files:**
- Create: `android/app/src/test/java/com/school/botchabuster/architecture/MainActivityContractTest.java`

- [ ] **Step 1: Add a failing source contract.**

Assert that `MainActivity.java` declares `package com.school.botchabuster`, imports `com.getcapacitor.BridgeActivity`, and extends `BridgeActivity`.

- [ ] **Step 2: Run the focused test.**

Run: `android\gradlew.bat :app:testDebugUnitTest --tests "com.school.botchabuster.architecture.MainActivityContractTest"`

Expected: the contract passes against the corrected activity and would fail if generated activity wiring returned.

- [ ] **Step 3: Commit.**

```bash
git add android/app/src/test/java/com/school/botchabuster/architecture/MainActivityContractTest.java
git commit -m "test: verify MainActivity Capacitor inheritance"
```

### Task 8: Verify launcher manifest contract

**Commit:** `test: verify Android launcher manifest contract`

**Files:**
- Create: `android/app/src/test/java/com/school/botchabuster/architecture/LauncherManifestContractTest.java`

- [ ] **Step 1: Add failing manifest assertions.**

Parse `android/app/src/main/AndroidManifest.xml` and assert that `.MainActivity` is exported and owns the `MAIN` plus `LAUNCHER` intent filter.

- [ ] **Step 2: Run the focused test.**

Run: `android\gradlew.bat :app:testDebugUnitTest --tests "com.school.botchabuster.architecture.LauncherManifestContractTest"`

- [ ] **Step 3: Commit.**

```bash
git add android/app/src/test/java/com/school/botchabuster/architecture/LauncherManifestContractTest.java
git commit -m "test: verify Android launcher manifest contract"
```

### Task 9: Verify permission contract

**Commit:** `test: verify Android permission contract`

**Files:**
- Create: `android/app/src/test/java/com/school/botchabuster/architecture/PermissionManifestContractTest.java`

- [ ] **Step 1: Add failing permission assertions.**

Assert that the manifest requests `android.permission.INTERNET` and `android.permission.USE_BIOMETRIC`, with no generated placeholder package authority.

- [ ] **Step 2: Run the focused JVM test.**

Run: `android\gradlew.bat :app:testDebugUnitTest --tests "com.school.botchabuster.architecture.PermissionManifestContractTest"`

- [ ] **Step 3: Commit.**

```bash
git add android/app/src/test/java/com/school/botchabuster/architecture/PermissionManifestContractTest.java
git commit -m "test: verify Android permission contract"
```

### Task 10: Add instrumentation support

**Commit:** `test: add Android instrumentation support`

**Files:**
- Create: `android/app/src/androidTest/java/com/school/botchabuster/support/ActivityAssertions.java`
- Create: `android/app/src/androidTest/java/com/school/botchabuster/support/ViewTreeAssertions.java`

- [ ] **Step 1: Define support behavior with a failing instrumentation compile/test.**

Provide helpers for launching `MainActivity`, checking lifecycle state, and finding a `WebView` in the activity view tree without hiding assertion failures.

- [ ] **Step 2: Implement helpers using AndroidX Test APIs.**

Use `ActivityScenario<MainActivity>` and direct view-tree traversal or Espresso matchers. Do not add sleeps or swallow instrumentation exceptions.

- [ ] **Step 3: Compile the instrumentation source.**

Run: `android\gradlew.bat :app:assembleDebugAndroidTest`

- [ ] **Step 4: Commit.**

```bash
git add android/app/src/androidTest/java/com/school/botchabuster/support
git commit -m "test: add Android instrumentation support"
```

### Task 11: Verify MainActivity launches

**Commit:** `test: verify MainActivity launches`

**Files:**
- Create: `android/app/src/androidTest/java/com/school/botchabuster/shell/MainActivityLaunchTest.java`

- [ ] **Step 1: Add the launch test.**

Launch `MainActivity` with `ActivityScenario` and assert that the scenario reaches a non-null resumed activity instance.

- [ ] **Step 2: Run the test on an available emulator.**

Run: `android\gradlew.bat :app:connectedDebugAndroidTest --tests "com.school.botchabuster.shell.MainActivityLaunchTest"`

Expected: PASS when an emulator is connected; otherwise retain the compile result and record the local environment limitation.

- [ ] **Step 3: Commit.**

```bash
git add android/app/src/androidTest/java/com/school/botchabuster/shell/MainActivityLaunchTest.java
git commit -m "test: verify MainActivity launches"
```

### Task 12: Verify lifecycle readiness

**Commit:** `test: verify MainActivity lifecycle readiness`

**Files:**
- Create: `android/app/src/androidTest/java/com/school/botchabuster/shell/MainActivityLifecycleTest.java`

- [ ] **Step 1: Add a resumed-state assertion.**

Assert `Lifecycle.State.RESUMED` after launch and close the scenario in a `finally` block so the test cannot leak an activity.

- [ ] **Step 2: Run the focused instrumentation test.**

Run: `android\gradlew.bat :app:connectedDebugAndroidTest --tests "com.school.botchabuster.shell.MainActivityLifecycleTest"`

- [ ] **Step 3: Commit.**

```bash
git add android/app/src/androidTest/java/com/school/botchabuster/shell/MainActivityLifecycleTest.java
git commit -m "test: verify MainActivity lifecycle readiness"
```

### Task 13: Verify Capacitor WebView presence

**Commit:** `test: verify Capacitor WebView presence`

**Files:**
- Create: `android/app/src/androidTest/java/com/school/botchabuster/shell/CapacitorWebViewTest.java`

- [ ] **Step 1: Add the WebView assertion.**

Launch the activity and assert that a displayed `android.webkit.WebView` is present in the activity content view. The test must not assert a browser journey or network response.

- [ ] **Step 2: Run the focused instrumentation test.**

Run: `android\gradlew.bat :app:connectedDebugAndroidTest --tests "com.school.botchabuster.shell.CapacitorWebViewTest"`

- [ ] **Step 3: Commit.**

```bash
git add android/app/src/androidTest/java/com/school/botchabuster/shell/CapacitorWebViewTest.java
git commit -m "test: verify Capacitor WebView presence"
```

### Task 14: Verify package-manager resolution

**Commit:** `test: verify Android package resolution`

**Files:**
- Create: `android/app/src/androidTest/java/com/school/botchabuster/shell/PackageResolutionTest.java`

- [ ] **Step 1: Add package-manager assertions.**

Use the target context and `PackageManager` to resolve the `MAIN`/`LAUNCHER` intent and assert the resolved package is `com.school.botchabuster` and the resolved activity is `.MainActivity`.

- [ ] **Step 2: Run the focused instrumentation test.**

Run: `android\gradlew.bat :app:connectedDebugAndroidTest --tests "com.school.botchabuster.shell.PackageResolutionTest"`

- [ ] **Step 3: Commit.**

```bash
git add android/app/src/androidTest/java/com/school/botchabuster/shell/PackageResolutionTest.java
git commit -m "test: verify Android package resolution"
```

### Task 15: Compile the instrumentation suite as a no-device gate

**Commit:** `test: compile the Android instrumentation suite`

**Files:**
- Modify: `scripts/package-validation.test.mjs`
- Test: package command forwarding and Gradle compilation.

- [ ] **Step 1: Add the exact no-device command contract.**

Assert that `test:android:compile` runs `:app:testDebugUnitTest :app:assembleDebugAndroidTest`, that `test:android` delegates to `test:android:compile`, and that `test:android:instrumentation` remains the only command requiring `connectedDebugAndroidTest`. This prevents the default Android gate from requiring `adb` or an emulator.

- [ ] **Step 2: Run the no-device gate.**

Run: `android\gradlew.bat :app:testDebugUnitTest :app:assembleDebugAndroidTest`

Expected: PASS without a connected device.

- [ ] **Step 3: Commit.**

```bash
git add package.json android/app/build.gradle scripts/package-validation.test.mjs
git commit -m "test: compile the Android instrumentation suite"
```

### Task 16: Configure Java 17 and Gradle caching

**Commit:** `ci: configure Java 17 and Gradle caching`

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the Android job setup.**

Use `actions/setup-java` with Temurin Java 17 and `gradle/actions/setup-gradle` for Gradle dependency caching. Keep Android SDK provisioning compatible with the existing Ubuntu runner.

- [ ] **Step 2: Validate workflow syntax and command forwarding.**

Run: `node --test scripts/*.test.mjs`

Inspect the YAML to confirm the wrapper is invoked from `android` and no npm workspace command is accidentally sent to Gradle.

- [ ] **Step 3: Commit.**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: configure Java 17 and Gradle caching"
```

### Task 17: Add the Android JVM quality job

**Commit:** `ci: add the Android JVM quality job`

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the Android job condition.**

Run the job when `needs.changes.outputs.android == 'true'`, while allowing workflow dispatch and scheduled runs to exercise it through the existing change-detection behavior.

- [ ] **Step 2: Add the bounded Gradle command.**

Run from the Android directory:

```bash
timeout 110s ./gradlew :app:testDebugUnitTest :app:assembleDebugAndroidTest --no-daemon --console=plain
```

- [ ] **Step 3: Add failure diagnostics.**

Upload Android test reports and Gradle reports only on failure, with `if-no-files-found: ignore` so diagnostics cannot create a second failure.

- [ ] **Step 4: Commit.**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add the Android JVM quality job"
```

### Task 18: Include Android in the final quality gate

**Commit:** `ci: include Android results in the final quality gate`

**Files:**
- Modify: `.github/workflows/ci.yml`
- Test: `node --test scripts/*.test.mjs` plus direct workflow command inspection.

- [ ] **Step 1: Add the Android result to the final summary table.**

Expose the job result as `ANDROID_TESTS` alongside frontend, backend, build, critical Playwright, and full Playwright results.

- [ ] **Step 2: Make failure and cancellation blocking.**

Include the Android result in the existing final loop that exits nonzero for `failure` or `cancelled`.

- [ ] **Step 3: Verify YAML and command paths.**

Run: `node --test scripts/*.test.mjs`

- [ ] **Step 4: Commit.**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: include Android results in the final quality gate"
```

### Task 19: Document Android testing architecture

**Commit:** `docs: document Android testing architecture`

**Files:**
- Modify: `docs/testing-architecture.md`

- [ ] **Step 1: Add Android layers and ownership.**

Document JVM architecture contracts, instrumented shell tests, shared support roots, and the boundary where Playwright remains authoritative.

- [ ] **Step 2: Add commands and CI behavior.**

Document the unit, instrumentation, combined, and optional emulator commands, plus the required JVM CI gate.

- [ ] **Step 3: Commit.**

```bash
git add -f docs/testing-architecture.md
git commit -m "docs: document Android testing architecture"
```

### Task 20: Document Android developer workflows

**Commit:** `docs: document Android developer workflows`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add local prerequisites and commands.**

Document Java 17 for Gradle, Android SDK/emulator requirements for instrumentation, and the exact Windows/Unix wrapper commands.

- [ ] **Step 2: Add CI expectations.**

Clarify that JVM tests and instrumentation compilation block CI, while connected emulator execution is optional in this phase.

- [ ] **Step 3: Commit.**

```bash
git add README.md
git commit -m "docs: document Android developer workflows"
```

## Final Verification

After all 20 commits are complete, run the complete affected gate from a clean dedicated worktree:

```bash
node --test scripts/*.test.mjs
cd android
./gradlew :app:testDebugUnitTest :app:assembleDebugAndroidTest --no-daemon --console=plain
cd ..
npm run lint
npm run typecheck
npm run test:fast
npm run test:backend:integration
npm run test:contract
git diff --check
```

If an emulator is available, also run:

```bash
cd android
./gradlew :app:connectedDebugAndroidTest --no-daemon --console=plain
```

Do not claim completion until the local results are fresh. Remote GitHub Actions verification is required after pushing when repository access is available.

## Execution Handoff

Implementation is intentionally paused after the spec and this plan are committed. When resumed, create a dedicated git worktree and use inline execution with `superpowers:executing-plans`, completing each task in order with a review checkpoint after every commit.
