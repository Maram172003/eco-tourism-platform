"use client";

import { Calendar, MapPin, Clock } from "lucide-react";
import dynamic from "next/dynamic";
import { PROVIDER_SCHEMA } from "@/lib/provider-schema";
import { OFFER_DETAIL_FIELDS } from "@/lib/offer-schema";
import { DOMAINES } from "@/lib/guideOfferConfig";

const CircuitRouteMap = dynamic(() => import("@/components/map/CircuitRouteMap"), {
  ssr: false,
  loading: () => null,
});

const FR_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function toOfferSlot(av: any) {
  if (!av) return { type: "" };
  if (av.type) return av;
  return {
    type: av.availability_type ?? "",
    dates: av.dates,
    start_date: av.start_date,
    end_date: av.end_date,
    days_of_week: av.days_of_week,
    label: av.label,
    time_slots: av.time_slots,
  };
}

interface Props {
  circuit: any;
  collabsMap?: Record<string, string>;
  ownerName?: string;
}

export default function CircuitViewContent({ circuit, collabsMap = {}, ownerName }: Props) {
  const etapes: any[] = circuit.etapes ?? [];

  return (
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
        const av = toOfferSlot(circuit.availability);
        if (!av.type) return null;
        const typeLabel =
          av.type === "specific" ? "Dates spécifiques" :
          av.type === "range" ? "Plage de dates" :
          av.type === "recurring" ? "Récurrence hebdomadaire" :
          av.type === "season" ? "Saison complète" : av.type;
        const firstTs = av.time_slots
          ? (Object.values(av.time_slots as Record<string, any[]>)[0]?.[0] ?? null)
          : null;
        return (
          <div>
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Disponibilité</p>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-primary shrink-0" />
                <span className="text-sm font-semibold text-slate-700">{typeLabel}</span>
              </div>
              {av.type === "specific" && (av.dates?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-5">
                  {(av.dates as string[]).map((d) => (
                    <span key={d} className="flex items-center gap-1 text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">
                      <Calendar size={9} />
                      {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  ))}
                </div>
              )}
              {av.type === "range" && (av.start_date || av.end_date) && (
                <div className="pl-5 space-y-1">
                  <p className="text-xs text-slate-600 font-semibold">
                    {av.start_date}{av.start_date && av.end_date ? " → " : ""}{av.end_date}
                  </p>
                  {(av.days_of_week?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(av.days_of_week as string[]).map((d) => (
                        <span key={d} className="text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">{FR_DAYS[Number(d)] ?? d}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {av.type === "recurring" && (av.days_of_week?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-5">
                  {(av.days_of_week as string[]).map((d) => (
                    <span key={d} className="text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">{FR_DAYS[Number(d)] ?? d}</span>
                  ))}
                </div>
              )}
              {av.type === "season" && av.label && (
                <div className="flex flex-wrap gap-1.5 pl-5">
                  {(av.label as string).split(", ").map((s) => (
                    <span key={s} className="text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">{s}</span>
                  ))}
                </div>
              )}
              {firstTs && (
                <div className="flex items-center gap-2 pl-5">
                  <Clock size={12} className="text-slate-400" />
                  <span className="text-xs text-slate-500">{(firstTs as any).start} – {(firstTs as any).end}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Hébergement */}
      {circuit.hebergement && (
        <div>
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Hébergement</p>
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            {!circuit.hebergement.inclus ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="material-symbols-outlined text-[16px]">hotel_class</span>Non inclus
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span className="material-symbols-outlined text-[16px] text-primary">hotel</span>
                  {circuit.hebergement.type === "same"
                    ? "Même hébergement sur tout le circuit"
                    : "Hébergement variable par jour (voir programme)"}
                </div>
                {circuit.hebergement.type === "same" && circuit.hebergement.etape && (() => {
                  const hb = circuit.hebergement.etape;
                  const hbCat = PROVIDER_SCHEMA.find((c) => c.value === "hebergement");
                  // Contribution prestataire en priorité sur les données statiques du guide
                  const hbContrib = hb.collab_contribution as Record<string, any> | null | undefined;
                  const collabTitre = hbContrib?.titre ?? hb.titre;
                  const collabDest = hbContrib?.collab_destination ?? hb.collab_destination ?? hb.destination;
                  const collabDescCourte = hbContrib?.description_courte ?? hb.description_courte;
                  const collabDescLongue = hbContrib?.description_longue ?? hb.description_longue;
                  return (
                    <div className="space-y-3 pt-1">
                      <div>
                        {collabTitre && <p className="text-sm font-extrabold text-slate-800">{collabTitre}</p>}
                        {collabDest && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <MapPin size={10} />{collabDest}
                          </div>
                        )}
                      </div>
                      {collabDescCourte && <p className="text-xs text-slate-600">{collabDescCourte}</p>}
                      {collabDescLongue && <p className="text-xs text-slate-500">{collabDescLongue}</p>}
                      {(hb.subtypes ?? []).length > 0 && (
                        <div className="space-y-3">
                          {(hb.subtypes as string[]).map((sv) => {
                            const stLabel = hbCat?.subtypes.find((s) => s.value === sv)?.label ?? sv;
                            const fieldConfig = OFFER_DETAIL_FIELDS[sv];
                            // Contribution HebergBlock du prestataire (clé hb_${sv})
                            const collabContrib = hb.collab_contribution as Record<string, any> | null | undefined;
                            const svHeberg = collabContrib?.[`hb_${sv}`] as { nb_unites?: number; units?: Array<Record<string, any>>; global_pricing?: Record<string, any> } | undefined;
                            const nbU: number = svHeberg?.nb_unites ?? hb.nb_unites?.[sv] ?? 1;
                            const gp = svHeberg?.global_pricing ?? {};
                            const hasPrice = gp.prix_groupe || gp.prix_enfant || gp.supp_priv;
                            const renderRows = (data: Record<string, any>) => {
                              if (!fieldConfig || Object.keys(data).length === 0) return null;
                              const rows: { label: string; display: string }[] = [];
                              (fieldConfig as any).sections.forEach((sec: any) => {
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
                                <div className="space-y-1 pt-1 border-t border-slate-100">
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
                                <div className="divide-y divide-slate-50">
                                  {Array.from({ length: nbU }, (_, i) => {
                                    const svUnit = svHeberg?.units?.[i] ?? {};
                                    const unitPhotos: string[] = Array.isArray(svUnit.photos) ? svUnit.photos : (hb.entity_photos?.[`${sv}_unit_${i}`] ?? (i === 0 ? (hb.entity_photos?.[sv] ?? []) : []));
                                    const unitData: Record<string, any> = Object.keys(svUnit).length > 0
                                      ? svUnit
                                      : ((hb.unit_details as any)?.[sv]?.[i] ?? {});
                                    const unitName = unitData.nom_chambre ?? unitData.nom_suite ?? unitData.nom_tente ?? unitData.nom_bungalow;
                                    return (
                                      <div key={i} className="p-3 space-y-2">
                                        {nbU > 1 && <p className="text-[10px] font-black text-primary uppercase tracking-widest">{unitName || `Unité ${i + 1}`}</p>}
                                        {unitPhotos.length > 0 && (
                                          <div className="flex gap-1.5 overflow-x-auto">
                                            {unitPhotos.slice(0, 5).map((url, pi) => (
                                              <img key={pi} src={url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                                            ))}
                                          </div>
                                        )}
                                        {renderRows(unitData) ?? <p className="text-[10px] text-slate-300 italic">Aucun détail renseigné.</p>}
                                      </div>
                                    );
                                  })}
                                </div>
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

      {/* Programme jour par jour */}
      <div>
        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-3">Programme jour par jour</p>
        {etapes.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Aucune étape configurée.</p>
        ) : (
          <div className="space-y-4">
            {Array.from({ length: circuit.nb_jours }, (_, i) => i + 1).map((jour) => {
              const etapesJour = etapes
                .filter((e) => e.jour === jour)
                .sort((a, b) => {
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
                        const allPhotos = (Object.values(etape.entity_photos ?? {}) as string[][]).flat();
                        const coverPhoto = allPhotos[0] ?? etape.photos?.[0];
                        return (
                          <div key={etape.id} className="p-4 space-y-3">
                            {/* Catégorie + collaborateur/self + horaires */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[10px] font-black tracking-widest uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                                {cat?.label ?? DOMAINES[etape.categorie as string]?.label ?? etape.categorie}
                              </span>
                              <div className="flex items-center gap-2">
                                {(etape.author_type as string) === "self" && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-primary/5 border-primary/20 text-primary">
                                    <span className="material-symbols-outlined text-[11px]">person</span>
                                    {(etape.etape_mode as string) === "guidage"
                                      ? `Guidé par ${ownerName ?? "le guide"}`
                                      : `Assuré par ${ownerName ?? "le guide"}`}
                                  </span>
                                )}
                                {etape.collaborator_name && (etape.author_type as string) !== "self" && (() => {
                                  const stKey = etape.collaborator_status ?? collabsMap[etape.id] ?? "pending";
                                  const cls = stKey === "declined" ? "bg-red-50 border-red-200 text-red-600"
                                    : stKey === "pending" ? "bg-amber-50 border-amber-200 text-amber-600"
                                    : "bg-teal-50 border-teal-200 text-teal-700";
                                  const icon = stKey === "declined" ? "cancel" : stKey === "pending" ? "schedule" : "check_circle";
                                  const statusLabel = stKey === "declined" ? "Refusé" : stKey === "pending" ? "En attente" : null;
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
                            {/* Photo + titre + lieu */}
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
                            {etape.description_courte && <p className="text-xs text-slate-600 leading-relaxed">{etape.description_courte}</p>}
                            {etape.description_longue && <p className="text-xs text-slate-500 leading-relaxed">{etape.description_longue}</p>}
                            {/* Détails prestation guidage (self) */}
                            {(etape.author_type as string) === "self" && (etape.etape_mode as string) === "guidage" && (() => {
                              const df = (etape.fields as any)?.dynamic_fields as Record<string, any> | undefined;
                              if (!df) return null;
                              const entries = Object.entries(df).filter(([, v]) => Array.isArray(v) ? (v as any[]).length > 0 : (v && String(v).trim()));
                              if (entries.length === 0) return null;
                              return (
                                <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl space-y-1">
                                  <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest">Détails de la prestation</p>
                                  {entries.map(([k, v]) => (
                                    <div key={k} className="text-[11px]">
                                      <span className="text-slate-400 capitalize">{k.replace(/_/g, " ")} : </span>
                                      <span className="text-slate-700 font-semibold">{Array.isArray(v) ? (v as any[]).join(", ") : String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                            {/* Données de contribution du collaborateur */}
                            {etape.collab_contribution && (() => {
                              const cd = etape.collab_contribution as Record<string, any>;
                              const displayEntries = Object.entries(cd).filter(([k, v]) => !k.startsWith('collab_') && v && String(v).trim());
                              if (displayEntries.length === 0) return null;
                              return (
                                <div className="mt-2 p-3 bg-teal-50 border border-teal-100 rounded-xl space-y-1">
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
                            {/* Sous-types */}
                            {(etape.subtypes ?? []).length > 0 && (
                              <div className="space-y-2">
                                {(etape.subtypes as string[]).map((sv) => {
                                  const stDef = cat?.subtypes.find((s) => s.value === sv);
                                  const stLabel = stDef?.label ?? sv;
                                  const nbU: number = etape.nb_unites?.[sv] ?? 1;
                                  const cfg = etape.form_config?.[sv] ?? {};
                                  const hasPrice = cfg.prixGroupe || cfg.prixEnfant || cfg.suppPrivatisation;
                                  const etapeFieldConfig = OFFER_DETAIL_FIELDS[sv];
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
                                          const guideSvData: Record<string, any> = etape.categorie === "hebergement"
                                            ? ((etape.unit_details as any)?.[sv]?.[i] ?? {})
                                            : (nbU === 1
                                              ? ((etape.fields as any)?.[sv] ?? {})
                                              : ((etape.unit_details as any)?.[sv]?.[i] ?? {}));
                                          // Contribution prestataire prime sur les données statiques du guide
                                          const svPfx = `${sv}__`;
                                          const rawContrib = (etape.collab_contribution as Record<string, any> | undefined);
                                          const svContribData: Record<string, any> = rawContrib
                                            ? Object.fromEntries(
                                                Object.entries(rawContrib)
                                                  .filter(([k]) => k.startsWith(svPfx))
                                                  .map(([k, v]) => [k.slice(svPfx.length), v])
                                              )
                                            : {};
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

      {/* Tracé du circuit */}
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
        const hbEtape = circuit.hebergement?.inclus && circuit.hebergement.type === "same" ? circuit.hebergement.etape : null;
        const hbContribMap = ((hbEtape as any)?.collab_contribution as Record<string, any> | undefined);
        const hbMapLat = hbContribMap?.collab_lat != null ? Number(hbContribMap.collab_lat) : ((hbEtape as any)?.lat ?? undefined);
        const hbMapLng = hbContribMap?.collab_lng != null ? Number(hbContribMap.collab_lng) : ((hbEtape as any)?.lng ?? undefined);
        const hb = (hbMapLat && hbMapLng)
          ? { lat: hbMapLat, lng: hbMapLng, nom: (hbContribMap?.titre ?? (hbEtape as any)?.titre) || hbContribMap?.collab_destination || (hbEtape as any)?.destination || "Hébergement" }
          : undefined;
        if (pts.length === 0 && !hb) return null;
        return (
          <div>
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Tracé du circuit</p>
            <CircuitRouteMap points={pts} hebergementPoint={hb} />
          </div>
        );
      })()}

    </div>
  );
}
