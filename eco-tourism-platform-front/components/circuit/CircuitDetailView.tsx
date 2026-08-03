"use client";

import { useEffect, useRef } from "react";
import { Calendar, Clock, MapPin, Route } from "lucide-react";
import dynamic from "next/dynamic";
import { PROVIDER_SCHEMA } from "@/lib/provider-schema";
import { OFFER_DETAIL_FIELDS } from "@/lib/offer-schema";
import { DOMAINES } from "@/lib/guideOfferConfig";
import { DOMAIN_CASCADE_CONFIG } from "@/lib/domainCascadeConfig";
import DynamicFields from "@/components/guide/offer/DynamicFields";
import ProviderSchemaForm from "@/components/guide/offer/ProviderSchemaForm";
import { HebergBlock, HebergData, EMPTY_HEBERG, GlobalPricingBlock } from "@/components/guide/offer/ProviderServiceBlock";

const GUIDAGE_CATS = new Set(["eco_tour", "activite", "culture_patrimoine", "bien_etre_spa", "volontariat_eco", "guide"]);
const CATEGORY_ICONS: Record<string, string> = {
  hebergement: "hotel", transport: "directions_bus", transport_eco: "electric_bike",
  restaurant_terroir: "restaurant", gastronomie_locale: "restaurant", restauration: "restaurant",
  eco_tour: "eco", activite: "hiking", culture_patrimoine: "account_balance",
  bien_etre_spa: "spa", volontariat_eco: "volunteer_activism",
  artisanat: "palette", agriculture_terroir: "agriculture", equipement: "construction",
  guide: "hiking", autre: "category", autre_service: "category",
};

const MapPickerDynamic = dynamic(() => import("@/components/map/MapPicker"), {
  ssr: false,
  loading: () => <div className="h-[200px] rounded-xl bg-slate-100 animate-pulse" />,
});

const CircuitRouteMap = dynamic(() => import("@/components/map/CircuitRouteMap"), {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-2xl bg-slate-100 animate-pulse" />,
});

const FR_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function normalizeAvail(av: any): { type: string | null; dates?: string[] | null; start_date?: string | null; end_date?: string | null; days_of_week?: string[] | null; label?: string | null; time_slots?: Record<string, { start: string; end: string }[]> | null } {
  if (!av) return { type: null };
  if (av.type !== undefined) return av;
  const buildTs = (keys: string[]) => {
    if (!av.heure_debut || !av.heure_fin || !keys.length) return null;
    return keys.reduce((acc: any, k: string) => ({ ...acc, [k]: [{ start: av.heure_debut, end: av.heure_fin }] }), {});
  };
  switch (av.mode) {
    case "specific":  return { type: "specific",   dates: av.specific_dates ?? [], time_slots: buildTs(av.specific_dates ?? []), start_date: null, end_date: null, days_of_week: null, label: null };
    case "weekly":    return { type: "recurring",  days_of_week: (av.weekdays ?? []).map(String), start_date: av.avail_start ?? null, end_date: av.avail_end ?? null, time_slots: buildTs((av.weekdays ?? []).map(String)), dates: null, label: null };
    case "period":    return { type: "range",      start_date: av.avail_start ?? null, end_date: av.avail_end ?? null, dates: null, days_of_week: null, time_slots: null, label: null };
    case "season":    return { type: "season",     label: Array.isArray(av.saisons) ? av.saisons.join(", ") : null, dates: null, start_date: null, end_date: null, days_of_week: null, time_slots: null };
    default:          return { type: null };
  }
}

type EditProps = {
  editEtapeId?: string;
  editCustomCfg?: {
    title: string; icon: string; color: string;
    fields: Array<{ key: string; label: string; type: "text" | "textarea" | "number"; placeholder?: string; required?: boolean }>;
  };
  editForm?: Record<string, any>;
  editMeta?: { title: string; icon: string; color: string };
  editGrad?: string;
  onFormChange?: (key: string, value: any) => void;
  fieldLocked?: boolean;
  editSaved?: boolean;
  token?: string;
};

