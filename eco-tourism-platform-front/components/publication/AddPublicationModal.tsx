"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { X, MapPin, Send } from "lucide-react";
import { apiFetch } from "@/lib/api";

const MapPicker = dynamic(
  () => import("@/components/map/MapPicker"),
  { ssr: false, loading: () => <div className="h-[268px] rounded-2xl bg-slate-100 animate-pulse" /> }
);

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
  type: "experience" | "place";
  token: string;
  onClose: () => void;
  onSuccess: (pub: Publication) => void;
}

export default function AddPublicationModal({ type, token, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({ title: "", description: "", place_name: "" });
  const [titleErr, setTitleErr] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [coverIdx, setCoverIdx] = useState(0);
  const [mapLat, setMapLat] = useState<number | null>(null);
  const [mapLng, setMapLng] = useState<number | null>(null);

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/upload`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }
    );
    if (!res.ok) throw new Error("Upload échoué");
    const data = await res.json();
    if (!data?.url || typeof data.url !== "string") throw new Error("URL d'image invalide après upload");
    return data.url;
  }

  function handleClose() {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    onClose();
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.title.trim()) { setTitleErr("Le titre est obligatoire."); return; }
    setError(""); setSaving(true);
    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await Promise.all(images.map((img) => uploadImage(img.file)));
        const cover = imageUrls[coverIdx] ?? imageUrls[0];
        imageUrls = [cover, ...imageUrls.filter((u) => u !== cover)];
      }
      const created = await apiFetch<Publication>("/publications", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          place_name: form.place_name.trim() || undefined,
          latitude: mapLat ?? undefined,
          longitude: mapLng ?? undefined,
          images: imageUrls.length ? imageUrls : undefined,
        }),
      });
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      onSuccess(created);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la publication.");
    } finally { setSaving(false); }
  }

  const isExp = type === "experience";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        <button onClick={handleClose}
          className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
          <X size={16} />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isExp ? "bg-teal-50" : "bg-blue-50"}`}>
              {isExp
                ? <span className="material-symbols-outlined text-teal-600">hiking</span>
                : <MapPin size={20} className="text-blue-600" />}
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">
                {isExp ? "Partager une expérience" : "Recommander un lieu"}
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                {isExp ? "Racontez votre vécu éco-touristique" : "Partagez un lieu remarquable"}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1">
          <form id="add-pub-shared-form" onSubmit={handleSubmit} className="px-8 py-6 space-y-5">

            {/* Titre */}
            <div>
              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">
                {isExp ? "Titre de l'expérience *" : "Nom du lieu *"}
              </label>
              <input type="text"
                placeholder={isExp ? "Ex : Trek au Jebel Chaambi, une aventure inoubliable" : "Ex : Forêt de Fernana"}
                value={form.title}
                onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setTitleErr(""); }}
                className={`w-full px-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 transition-all placeholder:font-normal ${titleErr ? "bg-red-50 border border-red-300 focus:ring-red-200" : "bg-slate-50 border border-slate-200 focus:ring-primary focus:bg-white"}`}
              />
              {titleErr && <p className="text-xs font-semibold text-red-500 mt-1">{titleErr}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">
                {isExp ? "Récit de l'expérience" : "Description du lieu"}
              </label>
              <textarea rows={5}
                placeholder={isExp
                  ? "Décrivez votre vécu : le trajet, les rencontres, les découvertes, l'impact écologique…"
                  : "Décrivez ce lieu : son intérêt écologique, son histoire, comment y accéder…"}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
              />
            </div>

            {/* Localisation */}
            <div>
              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Localisation</label>
              <input type="text"
                placeholder={isExp ? "Ex : Jebel Chaambi, Kasserine" : "Ex : Lac de Bizerte, Bizerte"}
                value={form.place_name}
                onChange={(e) => setForm((f) => ({ ...f, place_name: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400 mb-2"
              />
              <MapPicker lat={mapLat} lng={mapLng}
                onPick={(lat, lng, address) => {
                  setMapLat(lat); setMapLng(lng);
                  if (address) setForm((f) => ({ ...f, place_name: address }));
                }}
              />
            </div>

            {/* Photos */}
            <div>
              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Photos</label>
              <label htmlFor="pub-images-shared-input"
                className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                <span className="material-symbols-outlined text-slate-300 text-3xl">add_photo_alternate</span>
                <p className="text-xs font-semibold text-slate-400">Cliquez pour ajouter des photos</p>
                <input id="pub-images-shared-input" type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setImages((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
                    e.target.value = "";
                  }}
                />
              </label>
              {images.length > 0 && (
                <>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {images.map((img, i) => {
                      const isCover = i === coverIdx;
                      return (
                        <div key={i} onClick={() => setCoverIdx(i)}
                          className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isCover ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                          <img src={img.preview} alt="" className="w-full h-full object-cover" />
                          {isCover && <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>}
                          <button type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              URL.revokeObjectURL(img.preview);
                              setImages((prev) => prev.filter((_, idx) => idx !== i));
                              setCoverIdx((c) => c >= i && c > 0 ? c - 1 : c);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-2">Cliquez sur une photo pour la définir comme image principale.</p>
                </>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                <span className="material-symbols-outlined text-red-500 text-base">error</span>
                <p className="text-sm font-semibold text-red-600">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
          <button type="button" onClick={handleClose}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button type="submit" form="add-pub-shared-form" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl text-xs shadow-sm hover:shadow transition-all active:scale-95 disabled:opacity-60">
            {saving
              ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Publication…</>
              : <><Send size={14} />Publier</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
