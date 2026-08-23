"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Lieu = {
  id: string;
  place_name: string | null;
  description: string | null;
  region: string | null;
  image: string | null;
  latitude: number;
  longitude: number;
  author_name: string | null;
};

/** Même épingle que les autres cartes du site, pour rester cohérent. */
const PIN_HTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
  <ellipse cx="16" cy="40" rx="6" ry="2" fill="rgba(0,0,0,.2)"/>
  <path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 28 12 28S28 21 28 12C28 5.37 22.63 0 16 0z" fill="#10b981" stroke="white" stroke-width="2"/>
  <circle cx="16" cy="12" r="5" fill="white"/>
</svg>`;

function echapper(s: string) {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c),
  );
}

export default function PlacesMap() {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const carteRef = useRef<any>(null);
  const [cssPrete, setCssPrete] = useState(false);
  const [lieux, setLieux] = useState<Lieu[] | null>(null);

  // La feuille de style Leaflet est chargée à la demande, comme dans MapView.
  useEffect(() => {
    if (document.querySelector('link[href*="leaflet.css"]')) { setCssPrete(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.onload = () => setCssPrete(true);
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    apiFetch<Lieu[]>("/publications/places")
      .then((r) => setLieux(Array.isArray(r) ? r : []))
      .catch(() => setLieux([]));
  }, []);

  useEffect(() => {
    if (!cssPrete || !conteneurRef.current || !lieux || lieux.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");
    if (carteRef.current) { carteRef.current.remove(); carteRef.current = null; }

    const carte = L.map(conteneurRef.current, { scrollWheelZoom: false, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(carte);

    const icone = L.divIcon({ className: "", iconSize: [32, 42], iconAnchor: [16, 42], html: PIN_HTML });

    lieux.forEach((l) => {
      const marqueur = L.marker([l.latitude, l.longitude], { icon: icone }).addTo(carte);
      const vignette = l.image
        ? `<img src="${echapper(l.image)}" alt="" style="width:100%;height:96px;object-fit:cover;border-radius:.5rem;margin-bottom:.5rem" />`
        : "";
      marqueur.bindPopup(
        `<div style="min-width:190px;max-width:230px">
           ${vignette}
           <strong style="display:block;font-size:.875rem;color:#0f172a">${echapper(l.place_name ?? "Lieu")}</strong>
           ${l.author_name ? `<span style="font-size:.7rem;color:#64748b">Ajouté par ${echapper(l.author_name)}</span>` : ""}
         </div>`,
      );
    });

    // Le cadrage suit les lieux : aucune vue codée en dur à retoucher plus tard.
    const groupe = L.featureGroup(
      lieux.map((l) => L.marker([l.latitude, l.longitude])),
    );
    carte.fitBounds(groupe.getBounds(), { padding: [50, 50], maxZoom: 9 });

    carteRef.current = carte;
    return () => {
      try { carte.stop(); } catch {}
      try { carte.remove(); } catch {}
      carteRef.current = null;
    };
  }, [cssPrete, lieux]);

  return (
    <section id="univers" className="scroll-mt-24 py-24 px-6 md:px-20 lg:px-40 max-w-[1440px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Les lieux de la communauté
          </h2>
          <p className="text-slate-500">
            Des sites repérés et partagés par les éco-voyageurs, validés avant publication.
          </p>
        </div>
        {lieux && lieux.length > 0 && (
          <span className="inline-flex items-center gap-2 text-sm font-bold text-primary">
            <MapPin className="w-4 h-4" />
            {lieux.length} lieu{lieux.length > 1 ? "x" : ""} sur la carte
          </span>
        )}
      </div>

      <div className="rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-lg">
        {lieux === null ? (
          <div className="h-[480px] bg-slate-100 dark:bg-slate-700 animate-pulse" />
        ) : lieux.length === 0 ? (
          <div className="h-[480px] flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-800 text-slate-400">
            <MapPin className="w-10 h-10" />
            <p className="text-sm font-semibold">
              Aucun lieu partagé pour l'instant.
            </p>
          </div>
        ) : (
          <div ref={conteneurRef} style={{ height: "480px", width: "100%" }} />
        )}
      </div>
    </section>
  );
}
