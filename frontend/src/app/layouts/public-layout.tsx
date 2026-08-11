import React, { type ReactNode } from "react";

export type PublicLayoutProps = {
  children: ReactNode;
};

export function PublicLayout({ children }: PublicLayoutProps) {
  return <>{children}</>;
}
