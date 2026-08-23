"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { monTableauDeBord } from "@/lib/dashboard-path";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function init() {
      const accessToken = searchParams.get("accessToken");
      const refreshToken = searchParams.get("refreshToken");
      const dashboard = searchParams.get("dashboard");
      const user = searchParams.get("user");

      if (!accessToken || !refreshToken || !user) {
        router.push("/auth/login");
        return;
      }

      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      localStorage.setItem("user", user);

      const parsedUser = JSON.parse(user);

      const onboardingRoutes: Record<string, string> = {
        eco_traveler: "/onboarding/eco-traveler",
        guide: "/onboarding/guide",
        project: "/onboarding/project-owner",
      };
      const profileEndpoints: Record<string, string> = {
        eco_traveler: "/eco-traveler/profile",
        guide: "/guide/profile",
        project: "/project-owner/profile",
      };

      const profileEndpoint = profileEndpoints[parsedUser.role];
      const onboardingRoute = onboardingRoutes[parsedUser.role];

      if (profileEndpoint && onboardingRoute) {
        try {
          const profile = await apiFetch<{ is_onboarded?: boolean } | null>(profileEndpoint, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!profile || !profile.is_onboarded) {
            router.push(onboardingRoute);
          } else {
            router.push(monTableauDeBord());
          }
        } catch {
          router.push(onboardingRoute);
        }
      } else {
        router.push(monTableauDeBord());
      }
    }
    init();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-slate-500 font-medium">Connexion en cours…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
