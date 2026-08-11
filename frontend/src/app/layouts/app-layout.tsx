import React, { type ReactNode } from "react";

export type AppLayoutProps = {
  children: ReactNode;
  bottomNavigation: ReactNode;
  assistant: ReactNode;
};

export function AppLayout({ children, bottomNavigation, assistant }: AppLayoutProps) {
  return (
    <>
      {children}
      {bottomNavigation}
      {assistant}
    </>
  );
}