export default function CircuitDetailView({
  circuit, editEtapeId, editCustomCfg, editForm, editMeta, editGrad, onFormChange, fieldLocked, editSaved, token,
}: { circuit: any } & EditProps) {
  const etapes: any[] = Array.isArray(circuit.etapes) ? circuit.etapes : [];
  const heberg = circuit.hebergement ?? null;
  const isEditMode = !!editEtapeId;
  const myEtapeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editEtapeId && myEtapeRef.current) {
      setTimeout(() => myEtapeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, [editEtapeId]);

  return (
    <div className="flex flex-col gap-0">
      {/* Cover */}
      <div className="relative shrink-0 h-40">
        {circuit.cover_image
          ? <img src={circuit.cover_image} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center"><Route size={40} className="text-primary/30" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
          <h3 className="text-xl font-extrabold text-white leading-tight">{circuit.title}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[11px] font-black text-white/90">
              <Calendar size={11} />{circuit.nb_jours} jour{circuit.nb_jours > 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-black text-white/90">
              <MapPin size={11} />{etapes.length} étape{etapes.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Description */}
        {circuit.description && (
          <div>
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Description</p>
            <p className="text-sm text-slate-600 leading-relaxed">{circuit.description}</p>
          </div>
        )}

        {/* Disponibilité */}
        {circuit.availability && (() => {
          const slot = normalizeAvail(circuit.availability);
          if (!slot.type) return null;
          const typeLabel = slot.type === "specific" ? "Dates spécifiques" : slot.type === "range" ? "Plage de dates" : slot.type === "recurring" ? "Récurrence hebdomadaire" : slot.type === "season" ? "Saison complète" : slot.type;
          const firstTs = slot.time_slots ? (Object.values(slot.time_slots)[0]?.[0] ?? null) : null;
          return (
            <div>
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Disponibilité</p>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-primary shrink-0" />
                  <span className="text-sm font-semibold text-slate-700">{typeLabel}</span>
                </div>
                {slot.type === "specific" && (slot.dates?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-5">
                    {slot.dates!.map((d: string) => (
                      <span key={d} className="flex items-center gap-1 text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">
                        <Calendar size={9} />{new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    ))}
                  </div>
                )}
                {slot.type === "range" && (slot.start_date || slot.end_date) && (
                  <div className="pl-5 space-y-1">
                    <p className="text-xs text-slate-600 font-semibold">{slot.start_date}{slot.start_date && slot.end_date ? " → " : ""}{slot.end_date}</p>
                    {(slot.days_of_week?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {slot.days_of_week!.map((d: string) => (
                          <span key={d} className="text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">{FR_DAYS[Number(d)] ?? d}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {slot.type === "recurring" && (slot.days_of_week?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-5">
                    {slot.days_of_week!.map((d: string) => (
                      <span key={d} className="text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">{FR_DAYS[Number(d)] ?? d}</span>
                    ))}
                  </div>
                )}
                {slot.type === "season" && slot.label && (
                  <div className="flex flex-wrap gap-1.5 pl-5">
                    {slot.label.split(", ").map((s: string) => (
                      <span key={s} className="text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">{s}</span>
                    ))}
                  </div>
                )}
                {firstTs && (
                  <div className="flex items-center gap-2 pl-5">
                    <Clock size={12} className="text-slate-400" />
                    <span className="text-xs text-slate-500">{firstTs.start} – {firstTs.end}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Hébergement */}
        {heberg && (
          <div>
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Hébergement</p>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              {!heberg.inclus ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="material-symbols-outlined text-[16px]">hotel_class</span>Non inclus
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <span className="material-symbols-outlined text-[16px] text-primary">hotel</span>
                    {heberg.type === "same" ? "Même hébergement sur tout le circuit" : "Hébergement variable par jour"}
                  </div>
                  {heberg.type === "same" && heberg.etape && (() => {
                    const hb = heberg.etape;
                    // Pour le prestataire hébergement : editForm (= collab.contribution_data) est la source de vérité
                    // hb.collab_contribution peut contenir uniquement des coords sans clés hb_* → on préfère editForm
                    const contrib: Record<string, any> | null =
                      (editEtapeId === "hebergement" && editForm && Object.keys(editForm).length > 0)
                        ? editForm
                        : (hb.collab_contribution as Record<string, any> | null) ?? null;
                    const hbCat = PROVIDER_SCHEMA.find((c) => c.value === "hebergement");
                    const collabDest = contrib?.collab_destination ?? hb.collab_destination;
                    const collabTitre = contrib?.titre ?? hb.titre;
                    const collabDescCourte = contrib?.description_courte ?? hb.description_courte;
                    return (
                      <div className="space-y-3 pt-1">
                        <div>
                          {collabTitre && <p className="text-sm font-extrabold text-slate-800">{collabTitre}</p>}
                          {collabDest && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5"><MapPin size={10} />{collabDest}</div>
                          )}
                        </div>
                        {collabDescCourte && <p className="text-xs text-slate-600">{collabDescCourte}</p>}
                        {hb.subtypes?.length > 0 && (
                          <div className="space-y-3">
                            {hb.subtypes.map((sv: string) => {
                              const stLabel = hbCat?.subtypes.find((s) => s.value === sv)?.label ?? sv;
                              const fieldConfig = OFFER_DETAIL_FIELDS[sv];
                              // Lire depuis le nouveau format HebergData (HebergBlock)
                              const hebergData = contrib?.[`hb_${sv}`] as { nb_unites?: number; units?: Record<string, any>[]; global_pricing?: Record<string, any> } | undefined;
                              const nbU = hebergData?.nb_unites ?? 1;
                              const gp = hebergData?.global_pricing ?? {};
                              const hasPrice = gp.prix_groupe || gp.prix_enfant || gp.supp_priv;
                              return (
                                <div key={sv} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                                    <span className="text-[11px] font-extrabold text-slate-700">{stLabel}</span>
                                    <span className="text-[10px] font-bold text-slate-500">{nbU} unité{nbU > 1 ? "s" : ""}</span>
                                  </div>
                                  {hasPrice && (
                                    <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-slate-50">
                                      {gp.prix_groupe && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">{gp.prix_groupe} DT{gp.nb_pers_groupe ? ` / ${gp.nb_pers_groupe} pers.` : ""}</span>}
                                      {gp.prix_enfant && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">{gp.prix_enfant} DT enfant{gp.age_max_enfant ? ` (≤${gp.age_max_enfant} ans)` : ""}</span>}
                                      {gp.supp_priv && <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-lg">+{gp.supp_priv} DT privatisation</span>}
                                    </div>
                                  )}
                                  {!hebergData ? (
                                    <p className="text-[10px] text-slate-300 italic p-3">Aucun détail renseigné.</p>
                                  ) : (
                                    <div className="divide-y divide-slate-50">
                                      {Array.from({ length: nbU }, (_, i) => {
                                        const unitData: Record<string, any> = hebergData.units?.[i] ?? {};
                                        const unitPhotos: string[] = Array.isArray(unitData.photos) ? unitData.photos : [];
                                        const unitName = unitData.nom_chambre ?? unitData.nom_suite ?? unitData.nom_tente ?? unitData.nom_bungalow ?? unitData.nom_gite ?? unitData.nom_emplacement ?? unitData.nom_unite;
                                        const rows: { label: string; display: string }[] = [];
                                        if (fieldConfig) {
                                          fieldConfig.sections.forEach((sec) => {
                                            sec.fields.forEach((f) => {
                                              const v = unitData[f.key];
                                              if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) return;
                                              if (f.type === "boolean") { rows.push({ label: f.label, display: v ? "Oui" : "Non" }); return; }
                                              if (Array.isArray(v)) { rows.push({ label: f.label, display: v.join(", ") }); return; }
                                              rows.push({ label: f.label, display: String(v) });
                                            });
                                          });
                                        }
                                        return (
                                          <div key={i} className="p-3 space-y-2">
                                            {nbU > 1 && <p className="text-[10px] font-black text-primary uppercase tracking-widest">{unitName || `Unité ${i + 1}`}</p>}
                                            {unitPhotos.length > 0 && (
                                              <div className="flex gap-1.5 overflow-x-auto pb-1">
                                                {unitPhotos.slice(0, 5).map((url: string, pi: number) => (
                                                  <img key={pi} src={url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                                                ))}
                                              </div>
                                            )}
                                            {rows.length > 0 ? (
                                              <div className="space-y-1 pt-1 border-t border-slate-100">
                                                {rows.map((r) => (
                                                  <div key={r.label} className="flex items-start gap-2">
                                                    <span className="text-[10px] text-slate-400 font-semibold shrink-0 min-w-[100px]">{r.label}</span>
                                                    <span className="text-[10px] text-slate-700 font-bold">{r.display}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              unitPhotos.length === 0 && <p className="text-[10px] text-slate-300 italic">Aucun détail renseigné.</p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Formulaire contribution hébergement (prestataire invité) ── */}
        {editEtapeId === "hebergement" && heberg?.inclus && (() => {
          // Les sous-types choisis par le propriétaire du circuit sont dans heberg.etape.subtypes
          const hbSubtypes: string[] = heberg.etape?.subtypes ?? heberg.subtypes ?? [];
          const hlbl = "text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block";
          const hInput = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-60 disabled:cursor-not-allowed";
          const hTa = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-60 disabled:cursor-not-allowed";
          const hbGet = (key: string) => editForm?.[key] ?? "";
          const hbSet = (key: string, v: any) => onFormChange?.(key, v);
          const fieldLock = fieldLocked ?? false;
          const hbCat = PROVIDER_SCHEMA.find((c) => c.value === "hebergement");
          return (
            <div ref={myEtapeRef} className="mt-3 rounded-2xl border border-primary/20 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-primary/5 border-b border-primary/10">
                <span className="material-symbols-outlined text-primary text-base">hotel</span>
                <p className="text-[10px] font-black tracking-widest uppercase text-primary flex-1">Votre contribution hébergement</p>
                {editSaved && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>Enregistré
                  </span>
                )}
              </div>
              <div className="bg-white px-4 py-4 space-y-5">

                {/* Types demandés par le propriétaire — lecture seule */}
                {hbSubtypes.length > 0 && (
                  <div>
                    <label className={hlbl}>Types d'hébergement demandés</label>
                    <div className="flex flex-wrap gap-1.5">
                      {hbSubtypes.map((sv) => (
                        <span key={sv} className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20">
                          {hbCat?.subtypes.find((s) => s.value === sv)?.label ?? sv}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Localisation */}
                <div>
                  <label className={hlbl}>Localisation sur la carte <span className="text-red-400">*</span></label>
                  {editForm?.collab_destination && (
                    <p className="text-[10px] text-emerald-600 font-bold mb-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">location_on</span>{editForm.collab_destination}
                    </p>
                  )}
                  {!fieldLock && (
                    <MapPickerDynamic
                      lat={editForm?.collab_lat ? parseFloat(editForm.collab_lat) : null}
                      lng={editForm?.collab_lng ? parseFloat(editForm.collab_lng) : null}
                      onPick={(lat, lng, address) => {
                        hbSet("collab_lat", String(lat));
                        hbSet("collab_lng", String(lng));
                        hbSet("collab_destination", address);
                      }}
                    />
                  )}
                </div>

                {/* Informations de l'offre */}
                <div className="space-y-3">
                  <p className={hlbl}>Informations de l'offre</p>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Titre <span className="text-red-400">*</span></label>
                    <input type="text" disabled={fieldLock}
                      value={String(hbGet("titre"))}
                      onChange={(e) => hbSet("titre", e.target.value)}
                      placeholder="Ex : Écolodge Ain Draham…"
                      className={hInput} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description courte</label>
                    <textarea rows={2} disabled={fieldLock}
                      value={String(hbGet("description_courte"))}
                      onChange={(e) => hbSet("description_courte", e.target.value)}
                      placeholder="Résumé en 1-2 phrases…"
                      className={hTa} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description détaillée</label>
                    <textarea rows={3} disabled={fieldLock}
                      value={String(hbGet("description_longue"))}
                      onChange={(e) => hbSet("description_longue", e.target.value)}
                      placeholder="Description complète de votre établissement…"
                      className={hTa} />
                  </div>
                </div>

                {/* Champs par type d'hébergement — HebergBlock + GlobalPricingBlock (identiques au formulaire guide) */}
                {hbSubtypes.map((sv) => {
                  const stLabel = hbCat?.subtypes.find((s) => s.value === sv)?.label ?? sv;
                  const hbData: HebergData = (editForm?.[`hb_${sv}`] as HebergData) ?? EMPTY_HEBERG;
                  const setHbData = (v: HebergData) => hbSet(`hb_${sv}`, v);
                  return (
                    <div key={sv} className={`bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 ${fieldLock ? "pointer-events-none opacity-60" : ""}`}>
                      <p className="text-[10px] font-black tracking-widest text-primary/70 uppercase">{stLabel}</p>
                      <div className="pb-4 border-b border-slate-200 space-y-2.5">
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Tarification</p>
                        <GlobalPricingBlock
                          value={hbData.global_pricing}
                          onChange={(p) => setHbData({ ...hbData, global_pricing: p })}
                        />
                      </div>
                      <HebergBlock
                        subtype={sv}
                        value={hbData}
                        onChange={setHbData}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Programme jour par jour */}
        <div>
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-3">Programme jour par jour</p>
          {etapes.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Aucune étape configurée.</p>
          ) : (
            <div className="space-y-4">
              {Array.from({ length: circuit.nb_jours }, (_, i) => i + 1).map((jour) => {
                const etapesJour = etapes.filter((e) => e.jour === jour).sort((a, b) => {
                  const toMin = (t: string) => { const [h, m] = (t || "00:00").split(":").map(Number); return h * 60 + m; };
                  return toMin(a.heure_debut) - toMin(b.heure_debut);
                });
                return (
                  <div key={jour} className="border border-slate-100 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                      <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black shrink-0">{jour}</div>
                      <p className="text-xs font-extrabold text-slate-700">Jour {jour}</p>
                      <span className="ml-auto text-[10px] text-slate-400 font-semibold">{etapesJour.length} activité{etapesJour.length > 1 ? "s" : ""}</span>
                    </div>
                    {etapesJour.length === 0 ? (
                      <p className="text-[11px] text-slate-300 italic px-4 py-3">Aucune activité ce jour.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {etapesJour.map((etape) => {
                          const cat = PROVIDER_SCHEMA.find((c) => c.value === etape.categorie);
                          const isMyEtape = isEditMode && etape.id === editEtapeId;
                          const isOtherEtape = isEditMode && !isMyEtape;
                          const isGuidage = GUIDAGE_CATS.has(etape.categorie as string) || !!(etape.guidage_data as any)?.categorie || (etape.etape_mode as string) === "guidage";
                          const catLabel = isGuidage
                            ? (DOMAINES[(etape.guidage_data as any)?.categorie ?? (etape.categorie as string)]?.label ?? cat?.label ?? (etape.categorie as string))
                            : (cat?.label ?? (etape.categorie as string));
                          const allPhotos = (Object.values(etape.entity_photos ?? {}) as string[][]).flat();
                          const coverPhoto = allPhotos[0] ?? etape.photos?.[0];
                          const lbl = "text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block";
                          return (
                            <div key={etape.id} ref={isMyEtape ? myEtapeRef : undefined}
                              className={`transition-all ${isOtherEtape ? "opacity-50 pointer-events-none" : ""}`}>
                              <div className="p-4 space-y-3">

                                {/* Catégorie + collaborateur/self + horaires */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-[10px] font-black tracking-widest uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                                    {catLabel}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {(etape.author_type as string) === "self" && (
                                      <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-primary/5 border-primary/20 text-primary">
                                        <span className="material-symbols-outlined text-[11px]">person</span>
                                        {(etape.etape_mode as string) === "guidage" ? "Guidé par moi" : "Assuré par moi"}
                                      </span>
                                    )}
                                    {etape.collaborator_name && (etape.author_type as string) !== "self" && (() => {
                                      const st: string = etape.collaborator_status ?? "pending";
                                      const cls = st === "declined" ? "bg-red-50 border-red-200 text-red-600"
                                        : st === "pending" ? "bg-amber-50 border-amber-200 text-amber-600"
                                        : "bg-teal-50 border-teal-200 text-teal-700";
                                      const icon = st === "declined" ? "cancel" : st === "pending" ? "schedule" : "check_circle";
                                      const statusLabel = st === "declined" ? "Refusé" : st === "pending" ? "En attente" : null;
                                      return (
                                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>
                                          <span className="material-symbols-outlined text-[11px]">{icon}</span>
                                          {statusLabel ? `${etape.collaborator_name} · ${statusLabel}` : etape.collaborator_name}
                                        </span>
                                      );
                                    })()}
                                    {etape.heure_debut && etape.heure_fin && (
                                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-lg">
                                        <Clock size={9} />{etape.heure_debut} – {etape.heure_fin}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Photo + titre + destination */}
                                {(coverPhoto || etape.titre || etape.destination) && (
                                  <div className="flex gap-3">
                                    {coverPhoto && <img src={coverPhoto} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-extrabold text-slate-800 leading-tight">{etape.titre || etape.destination}</p>
                                      {etape.destination && etape.titre && (
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                          <MapPin size={9} />{etape.destination}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Descriptions */}
                                {etape.description_courte && <p className="text-xs text-slate-600 leading-relaxed">{etape.description_courte}</p>}
                                {etape.description_longue && <p className="text-xs text-slate-500 leading-relaxed">{etape.description_longue}</p>}

                                {/* Expertises guidage */}
                                {isGuidage && (() => {
                                  const exps: string[] = (etape.guidage_data as any)?.details?.expertises ?? (etape.fields as any)?.expertises ?? [];
                                  return exps.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {exps.map((exp: string) => (
                                        <span key={exp} className="text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg px-2.5 py-1">{exp}</span>
                                      ))}
                                    </div>
                                  ) : null;
                                })()}

                                {/* Détails dynamiques de l'étape propre au guide (self) */}
                                {(etape.author_type as string) === "self" && isGuidage && (() => {
                                  const df = (etape.fields as any)?.dynamic_fields as Record<string, any> | undefined;
                                  if (!df) return null;
                                  const entries = Object.entries(df).filter(([, v]) => Array.isArray(v) ? v.length > 0 : (v && String(v).trim()));
                                  if (entries.length === 0) return null;
                                  return (
                                    <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl space-y-1">
                                      <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest">Détails de la prestation</p>
                                      {entries.map(([k, v]) => (
                                        <div key={k} className="text-[11px]">
                                          <span className="text-slate-400 capitalize">{k.replace(/_/g, " ")} : </span>
                                          <span className="text-slate-700 font-semibold">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}

                                {/* Données contribution du collaborateur */}
                                {etape.collab_contribution && (() => {
                                  const cd = etape.collab_contribution as Record<string, any>;
                                  const displayEntries = Object.entries(cd).filter(([k, v]) => !k.startsWith("collab_") && v && String(v).trim());
                                  if (displayEntries.length === 0) return null;
                                  return (
                                    <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl space-y-1">
                                      <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest">Contribution</p>
                                      {displayEntries.map(([k, v]) => (
                                        <div key={k} className="text-[11px]">
                                          <span className="text-slate-400 capitalize">{k.replace(/_/g, " ")} : </span>
                                          <span className="text-slate-700 font-semibold">{String(v)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}

                                {/* Sous-types avec détails visuels */}
                                {((etape.subtypes as string[] | undefined)?.length ?? 0) > 0 && (
                                  <div className="space-y-2">
                                    {(etape.subtypes as string[]).map((sv) => {
                                      const stDef = cat?.subtypes.find((s) => s.value === sv);
                                      const stLabel = stDef?.label ?? sv;
                                      const nbU: number = etape.nb_unites?.[sv] ?? 1;
                                      const cfg = etape.form_config?.[sv] ?? {};
                                      const hasPrice = cfg.prixGroupe || cfg.prixEnfant || cfg.suppPrivatisation;
                                      const etapeFieldConfig = OFFER_DETAIL_FIELDS[sv];

                                      // Données de contribution en format plat avec préfixe ${sv}__ (double underscore)
                                      // Ex: location_velo__titre → titre, location_velo__nb_velos_offre → nb_velos_offre
                                      const svPrefix = `${sv}__`;
                                      const collabRaw = (etape.collab_contribution as Record<string, any> | undefined)
                                        ?? (etape.id === editEtapeId ? (editForm ?? {}) : {});
                                      const svContribData: Record<string, any> = Object.fromEntries(
                                        Object.entries(collabRaw)
                                          .filter(([k]) => k.startsWith(svPrefix))
                                          .map(([k, v]) => [k.slice(svPrefix.length), v])
                                      );

                                      const renderEtapeRows = (data: Record<string, any>) => {
                                        if (!etapeFieldConfig || Object.keys(data).length === 0) return null;
                                        const rows: { label: string; display: string }[] = [];
                                        (etapeFieldConfig as any).sections.forEach((sec: any) => {
                                          sec.fields.forEach((f: any) => {
                                            const v = data[f.key];
                                            if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) return;
                                            if (f.type === "boolean") { rows.push({ label: f.label, display: v ? "Oui" : "Non" }); return; }
                                            if (Array.isArray(v)) { rows.push({ label: f.label, display: v.join(", ") }); return; }
                                            rows.push({ label: f.label, display: String(v) });
                                          });
                                        });
                                        if (rows.length === 0) return null;
                                        return (
                                          <div className="space-y-1 pt-1 border-t border-slate-200">
                                            {rows.map((r) => (
                                              <div key={r.label} className="flex items-start gap-2">
                                                <span className="text-[10px] text-slate-400 font-semibold shrink-0 min-w-[100px]">{r.label}</span>
                                                <span className="text-[10px] text-slate-700 font-bold">{r.display}</span>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      };
                                      return (
                                        <div key={sv} className="bg-slate-50 rounded-xl overflow-hidden">
                                          <div className="flex items-center justify-between px-3 py-2 bg-slate-100">
                                            <span className="text-[11px] font-extrabold text-slate-700">{stLabel}</span>
                                            <span className="text-[10px] font-bold text-slate-500">{nbU} unité{nbU > 1 ? "s" : ""}</span>
                                          </div>
                                          {hasPrice && (
                                            <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-slate-100">
                                              {cfg.prixGroupe && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">{cfg.prixGroupe} DT{cfg.nbPersonnesGroupe ? ` / ${cfg.nbPersonnesGroupe} pers.` : " groupe"}</span>}
                                              {cfg.prixEnfant && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">{cfg.prixEnfant} DT enfant{cfg.ageMaxEnfant ? ` (≤${cfg.ageMaxEnfant} ans)` : ""}</span>}
                                              {cfg.suppPrivatisation && <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-lg">+{cfg.suppPrivatisation} DT privatisation</span>}
                                            </div>
                                          )}
                                          <div className="divide-y divide-slate-100">
                                            {Array.from({ length: nbU }, (_, i) => {
                                              const unitPhotos: string[] = etape.entity_photos?.[`${sv}_unit_${i}`] ?? (i === 0 ? (etape.entity_photos?.[sv] ?? []) : []);
                                              // Données du guide pour ce sous-type
                                              const guideSvData: Record<string, any> = (etape.categorie as string) === "hebergement"
                                                ? ((etape.unit_details as any)?.[sv]?.[i] ?? {})
                                                : (nbU === 1
                                                  ? ((etape.fields as any)?.[sv] ?? {})
                                                  : ((etape.unit_details as any)?.[sv]?.[i] ?? {}));
                                              // La contribution prestataire prime sur les champs statiques du guide
                                              const unitData: Record<string, any> = Object.keys(svContribData).length > 0
                                                ? svContribData
                                                : guideSvData;
                                              const unitName = unitData.nom_chambre ?? unitData.nom_suite ?? unitData.nom_tente ?? unitData.nom_bungalow ?? unitData.nom;
                                              return (
                                                <div key={i} className="p-3 space-y-2">
                                                  {nbU > 1 && <p className="text-[10px] font-black text-primary uppercase tracking-widest">{unitName || `Unité ${i + 1}`}</p>}
                                                  {unitPhotos.length > 0 && (
                                                    <div className="flex gap-1.5 overflow-x-auto">
                                                      {unitPhotos.slice(0, 5).map((url, pi) => (
                                                        <img key={pi} src={url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                                                      ))}
                                                    </div>
                                                  )}
                                                  {renderEtapeRows(unitData) ?? <p className="text-[10px] text-slate-300 italic">Aucun détail renseigné.</p>}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {etape.prix !== null && etape.prix !== undefined && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Prix indicatif</span>
                                    <span className="text-sm font-extrabold text-primary">{etape.prix} DT</span>
                                  </div>
                                )}

                                {/* ── Formulaire de contribution (mon étape uniquement) ── */}
                                {isMyEtape && (
                                  <div className="mt-3 rounded-2xl border border-primary/20 overflow-hidden shadow-sm">
                                    {/* En-tête sobre — sans dégradé coloré */}
                                    <div className="flex items-center gap-2.5 px-4 py-3 bg-primary/5 border-b border-primary/10">
                                      <span className="material-symbols-outlined text-primary text-base">{editMeta?.icon ?? "edit_note"}</span>
                                      <p className="text-[10px] font-black tracking-widest uppercase text-primary flex-1">Votre contribution</p>
                                      {editSaved && (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold">
                                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                          Enregistré
                                        </span>
                                      )}
                                    </div>

                                    <div className="bg-white px-4 py-4 space-y-5">
                                      {/* LOCALISATION SUR LA CARTE (éditable) */}
                                      <div>
                                        <label className={lbl}>Localisation sur la carte <span className="text-red-400">*</span></label>
                                        {editForm?.collab_destination && (
                                          <p className="text-[10px] text-emerald-600 font-bold mb-1.5 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">location_on</span>
                                            {editForm.collab_destination}
                                          </p>
                                        )}
                                        {!fieldLocked && (
                                          <MapPickerDynamic
                                            lat={editForm?.collab_lat ? parseFloat(editForm.collab_lat) : null}
                                            lng={editForm?.collab_lng ? parseFloat(editForm.collab_lng) : null}
                                            onPick={(lat, lng, address) => {
                                              onFormChange?.("collab_lat", String(lat));
                                              onFormChange?.("collab_lng", String(lng));
                                              onFormChange?.("collab_destination", address);
                                            }}
                                          />
                                        )}
                                      </div>

                                      {/* CHAMPS ÉDITABLES — guidage (CHAMPS_DOMAINE) ou service (OFFER_DETAIL_FIELDS) */}
                                      {(() => {
                                        const editInput = `w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-60 disabled:cursor-not-allowed`;

                                        /* ── BRANCHE GUIDAGE ── champs domaine uniquement (DynamicFields) ── */
                                        if (isGuidage) {
                                          const domaine: string = (etape.guidage_data as any)?.categorie ?? (etape.fields as any)?.domaine ?? (etape.categorie as string) ?? "";
                                          const expertises: string[] = (etape.guidage_data as any)?.details?.expertises ?? (etape.fields as any)?.expertises ?? [];
                                          const domaineMeta = domaine ? (DOMAINES[domaine] ?? null) : null;

                                          const gSet = (k: string, v: any) => onFormChange?.(k, v);

                                          // DynData pour DynamicFields : strip "guide_" prefix
                                          const guideDynValue: Record<string, any> = Object.fromEntries(
                                            Object.entries(editForm ?? {})
                                              .filter(([k]) => k.startsWith("guide_"))
                                              .map(([k, v]) => [k.slice(6), v])
                                          );

                                          const taClass = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-60 disabled:cursor-not-allowed";

                                          return (
                                            <div className="space-y-4">

                                              {/* ── Informations de l'offre ── */}
                                              <div className="space-y-3">
                                                <p className={lbl}>Informations de l'offre</p>
                                                <div>
                                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Titre <span className="text-red-400">*</span></label>
                                                  <input type="text" disabled={fieldLocked}
                                                    value={String(editForm?.["guide_titre"] ?? "")}
                                                    onChange={(e) => gSet("guide_titre", e.target.value)}
                                                    placeholder="Titre de votre prestation…"
                                                    className={editInput} />
                                                </div>
                                                <div>
                                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description courte</label>
                                                  <textarea rows={2} disabled={fieldLocked}
                                                    value={String(editForm?.["guide_description_courte"] ?? "")}
                                                    onChange={(e) => gSet("guide_description_courte", e.target.value)}
                                                    placeholder="Résumé de votre prestation en 1-2 phrases…"
                                                    className={taClass} />
                                                </div>
                                                <div>
                                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description détaillée</label>
                                                  <textarea rows={3} disabled={fieldLocked}
                                                    value={String(editForm?.["guide_description_longue"] ?? "")}
                                                    onChange={(e) => gSet("guide_description_longue", e.target.value)}
                                                    placeholder="Description complète de votre prestation…"
                                                    className={taClass} />
                                                </div>
                                                <div>
                                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Prix de base <span className="text-slate-300 normal-case font-normal">(TND)</span></label>
                                                  <div className="relative">
                                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold select-none">DT</span>
                                                    <input type="number" min="0" disabled={fieldLocked}
                                                      value={String(editForm?.["guide_prix_base"] ?? "")}
                                                      onChange={(e) => gSet("guide_prix_base", e.target.value)}
                                                      placeholder="0"
                                                      className={`${editInput} pl-9 font-mono`} />
                                                  </div>
                                                </div>
                                              </div>

                                              {/* ── Champs domaine — DynamicFields (source unique) ── */}
                                              {domaine && (
                                                <div className={fieldLocked ? "pointer-events-none opacity-60" : ""}>
                                                  <DynamicFields
                                                    domaine={domaine}
                                                    expertisesSelectionnees={expertises}
                                                    value={guideDynValue}
                                                    onChange={(patch) =>
                                                      Object.entries(patch).forEach(([k, v]) => gSet(`guide_${k}`, v))
                                                    }
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          );
                                        }

                                        /* ── BRANCHE SERVICE — DynamicFields cascade (si dispo) ou ProviderSchemaForm par sous-type ── */
                                        const subtypes = (etape.subtypes as string[] | undefined) ?? [];
                                        const svcCat = etape.categorie as string;
                                        const hasSvcCascade = !!DOMAIN_CASCADE_CONFIG[svcCat];
                                        const isEtapeHeberg = svcCat === "hebergement";
                                        const sGet = (key: string) => editForm?.[key] ?? "";
                                        const sSet = (key: string, v: any) => onFormChange?.(key, v);

                                        // Extrait DynData depuis editForm pour un préfixe donné
                                        const getSvcDynValue = (pfx: string): Record<string, any> =>
                                          Object.fromEntries(
                                            Object.entries(editForm ?? {})
                                              .filter(([k]) => k.startsWith(`${pfx}__`))
                                              .map(([k, v]) => [k.slice(pfx.length + 2), v])
                                          );
                                        const makeSvcOnChange = (pfx: string) => (patch: Record<string, any>) =>
                                          Object.entries(patch).forEach(([k, v]) => sSet(`${pfx}__${k}`, v));

                                        // DynData cascade service (clés sans préfixe)
                                        const svcCascadeValue: Record<string, any> = {
                                          types_visite: editForm?.["types_visite"] ?? [],
                                          experiences: editForm?.["experiences"] ?? [],
                                          mediation: editForm?.["mediation"] ?? [],
                                        };

                                        const taClassSvc = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-60 disabled:cursor-not-allowed";

                                        return (
                                          <div className="space-y-4">

                                            {/* ── Informations de l'offre ── toujours visible */}
                                            <div className="space-y-3">
                                              <p className={lbl}>Informations de l'offre</p>
                                              <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Titre <span className="text-red-400">*</span></label>
                                                <input type="text" disabled={fieldLocked}
                                                  value={String(sGet("titre"))}
                                                  onChange={(e) => sSet("titre", e.target.value)}
                                                  placeholder="Titre de votre prestation…"
                                                  className={editInput} />
                                              </div>
                                              <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description courte</label>
                                                <textarea rows={2} disabled={fieldLocked}
                                                  value={String(sGet("desc_courte"))}
                                                  onChange={(e) => sSet("desc_courte", e.target.value)}
                                                  placeholder="Résumé de votre prestation en 1-2 phrases…"
                                                  className={taClassSvc} />
                                              </div>
                                              <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description détaillée</label>
                                                <textarea rows={3} disabled={fieldLocked}
                                                  value={String(sGet("desc_longue"))}
                                                  onChange={(e) => sSet("desc_longue", e.target.value)}
                                                  placeholder="Description complète de votre prestation…"
                                                  className={taClassSvc} />
                                              </div>
                                              <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Prix de base <span className="text-slate-300 normal-case font-normal">(TND)</span></label>
                                                <div className="relative">
                                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold select-none">DT</span>
                                                  <input type="number" min="0" disabled={fieldLocked}
                                                    value={String(sGet("prix_base"))}
                                                    onChange={(e) => sSet("prix_base", e.target.value)}
                                                    placeholder="0"
                                                    className={`${editInput} pl-9 font-mono`} />
                                                </div>
                                              </div>
                                            </div>

                                            {/* ── Champs dynamiques cascade (même logique que guidage) ── */}
                                            {hasSvcCascade && (
                                              <div className={fieldLocked ? "pointer-events-none opacity-60" : ""}>
                                                <DynamicFields
                                                  domaine={svcCat}
                                                  expertisesSelectionnees={subtypes}
                                                  value={svcCascadeValue}
                                                  onChange={(patch) =>
                                                    Object.entries(patch).forEach(([k, v]) => sSet(k, v))
                                                  }
                                                />
                                              </div>
                                            )}

                                            {/* ── ProviderSchemaForm par sous-type (si pas de cascade) ── */}
                                            {!hasSvcCascade && subtypes.map((sv) => {
                                                const nbUKey = `${sv}_nbUnites`;
                                                const nbU = parseInt(sGet(nbUKey) || "1", 10) || 1;
                                                return (
                                                  <div key={sv} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                                    {subtypes.length > 1 && (
                                                      <p className="text-[10px] font-black tracking-widest text-primary/70 uppercase mb-3">{sv.replace(/_/g, " ")}</p>
                                                    )}
                                                    {isEtapeHeberg ? (
                                                      <>
                                                        {/* Tarification hébergement */}
                                                        <div className="mb-4 pb-4 border-b border-slate-200 space-y-2.5">
                                                          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Tarification</p>
                                                          <div>
                                                            <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">Prix / nuit (TND)</label>
                                                            <div className="relative">
                                                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">DT</span>
                                                              <input type="number" min="0" placeholder="Ex : 380" disabled={fieldLocked}
                                                                value={sGet(`${sv}__unit0__prix_unite`)}
                                                                onChange={(e) => sSet(`${sv}__unit0__prix_unite`, e.target.value)}
                                                                className={`${editInput} pl-9 font-mono`} />
                                                            </div>
                                                          </div>
                                                          <div>
                                                            <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">Max. personnes pour cette unité</label>
                                                            <input type="number" min="1" placeholder="Ex : 2" disabled={fieldLocked}
                                                              value={sGet(`${sv}__unit0__max_pers_unite`)}
                                                              onChange={(e) => sSet(`${sv}__unit0__max_pers_unite`, e.target.value)}
                                                              className={`${editInput} font-mono`} />
                                                          </div>
                                                        </div>
                                                        {/* Nb d'unités hébergement */}
                                                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
                                                          <div>
                                                            <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest">Nb d'unités</p>
                                                            <p className="text-[9px] text-slate-300">Unités disponibles à la vente</p>
                                                          </div>
                                                          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-1.5">
                                                            <button type="button" disabled={fieldLocked || nbU <= 1}
                                                              onClick={() => sSet(nbUKey, String(Math.max(1, nbU - 1)))}
                                                              className="text-slate-500 font-bold hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed">−</button>
                                                            <span className="text-sm font-extrabold text-slate-700 min-w-[20px] text-center">{nbU}</span>
                                                            <button type="button" disabled={fieldLocked}
                                                              onClick={() => sSet(nbUKey, String(nbU + 1))}
                                                              className="text-slate-500 font-bold hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                                                          </div>
                                                        </div>
                                                        {/* Champs OFFER_DETAIL_FIELDS hébergement — ProviderSchemaForm */}
                                                        {OFFER_DETAIL_FIELDS[sv] && (
                                                          <div className={fieldLocked ? "pointer-events-none opacity-60" : ""}>
                                                            <ProviderSchemaForm
                                                              config={OFFER_DETAIL_FIELDS[sv]}
                                                              value={getSvcDynValue(`${sv}__unit0`)}
                                                              onChange={makeSvcOnChange(`${sv}__unit0`)}
                                                            />
                                                          </div>
                                                        )}
                                                      </>
                                                    ) : (
                                                      OFFER_DETAIL_FIELDS[sv] ? (
                                                        <div className={fieldLocked ? "pointer-events-none opacity-60" : ""}>
                                                          <ProviderSchemaForm
                                                            config={OFFER_DETAIL_FIELDS[sv]}
                                                            value={getSvcDynValue(sv)}
                                                            onChange={makeSvcOnChange(sv)}
                                                          />
                                                        </div>
                                                      ) : null
                                                    )}
                                                  </div>
                                                );
                                              })}
                                          </div>
                                        );
                                      })()}

                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Carte du tracé */}
        {(() => {
          const pts = etapes
            .filter((e) => (e.lat != null && e.lng != null) || (e.collab_lat != null && e.collab_lng != null))
            .sort((a, b) => a.jour - b.jour)
            .map((e) => ({
              jour: e.jour,
              lat: (e.lat ?? e.collab_lat) as number,
              lng: (e.lng ?? e.collab_lng) as number,
              destination: e.destination ?? e.collab_destination ?? "",
            }));
          const hbEtape = heberg?.inclus && heberg.type === "same" ? heberg.etape : null;
          // Lire les coords depuis la contribution prestataire (collab_lat/lng) en priorité
          const hbContribForMap = ((hbEtape as any)?.collab_contribution as Record<string, any> | undefined)
            ?? (editEtapeId === "hebergement" ? (editForm ?? undefined) : undefined);
          const hbLat = hbContribForMap?.collab_lat != null ? Number(hbContribForMap.collab_lat) : (hbEtape?.collab_lat ?? hbEtape?.lat);
          const hbLng = hbContribForMap?.collab_lng != null ? Number(hbContribForMap.collab_lng) : (hbEtape?.collab_lng ?? hbEtape?.lng);
          const hbPt = hbLat && hbLng
            ? { lat: hbLat as number, lng: hbLng as number, nom: (hbContribForMap?.titre ?? hbEtape?.titre) || hbContribForMap?.collab_destination || hbEtape?.destination || "Hébergement" }
            : undefined;
          if (pts.length === 0 && !hbPt) return null;
          return (
            <div>
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Tracé du circuit</p>
              <CircuitRouteMap points={pts} hebergementPoint={hbPt} />
            </div>
          );
        })()}
      </div>
    </div>
  );
}
