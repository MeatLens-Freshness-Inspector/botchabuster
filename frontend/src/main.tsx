import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme } from "@/lib/themePreference";
import { prewarmModel } from "@/lib/offlineAnalysis";
import { scrubSensitiveAuthHashFromUrl } from "@/lib/authUrlHash";
import { Capacitor } from "@capacitor/core";

// Start in light mode; app router/auth layer will apply user preference from DB.
applyTheme(false);
// Immediately clear Supabase auth tokens from URL fragments to avoid accidental leakage.
scrubSensitiveAuthHashFromUrl();
// Start ONNX model warmup as early as possible in app boot.
prewarmModel();

if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
  document.body.classList.add('capacitor-android');
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
