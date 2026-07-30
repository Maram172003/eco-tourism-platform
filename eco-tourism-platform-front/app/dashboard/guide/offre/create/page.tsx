"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateOfferRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/guide"); }, [router]);
  return null;
}
