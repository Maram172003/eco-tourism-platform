"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
    const data = await res.json();
    const a = data.address ?? {};
    return (
      a.city || a.town || a.village || a.municipality || a.county ||
      data.display_name?.split(",")[0] ||
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    );
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

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

function simplify(q: string): string {
  return q.split(/\s+/).filter((w) => !GEO_STOP.has(w.toLowerCase())).join(" ").trim();
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

async function searchPlace(query: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const label = query.trim();

  // 1 — requête exacte
  let coords = await tryFetch(label);
  if (coords) return { ...coords, label };

  // 2 — avant la première virgule
  const beforeComma = label.split(",")[0].trim();
  if (beforeComma !== label) {
    coords = await tryFetch(beforeComma);
    if (coords) return { ...coords, label };
  }

  // 3 — après la première virgule
  const commaIdx = label.indexOf(",");
  if (commaIdx !== -1) {
    const afterComma = label.slice(commaIdx + 1).trim();
    if (afterComma) { coords = await tryFetch(afterComma); if (coords) return { ...coords, label }; }
  }

  // 4 — avant le tiret
  const beforeDash = label.split(/\s*[-–]\s*/)[0].trim();
  if (beforeDash !== label) {
    coords = await tryFetch(beforeDash);
    if (coords) return { ...coords, label };
  }

  // 5 — simplifié (sans mots génériques)
  const stripped = simplify(label);
  if (stripped && stripped !== label) {
    coords = await tryFetch(stripped);
    if (coords) return { ...coords, label };
  }

  // 6 — avant-virgule simplifié
  if (beforeComma !== label) {
    const strippedComma = simplify(beforeComma);
    if (strippedComma && strippedComma !== beforeComma) {
      coords = await tryFetch(strippedComma);
      if (coords) return { ...coords, label };
    }
  }

  // 7 — avant-tiret simplifié
  if (beforeDash !== label) {
    const strippedDash = simplify(beforeDash);
    if (strippedDash && strippedDash !== beforeDash) {
      coords = await tryFetch(strippedDash);
      if (coords) return { ...coords, label };
    }
  }

  // 8 — mots longs uniquement (noms propres probables, ≥4 chars, non-stop)
  const properWords = label
    .replace(/[,\-–]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !GEO_STOP.has(w.toLowerCase()));
  const strippedFull = simplify(label);
  if (properWords.length > 0 && properWords.join(" ") !== strippedFull) {
    coords = await tryFetch(properWords.join(" "));
    if (coords) return { ...coords, label };
  }

  // 9 — le premier mot propre seul
  if (properWords.length > 1) {
    coords = await tryFetch(properWords[0]);
    if (coords) return { ...coords, label };
  }

  return null;
}

export default function MultiLocationPicker({
  value,
  onChange,
  hint,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  hint?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markersRef   = useRef<L.Marker[]>([]);
  // Mutable internal list — avoids stale-closure bugs on rapid/double clicks
  const labelsRef    = useRef<string[]>([...value]);
  // Stable addEntry function created inside useEffect (has access to L + pinIcon)
  const addEntryRef  = useRef<((lat: number, lng: number, label: string) => void) | null>(null);
  const onChangeRef  = useRef(onChange);
  onChangeRef.current = onChange;

  const [query,        setQuery]        = useState("");
  const [searching,    setSearching]    = useState(false);
  const [searchErr,    setSearchErr]    = useState("");
  const [searchResult, setSearchResult] = useState<{ lat: number; lng: number; label: string } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");

    const pinIcon = L.icon({
      iconUrl:    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize:   [25, 41],
      iconAnchor: [12, 41],
      popupAnchor:[1, -34],
      shadowSize: [41, 41],
    });

    const link = document.createElement("link");
    link.rel   = "stylesheet";
    link.href  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const map = L.map(containerRef.current!, {
      center:          [33.8869, 9.5375],
      zoom:            6,
      doubleClickZoom: false, // ← prevents double-click from zooming AND from firing two click events
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    // Toggle : 1er clic → épingle, 2e clic sur même lieu → supprime
    function addEntry(lat: number, lng: number, label: string) {
      // Garde : la carte a été détruite (démontage) → ignorer
      if (!mapRef.current) return;
      const existingIdx = labelsRef.current.indexOf(label);
      if (existingIdx !== -1) {
        // Lieu déjà présent → on le retire
        const marker = markersRef.current[existingIdx];
        if (marker) { marker.remove(); markersRef.current.splice(existingIdx, 1); }
        labelsRef.current = labelsRef.current.filter((_, i) => i !== existingIdx);
        onChangeRef.current([...labelsRef.current]);
        return;
      }
      // Nouveau lieu → on l'ajoute
      const marker = L.marker([lat, lng], { icon: pinIcon, interactive: false }).addTo(map);
      marker.bindPopup(`<b>${label}</b>`).openPopup();
      markersRef.current.push(marker);
      labelsRef.current = [...labelsRef.current, label];
      onChangeRef.current([...labelsRef.current]);
    }

    addEntryRef.current = addEntry;

    map.on("click", async (e) => {
      const { lat, lng } = e.latlng;
      const label = await reverseGeocode(lat, lng);
      addEntry(lat, lng, label);
    });

    mapRef.current = map;

    return () => {
      addEntryRef.current = null;
      mapRef.current = null;       // annuler avant map.remove() pour bloquer les callbacks async en vol
      markersRef.current = [];
      try { map.remove(); } catch {}
      try { document.head.removeChild(link); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchErr("");
    setSearchResult(null);
    const result = await searchPlace(q);
    setSearching(false);
    if (!result) { setSearchErr("Lieu introuvable. Essayez un autre nom."); return; }
    setSearchResult(result);
    mapRef.current?.flyTo([result.lat, result.lng], 11, { duration: 1 });
  }

  function addSearchResult() {
    if (!searchResult) return;
    addEntryRef.current?.(searchResult.lat, searchResult.lng, searchResult.label);
    setSearchResult(null);
    setQuery("");
  }

  function remove(i: number) {
    const marker = markersRef.current[i];
    if (marker) { marker.remove(); markersRef.current.splice(i, 1); }
    labelsRef.current = labelsRef.current.filter((_, j) => j !== i);
    onChange([...labelsRef.current]);
  }

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchErr(""); setSearchResult(null); }}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
            placeholder="Rechercher un lieu…"
            className="w-full pl-9 pr-4 py-2.5 bg-surface-container border-none rounded-xl text-sm focus:ring-2 focus:ring-primary text-slate-800 placeholder:text-slate-400 font-medium"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="px-4 py-2.5 bg-primary text-slate-900 text-xs font-extrabold rounded-xl hover:bg-primary/90 disabled:opacity-50 shrink-0 transition-all"
        >
          {searching ? "…" : "Chercher"}
        </button>
      </div>
      {searchErr && <p className="text-xs text-red-500 font-semibold">{searchErr}</p>}

      {/* Suggestion après recherche */}
      {searchResult && (
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary text-base shrink-0">location_on</span>
            <span className="text-sm font-bold text-slate-800 truncate">{searchResult.label}</span>
          </div>
          <button
            type="button"
            onClick={addSearchResult}
            className="px-3 py-1 bg-primary text-slate-900 text-xs font-extrabold rounded-lg hover:bg-primary/90 transition-all shrink-0"
          >
            + Ajouter
          </button>
        </div>
      )}

      {/* Map */}
      <div
        ref={containerRef}
        className="rounded-2xl overflow-hidden border border-slate-200"
        style={{ height: "220px", width: "100%" }}
      />
      <p className="text-[10px] text-slate-400 font-medium">
        {hint ?? "Recherchez pour naviguer sur la carte, puis cliquez pour épingler un lieu."}
      </p>

      {/* Chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((loc, i) => (
            <span
              key={i}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold border border-primary/20"
            >
              <span className="material-symbols-outlined text-sm">location_on</span>
              {loc}
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-0.5 hover:text-red-500 transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
