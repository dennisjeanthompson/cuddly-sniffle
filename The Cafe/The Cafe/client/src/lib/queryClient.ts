import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    let errorData;
    
    try {
      errorData = contentType?.includes('application/json') 
        ? await res.json() 
        : await res.text();
    } catch (e) {
      errorData = res.statusText;
    }
    
    const error = new Error(
      typeof errorData === 'object' 
        ? errorData.message || 'An error occurred'
        : errorData || res.statusText
    );
    
    (error as any).status = res.status;
    (error as any).data = errorData;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('API Request failed:', {
      url,
      method,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);

    // Check if response is JSON before parsing
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    } else {
      // If not JSON, try to parse anyway but handle errors
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse response as JSON:', text.substring(0, 100));
        throw new Error('Server returned non-JSON response');
      }
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // Real-time sync: refetch data every 30 seconds for active queries
      refetchInterval: 30000,
      // Refetch when window regains focus for real-time feel
      refetchOnWindowFocus: true,
      // Data is considered stale after 10 seconds
      staleTime: 10000,
      // Retry failed requests once
      retry: 1,
      // Keep data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: false,
      // After mutation success, automatically refetch related queries
      onSuccess: () => {
        // Invalidate common queries that might be affected
        queryClient.invalidateQueries();
      },
    },
  },
});

// Helper to invalidate specific query groups for real-time sync
export const invalidateQueries = {
  payroll: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/payroll'] });
    queryClient.invalidateQueries({ queryKey: ['/api/payroll/periods'] });
    queryClient.invalidateQueries({ queryKey: ['/api/payroll/entries'] });
  },
  shifts: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
    queryClient.invalidateQueries({ queryKey: ['/api/shifts/branch'] });
  },
  employees: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
    queryClient.invalidateQueries({ queryKey: ['/api/employees/stats'] });
  },
  notifications: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
  },
  timeOff: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/time-off-requests'] });
    queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
  },
  all: () => {
    queryClient.invalidateQueries();
  },
};
