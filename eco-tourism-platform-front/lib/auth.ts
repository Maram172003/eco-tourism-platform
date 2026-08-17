import { apiFetch } from "./api";

export type RegisterPayload = {
  email: string;
  password: string;
  role: "eco_traveler" | "provider" | "guide";
};

export type LoginPayload = {
  email: string;
  password: string;
};

export async function registerUser(payload: RegisterPayload) {
  return apiFetch<{
    message: string;
  
  }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: LoginPayload) {
  return apiFetch<{
    access_token: string;
    refresh_token: string;
    dashboard: string;
    user: {
      id: string;
      email: string;
      role: string;
      status: string;
    };
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}



export async function refreshToken(refresh_token: string) {
  return apiFetch<{
    access_token: string;
    refresh_token: string;
  }>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token }),
  });
}

export async function logoutUser(accessToken: string) {
  return apiFetch<{ message: string }>("/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
function clearSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * Vérifie que le jeton présent dans localStorage désigne bien le compte qui y
 * est stocké. Sans ce contrôle, un onglet resté ouvert sur un autre compte
 * laisse son jeton dans localStorage — partagé par tout le domaine — et
 * l'onboarding écrit alors dans le profil de ce compte-là.
 *
 * Retourne l'identifiant de l'utilisateur si la session est cohérente,
 * sinon purge la session et retourne null.
 */
export function getConsistentSession(): { userId: string; role: string } | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("access_token");
  const rawUser = localStorage.getItem("user");
  if (!token || !rawUser) return null;

  try {
    const payload = decodeJwtPayload(token);
    const stored = JSON.parse(rawUser);
    if (!payload?.sub || !stored?.id || String(payload.sub) !== String(stored.id)) {
      clearSession();
      return null;
    }
    // Expired JWT → treat as logged out
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      clearSession();
      return null;
    }
    const role = String(payload.role ?? stored.role ?? "");
    if (!role) {
      clearSession();
      return null;
    }
    return { userId: String(payload.sub), role };
  } catch {
    clearSession();
    return null;
  }
}

/** Path to open when clicking "Réserver" on an offer. */
export function getReservationEntryPath(offerId: string, subtypes?: string[]): string {
  const subsQ =
    subtypes?.length
      ? `&subtypes=${encodeURIComponent([...subtypes].sort().join(","))}`
      : "";
  const entryPath = `/reservations/entry?offerId=${offerId}${subsQ}`;
  const session = getConsistentSession();
  if (!session) {
    return `/auth/login?redirect=${encodeURIComponent(entryPath)}`;
  }
  if (session.role === "eco_traveler") {
    return `/reservations/new?offerId=${offerId}${subsQ}`;
  }
  if (session.role === "guide") return "/dashboard/guide/reservations";
  if (session.role === "provider") return "/dashboard/provider/reservations";
  return "/reservations";
}

/** Path to open when clicking "Réserver" on a circuit module. */
export function getCircuitReservationEntryPath(circuitId: string, subtypes?: string[]): string {
  const subsQ =
    subtypes?.length
      ? `&subtypes=${encodeURIComponent([...subtypes].sort().join(","))}`
      : "";
  const entryPath = `/reservations/entry?circuitId=${circuitId}${subsQ}`;
  const session = getConsistentSession();
  if (!session) {
    return `/auth/login?redirect=${encodeURIComponent(entryPath)}`;
  }
  if (session.role === "eco_traveler") {
    return `/reservations/new?circuitId=${circuitId}${subsQ}`;
  }
  if (session.role === "guide") return "/dashboard/guide/reservations";
  if (session.role === "provider") return "/dashboard/provider/reservations";
  return "/reservations";
}

/** Navigate to reservation entry (hard redirect). */
export function goToReservation(offerId: string, subtypes?: string | string[]) {
  const list = typeof subtypes === "string"
    ? (subtypes ? [subtypes] : [])
    : (subtypes ?? []);
  window.location.assign(getReservationEntryPath(offerId, list.length ? list : undefined));
}

/** Navigate to circuit reservation entry (hard redirect). */
export function goToCircuitReservation(circuitId: string, subtypes?: string | string[]) {
  const list = typeof subtypes === "string"
    ? (subtypes ? [subtypes] : [])
    : (subtypes ?? []);
  window.location.assign(getCircuitReservationEntryPath(circuitId, list.length ? list : undefined));
}

/** After login, route booking entry by role (list for guide/provider). */
export function resolvePostLoginRedirect(
  redirectUrl: string | null | undefined,
  role: string,
  fallback: string,
): string {
  if (!redirectUrl) return fallback;

  const isBookingOrEntry =
    redirectUrl.startsWith("/reservations/new") ||
    redirectUrl.includes("/reservations/new?") ||
    redirectUrl.includes("circuitId=") ||
    redirectUrl.startsWith("/reservations/entry") ||
    redirectUrl.includes("/reservations/entry?");

  if (isBookingOrEntry) {
    if (role === "guide") return "/dashboard/guide/reservations";
    if (role === "provider") return "/dashboard/provider/reservations";
    if (role !== "eco_traveler") return fallback;
  }
  return redirectUrl;
}
