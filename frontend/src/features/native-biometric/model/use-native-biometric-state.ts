import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { nativeBiometricAdapter } from "../api/native-biometric-factory";

export function useNativeBiometricState() {
  const [nativeBiometricAvailable, setNativeBiometricAvailable] = useState(false);
  const [nativeBiometricEnrolled, setNativeBiometricEnrolled] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let mounted = true;
    void (async () => {
      try {
        const availability = await nativeBiometricAdapter.checkAvailability();
        const enrolled = availability.isNative && await nativeBiometricAdapter.hasRecord();
        if (!mounted) return;
        setNativeBiometricAvailable(availability.isAvailable);
        setNativeBiometricEnrolled(enrolled);
      } catch {
        if (!mounted) return;
        setNativeBiometricAvailable(false);
        setNativeBiometricEnrolled(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    nativeBiometricAvailable,
    nativeBiometricEnrolled,
    setNativeBiometricEnrolled,
  };
}
