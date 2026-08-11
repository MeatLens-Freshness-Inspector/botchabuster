const SESSION_KEY_PREFIX = "meatlens:onboarding-skip:";

function buildSessionKey(userId: string): string {
  return `${SESSION_KEY_PREFIX}${userId}`;
}

export function hasSkippedOnboardingForSession(userId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(buildSessionKey(userId)) === "1";
}

export function markOnboardingSkippedForSession(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(buildSessionKey(userId), "1");
}

export function clearOnboardingSkippedForSession(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(buildSessionKey(userId));
}
