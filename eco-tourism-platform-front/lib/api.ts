const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function doRefresh(): Promise<string> {
  const refresh_token = localStorage.getItem("refresh_token");
  if (!refresh_token) throw new Error("No refresh token");

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });

  if (!res.ok) throw new Error("Refresh failed");

  const data = await res.json();
  localStorage.setItem("access_token", data.access_token);
  if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
  return data.access_token;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const makeRequest = (tokenOverride?: string) => {
    const token =
      tokenOverride ??
      (typeof window !== "undefined" ? localStorage.getItem("access_token") : null);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    return fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  };

  let res = await makeRequest();

  if (res.status === 401) {
    const hasSession = typeof window !== "undefined" && !!localStorage.getItem("refresh_token");

    if (!hasSession) {
      const errData = await res.json().catch(() => null);
      const msg = errData?.message || errData?.error || "Identifiants incorrects.";
      throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
    }

    // If another request is already refreshing, wait for it
    if (isRefreshing) {
      const newToken = await new Promise<string>((resolve, reject) => {
        refreshQueue.push((token) => (token ? resolve(token) : reject()));
      });
      res = await makeRequest(newToken);
    } else {
      isRefreshing = true;
      try {
        const newToken = await doRefresh();
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];
        res = await makeRequest(newToken);
      } catch {
        refreshQueue.forEach((cb) => cb(""));
        refreshQueue = [];
        // Refresh failed — clear session and redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");
          window.location.href = "/auth/login";
        }
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      } finally {
        isRefreshing = false;
      }
    }
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.message || data?.error || "Une erreur est survenue";
    const msgStr = typeof message === "object" && message !== null
      ? (message.message ?? JSON.stringify(message))
      : Array.isArray(message) ? message.join(", ") : message;
    throw new ApiError(msgStr, res.status, data);
  }

  return data;
}
