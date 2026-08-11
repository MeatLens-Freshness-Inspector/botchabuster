import { QueryClient } from "@tanstack/react-query";

export function shouldRetryQuery(failureCount: number, isOnline: boolean): boolean {
  return isOnline && failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      retry: (failureCount) => shouldRetryQuery(failureCount, navigator.onLine),
    },
  },
});
