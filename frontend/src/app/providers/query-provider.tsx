import React, { type ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";

import { queryClient as appQueryClient } from "../config/query-client";

type QueryProviderProps = {
  children: ReactNode;
  client?: QueryClient;
};

export function QueryProvider({ children, client = appQueryClient }: QueryProviderProps) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
