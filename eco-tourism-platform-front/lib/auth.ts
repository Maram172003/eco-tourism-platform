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