"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getConsistentSession } from "@/lib/auth";

/**
 * Role-aware entry after "Réserver":
 * - eco_traveler → booking wizard
 * - guide / provider → their demandes list
 * - anonymous → login (then back here)
 */
function EntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const offerId = searchParams.get("offerId");
  const subtype = searchParams.get("subtype");
  const subtypesParam = searchParams.get("subtypes");

  useEffect(() => {
    const session = getConsistentSession();
    const subsFromUrl = subtypesParam
      ? subtypesParam.split(",").map((s) => s.trim()).filter(Boolean)
      : subtype
        ? [subtype]
        : [];
    const subsQ = subsFromUrl.length
      ? `&subtypes=${encodeURIComponent(subsFromUrl.sort().join(","))}`
      : "";
    if (!session) {
      const back = offerId
        ? `/reservations/entry?offerId=${encodeURIComponent(offerId)}${subsQ}`
        : "/reservations/entry";
      window.location.replace(`/auth/login?redirect=${encodeURIComponent(back)}`);
      return;
    }
    if (session.role === "guide") {
      window.location.replace("/dashboard/guide/reservations");
      return;
    }
    if (session.role === "provider") {
      window.location.replace("/dashboard/provider/reservations");
      return;
    }
    if (session.role === "eco_traveler" && offerId) {
      window.location.replace(`/reservations/new?offerId=${encodeURIComponent(offerId)}${subsQ}`);
      return;
    }
    if (session.role === "eco_traveler") {
      window.location.replace("/dashboard/ecovoyageur/reservations");
      return;
    }
    router.replace("/");
  }, [offerId, subtype, subtypesParam, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

export default function ReservationEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <EntryContent />
    </Suspense>
  );
}
