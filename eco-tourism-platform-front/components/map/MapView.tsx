"use client";

import { useEffect, useRef, useState } from "react";

const PIN_HTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
  <ellipse cx="16" cy="40" rx="6" ry="2" fill="rgba(0,0,0,.2)"/>
  <path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 28 12 28S28 21 28 12C28 5.37 22.63 0 16 0z" fill="#10b981" stroke="white" stroke-width="2"/>
  <circle cx="16" cy="12" r="5" fill="white"/>
</svg>`;

export default function MapView({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [cssReady, setCssReady] = useState(false);

  useEffect(() => {
    if (document.querySelector('link[href*="leaflet.css"]')) { setCssReady(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.onload = () => setCssReady(true);
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!cssReady || !containerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    const map = L.map(containerRef.current, { scrollWheelZoom: false, zoomControl: true });
    map.setView([lat, lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const icon = L.divIcon({ className: "", iconSize: [32, 42], iconAnchor: [16, 42], html: PIN_HTML });
    const marker = L.marker([lat, lng], { icon }).addTo(map);
    if (label) marker.bindTooltip(label, { permanent: true, direction: "top", offset: [0, -44], className: "leaflet-meeting-label" });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [cssReady, lat, lng, label]);

  return (
    <div
      ref={containerRef}
      style={{ height: "220px", width: "100%", borderRadius: "0.75rem" }}
      className={cssReady ? "" : "bg-slate-100 animate-pulse"}
    />
  );
}
