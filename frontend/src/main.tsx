import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App, initializeAppRuntime } from "@/app";
import "./app/styles/globals.css";

initializeAppRuntime();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
