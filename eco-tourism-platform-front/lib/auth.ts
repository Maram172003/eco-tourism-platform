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
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    const stored = JSON.parse(rawUser);

    // Le serveur n'identifie l'appelant que par le « sub » du jeton : si le
    // compte affiché n'est pas celui-là, toute écriture partirait au mauvais
    // endroit. On préfère redemander une connexion.
    if (!payload?.sub || !stored?.id || payload.sub !== stored.id) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      return null;
    }
    return { userId: payload.sub, role: stored.role };
  } catch {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    return null;
  }
}
