# Biometric login

MeatLens supports two device-unlock experiences:

- WebAuthn passkeys remain the online, server-verified sign-in method for browsers and native platforms.
- Native device biometrics provide a local vault unlock on Capacitor Android and iOS builds.

Native biometric login is available only after an online session has been established. Enable it from Profile → Device Biometrics. MeatLens stores a versioned session record and protected offline bootstrap copy in the native secure-storage boundary; biometric material never enters JavaScript or the backend.

When the device is online, a successful biometric unlock restores the saved session and fetches fresh account state. When the device is offline, the same unlock opens the existing offline-first session until its configured offline expiry. Reconnect upgrades a valid saved session back to the online state.

The native vault is cleared when biometric login is disabled, the user signs out, a different account signs in, or the stored record is corrupt. A user can always return to password or passkey sign-in after a biometric cancellation, lockout, unavailable device, or expired vault.

## Platform setup

- iOS declares `NSFaceIDUsageDescription` in `ios/App/App/Info.plist`.
- Android declares `android.permission.USE_BIOMETRIC` in `android/app/src/main/AndroidManifest.xml`.
- Native dependencies are installed in the frontend workspace. Run the project’s normal Capacitor sync command after installing dependencies before opening Android Studio or Xcode.

Native behavior must be verified on a device or simulator configured with a device credential and enrolled biometric. Browser builds intentionally do not render the native biometric controls.
