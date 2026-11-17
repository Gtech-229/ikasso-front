import {
  defaultShouldDehydrateQuery,
  environmentManager,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { cache } from "react";
import { toast } from "sonner";
import { isApiError, isClientError, isForbidden } from "@/lib/api/errors";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        // A 401 is handled by the refresh queue (replay or redirect to login); a
        // 403 is shown by the page as the Forbidden view.
        if (
          environmentManager.isServer() ||
          (isApiError(error) && error.statusCode === 401) ||
          isForbidden(error)
        ) {
          return;
        }
        // Same id for the same message: several queries failing together (API
        // down) show one toast, not one each.
        toast.error(error.message, { id: error.message });
      },
    }),
    defaultOptions: {
      queries: {
        // Hydrated server data stays fresh, so the browser does not refetch it at once.
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        // A 4xx will not change on retry; other failures get one more try in the
        // browser. Never on the server: a failed prefetch must not hold the page.
        retry: (failureCount, error) =>
          !environmentManager.isServer() && !isClientError(error) && failureCount < 1,
      },
      dehydrate: {
        // Also send pending queries so streamed server prefetches reach the client.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
    },
  });
}

// One client per request on the server, so data never leaks between admins.
const getServerQueryClient = cache(makeQueryClient);

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) return getServerQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
