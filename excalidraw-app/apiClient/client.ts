const API_BASE = "/api";

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
    },
    credentials: "include", // Send cookies (for Authelia session)
  });

  if (!response.ok) {
    // Session expired — redirect to Authelia login directly.
    // Guard against redirect loops: only redirect once per 5 seconds.
    if (response.status === 401) {
      const lastRedirect = Number(
        sessionStorage.getItem("_auth_redirect_ts") || "0",
      );
      if (Date.now() - lastRedirect < 5000) {
        // Already redirected recently — don't loop, just throw
        throw new ApiError(401, "Session expired. Please refresh the page.");
      }
      sessionStorage.setItem("_auth_redirect_ts", String(Date.now()));
      const authPortal =
        import.meta.env.VITE_APP_AUTH_URL ||
        `https://auth.${window.location.hostname
          .split(".")
          .slice(-2)
          .join(".")}`;
      window.location.href = `${authPortal}/?rd=${encodeURIComponent(
        window.location.href,
      )}`;
      return new Promise<never>(() => {});
    }
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    throw new ApiError(
      response.status,
      data?.error || `HTTP ${response.status}`,
      data,
    );
  }

  return response.json() as Promise<T>;
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers:
      body instanceof FormData ? {} : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

/**
 * Fetch a binary file from the API. Returns a Blob.
 */
export async function getBlob(path: string): Promise<Blob> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status}`);
  }
  return response.blob();
}

export { ApiError };
