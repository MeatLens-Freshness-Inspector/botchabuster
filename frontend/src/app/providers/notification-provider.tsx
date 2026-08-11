import React, { type ReactNode } from "react";

import { Toaster as SonnerToaster } from "@/shared/ui/sonner";
import { Toaster } from "@/shared/ui/toaster";

type NotificationProviderProps = {
  children: ReactNode;
};

export function NotificationProvider({ children }: NotificationProviderProps) {
  return (
    <>
      <Toaster />
      <SonnerToaster />
      {children}
    </>
  );
}
