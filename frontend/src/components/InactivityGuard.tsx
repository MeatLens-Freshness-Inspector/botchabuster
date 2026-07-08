/**
 * InactivityGuard
 *
 * Locks the app automatically after 15 minutes of no interaction.
 * Must be mounted inside both <BrowserRouter> and <AuthProvider>.
 *
 * Activity events that reset the timer:
 *   mousemove, mousedown, keydown, touchstart, scroll, click
 *
 * Offline behaviour:
 *   The lock is purely local. Durable offline unlock artifacts remain so the
 *   user can re-authenticate locally within the approved 24-hour window.
 */

import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
] as const;

function useInactivitySignOut() {
  const { user, lock } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(async () => {
      await lock();
      navigate("/login");
      toast.info("Your session was locked due to inactivity.", { duration: 6000 });
    }, TIMEOUT_MS);
  }, [clearTimer, lock, navigate]);

  useEffect(() => {
    if (!user) {
      clearTimer();
      return;
    }

    resetTimer();

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true }),
    );

    return () => {
      clearTimer();
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer),
      );
    };
  }, [user, resetTimer, clearTimer]);
}

export function InactivityGuard() {
  useInactivitySignOut();
  return null;
}
