import type { ReactNode } from "react";

type UserActionsProps = { children: ReactNode };

/** Keeps user mutation controls behind a stable widget-owned composition boundary. */
export function UserActions({ children }: UserActionsProps) {
  return <>{children}</>;
}
