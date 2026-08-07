"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { X, MapPin, ChevronLeft, ChevronRight } from "lucide-react";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => <div className="h-[180px] rounded-xl bg-slate-100 animate-pulse" />,
});

export interface Publication {
  id: string;
  type: "experience" | "place";
  title: string;
  description: string | null;
  place_name: string | null;
  region: string | null;
  images: string[] | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  rejection_reason?: string | null;
  created_at: string;
}

interface Props {
  pub: Publication;
  onClose: () => void;
}

export default function ViewPublicationModal({ pub, onClose }: Props) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const isExp = pub.type === "experience";
  const imgs = pub.images?.filter((s) => s.startsWith("http")) ?? [];
  const safeIdx = Math.min(slideIdx, Math.max(imgs.length - 1, 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        <button onClick={onClose}
          className="absolute top-4 left-4 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors">
          <X size={16} />
        </button>

        {/* Image area */}
        <div className="relative h-56 w-full overflow-hidden shrink-0 select-none"
          onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX === null || imgs.length <= 1) return;
            const diff = touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) setSlideIdx((i) => diff > 0 ? Math.min(i + 1, imgs.length - 1) : Math.max(i - 1, 0));
            setTouchStartX(null);
          }}>
          {imgs.length > 0 ? (
            <div className="flex h-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${(safeIdx / imgs.length) * 100}%)`, width: `${imgs.length * 100}%` }}>
              {imgs.map((url, i) => (
                <div key={i} className="h-full relative" style={{ width: `${100 / imgs.length}%` }}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <span className="absolute bottom-3 left-3 text-[10px] font-black uppercase tracking-wide bg-white/90 text-slate-700 px-2.5 py-1 rounded-full shadow border border-white/40">
                    Officiel
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className={`absolute inset-0 opacity-85 ${isExp ? "bg-gradient-to-br from-teal-500 to-emerald-400" : "bg-gradient-to-br from-blue-500 to-cyan-400"}`} />
              <span className="material-symbols-outlined text-white/25 absolute inset-0 flex items-center justify-center" style={{ fontSize: 110 }}>
                {isExp ? "hiking" : "location_on"}
              </span>
            </>
          )}
          {imgs.length > 1 && (
            <>
              <button type="button" onClick={() => setSlideIdx((i) => Math.max(i - 1, 0))} disabled={safeIdx === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all disabled:opacity-30">
                <ChevronLeft size={18} />
              </button>
              <button type="button" onClick={() => setSlideIdx((i) => Math.min(i + 1, imgs.length - 1))} disabled={safeIdx === imgs.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all disabled:opacity-30">
                <ChevronRight size={18} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {imgs.map((_, i) => (
                  <button key={i} type="button" onClick={() => setSlideIdx(i)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${i === safeIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-xl ${isExp ? "bg-teal-50 text-teal-700 border border-teal-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
              {isExp ? "Expérience" : "Lieu recommandé"}
            </span>
            {pub.status === "approved" && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700">Publié</span>}
            {pub.status === "pending" && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">En attente</span>}
            {pub.status === "rejected" && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600">Refusé</span>}
          </div>

          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight pr-8">{pub.title}</h2>

          {(pub.place_name || pub.region) && (
            <div className="flex items-center gap-1.5 text-slate-600 text-sm font-semibold">
              <MapPin size={14} className="text-primary shrink-0" />
              {[pub.place_name, pub.region].filter(Boolean).join(" — ")}
            </div>
          )}

          {pub.latitude && pub.longitude && (
            <div className="rounded-xl overflow-hidden border border-slate-100">
              <MapView lat={Number(pub.latitude)} lng={Number(pub.longitude)} label={pub.place_name ?? undefined} />
            </div>
          )}

          {pub.description && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{isExp ? "Récit" : "Description"}</p>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{pub.description}</p>
            </div>
          )}

          <p className="text-[11px] text-slate-400 font-medium">
            Publié le {new Date(pub.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end shrink-0">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
