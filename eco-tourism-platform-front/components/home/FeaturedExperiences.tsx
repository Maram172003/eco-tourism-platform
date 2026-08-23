"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import ExperienceCard, { type ExperienceCardProps } from "./ExperienceCard";
import { OfferModal, CircuitModal } from "@/components/destinations/DetailModals";
import { apiFetch } from "@/lib/api";

/** La carte affichée, plus l'objet brut que la fenêtre de détail attend. */
type Carte = ExperienceCardProps & { id: string; brut: any };

/** Les listes publiques renvoient tantôt un tableau, tantôt une enveloppe. */
function liste(v: any): any[] {
  return Array.isArray(v) ? v : (v?.data ?? v?.items ?? []);
}

export default function FeaturedExperiences() {
  const router = useRouter();
  const [cartes, setCartes] = useState<Carte[] | null>(null);
  const [ouverte, setOuverte] = useState<Carte | null>(null);

  useEffect(() => {
    (async () => {
      const [offres, circuits] = await Promise.all([
        apiFetch<any[]>("/offers").catch(() => []),
        apiFetch<any[]>("/circuits/all-public").catch(() => []),
      ]);

      const cartesOffres: Carte[] = liste(offres).map((o) => ({
        id: o.id,
        kind: "offer" as const,
        image: Array.isArray(o.images) && o.images.length ? o.images[0] : null,
        location: o.region ?? null,
        title: o.title,
        author: o.org_name ?? o.author_name ?? null,
        score: o.sustainability_score ?? null,
        description: o.description ?? null,
        price: o.price != null ? Number(o.price) : null,
        priceUnit: o.price_type ?? undefined,
        brut: o,
      }));

      const cartesCircuits: Carte[] = liste(circuits).map((c) => ({
        id: c.id,
        kind: "circuit" as const,
        image: c.cover_image ?? null,
        location: c.nb_jours ? `${c.nb_jours} jour${c.nb_jours > 1 ? "s" : ""}` : null,
        title: c.title,
        author: c.author_name ?? null,
        score: c.sustainability_score ?? null,
        description: c.description ?? null,
        price: null,
        brut: c,
      }));

      // Le meilleur score d'abord : c'est le critère que la plateforme met en avant.
      setCartes(
        [...cartesOffres, ...cartesCircuits]
          .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
          .slice(0, 6),
      );
    })();
  }, []);

  return (
    <section id="publications" className="scroll-mt-24 py-24 px-6 md:px-20 lg:px-40 max-w-[1440px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Les mieux notées
          </h2>
          <p className="text-slate-500">
            Offres et circuits publiés sur la plateforme, classés par score de durabilité.
          </p>
        </div>
        <button
          onClick={() => router.push("/destinations")}
          className="flex items-center gap-2 font-bold text-primary hover:gap-3 transition-all"
        >
          Voir tout <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {cartes === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="aspect-video bg-slate-100 dark:bg-slate-700 animate-pulse" />
              <div className="p-6 space-y-3">
                <div className="h-5 w-2/3 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
                <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : cartes.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Aucune publication pour le moment — les offres et circuits validés apparaîtront ici.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cartes.map((c) => (
            <ExperienceCard key={`${c.kind}-${c.id}`} {...c} onOpen={() => setOuverte(c)} />
          ))}
        </div>
      )}

      {/* Mêmes fenêtres que sur la page Destinations. */}
      {ouverte?.kind === "offer" && (
        <OfferModal offer={ouverte.brut} onClose={() => setOuverte(null)} />
      )}
      {ouverte?.kind === "circuit" && (
        <CircuitModal circuit={ouverte.brut} onClose={() => setOuverte(null)} />
      )}
    </section>
  );
}
