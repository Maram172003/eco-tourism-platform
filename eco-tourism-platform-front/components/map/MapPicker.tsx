"use client";

import { useEffect, useRef, useState } from "react";

const GEO_STOP = new Set([
  "de","du","des","le","la","les","el","al","d","l","sur","en","au","aux",
  "parking","forestier","route","chemin","col","vallée","cascade","piste",
  "cimetière","mosquée","église","chapelle","ruines","ancienne","ancien",
  "national","naturel","naturelle","historique","historiques","régional","régionale",
  "archéologique","international","municipal","municipale","provincial","provinciale",
  "oasis","canyon","chott","gorges","parc","dune","dunes","réserve",
  "forêt","lac","mer","mont","plage","site","souk","porte","zone",
  "ksour","ksar","musée","grotte","sebkha","jebel","djebel",
]);

function simplifyQuery(q: string): string {
  return q.split(/\s+/).filter((w) => !GEO_STOP.has(w.toLowerCase())).join(" ").trim();
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
    const data = await res.json();
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

async function tryFetch(q: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function searchPlace(
  query: string
): Promise<{ lat: number; lng: number; display_name: string } | null> {
  const label = query.trim();

  let c = await tryFetch(label);
  if (c) return { ...c, display_name: label };

  const beforeComma = label.split(",")[0].trim();
  if (beforeComma !== label) {
    c = await tryFetch(beforeComma);
    if (c) return { ...c, display_name: label };
  }

  const commaIdx = label.indexOf(",");
  if (commaIdx !== -1) {
    const afterComma = label.slice(commaIdx + 1).trim();
    if (afterComma) { c = await tryFetch(afterComma); if (c) return { ...c, display_name: label }; }
  }

  const beforeDash = label.split(/\s*[-–]\s*/)[0].trim();
  if (beforeDash !== label) {
    c = await tryFetch(beforeDash);
    if (c) return { ...c, display_name: label };
  }

  const stripped = simplifyQuery(label);
  if (stripped && stripped !== label) {
    c = await tryFetch(stripped);
    if (c) return { ...c, display_name: label };
  }

  if (beforeComma !== label) {
    const strippedComma = simplifyQuery(beforeComma);
    if (strippedComma && strippedComma !== beforeComma) {
      c = await tryFetch(strippedComma);
      if (c) return { ...c, display_name: label };
    }
  }

  const properWords = label
    .replace(/[,\-–]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !GEO_STOP.has(w.toLowerCase()));
  if (properWords.length > 0 && properWords.join(" ") !== stripped) {
    c = await tryFetch(properWords.join(" "));
    if (c) return { ...c, display_name: label };
  }

  if (properWords.length > 1) {
    c = await tryFetch(properWords[0]);
    if (c) return { ...c, display_name: label };
  }

  return null;
}

export default function MapPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number, address: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const destroyedRef = useRef(false);

  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    destroyedRef.current = false;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");

    const markerIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    const container = containerRef.current!;
    const map = L.map(container, {
      center: lat !== null && lng !== null ? [lat, lng] : [33.8869, 9.5375],
      zoom: lat !== null ? 13 : 6,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    if (lat !== null && lng !== null) {
      markerRef.current = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
    }

    map.on("click", async (e: any) => {
      if (destroyedRef.current) return;
      const clat = e.latlng.lat;
      const clng = e.latlng.lng;
      if (markerRef.current) {
        markerRef.current.setLatLng([clat, clng]);
      } else {
        markerRef.current = L.marker([clat, clng], { icon: markerIcon }).addTo(map);
      }
      const address = await reverseGeocode(clat, clng);
      if (!destroyedRef.current) onPickRef.current(clat, clng, address);
    });

    mapRef.current = map;

    return () => {
      destroyedRef.current = true;
      try { map.stop(); } catch {}
      try { map.remove(); } catch {}
      mapRef.current = null;
      markerRef.current = null;
      try { document.head.removeChild(link); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || destroyedRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");
    const markerIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
    if (lat !== null && lng !== null) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
      }
      try { map.flyTo([lat, lng], 14, { duration: 1 }); } catch {}
    }
  }, [lat, lng]);

  async function handleSearch() {
    const q = searchRef.current?.value.trim();
    if (!q) return;
    setSearching(true);
    setSearchErr("");
    const result = await searchPlace(q);
    if (destroyedRef.current) return;
    setSearching(false);
    if (!result) { setSearchErr("Lieu introuvable. Essayez un autre nom."); return; }
    const map = mapRef.current;
    if (map && !destroyedRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const L = require("leaflet") as typeof import("leaflet");
      const markerIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      if (markerRef.current) {
        markerRef.current.setLatLng([result.lat, result.lng]);
      } else {
        markerRef.current = L.marker([result.lat, result.lng], { icon: markerIcon }).addTo(map);
      }
      try { map.flyTo([result.lat, result.lng], 14, { duration: 1 }); } catch {}
      onPickRef.current(result.lat, result.lng, result.display_name);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); handleSearch(); }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={searchRef}
          type="text"
          placeholder="Rechercher un lieu…"
          defaultValue=""
          onKeyDown={handleKeyDown}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 bg-primary text-white text-xs font-extrabold rounded-xl hover:bg-primary/90 disabled:opacity-50 shrink-0"
        >
          {searching ? "…" : "Chercher"}
        </button>
      </div>
      {searchErr && <p className="text-xs text-red-500 font-semibold">{searchErr}</p>}
      <div
        ref={containerRef}
        className="rounded-2xl overflow-hidden border border-slate-200"
        style={{ height: "220px", width: "100%" }}
      />
      <p className="text-[10px] text-slate-400 font-medium">
        Cliquez sur la carte <span className="text-slate-300">ou</span> recherchez un lieu pour positionner le marqueur.
      </p>
    </div>
  );
}
