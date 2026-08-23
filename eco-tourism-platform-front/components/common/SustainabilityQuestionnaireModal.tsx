"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  OFFER_SUSTAINABILITY_STEPS,
  CIRCUIT_SUSTAINABILITY_STEPS,
  getOfferSustainabilityLevel,
  getCircuitSustainabilityLevel,
  type SustainabilityStep,
} from "@/lib/constants/sustainability";

export type SustainabilityKind = "offer" | "circuit";

/**
 * Questionnaire de durabilité — offre ou circuit.
 *
 * Rendu unique partagé par les profils guide, prestataire et porteur de projet :
 * les trois en avaient chacun leur copie, avec des écarts d'affichage (le
 * porteur de projet n'avait même pas le détail par catégorie). Seuls le jeu de
 * questions et le barème changent selon `kind`.
 */
export default function SustainabilityQuestionnaireModal({
  open, kind, step, answers, saving,
  onAnswer, onStepChange, onSubmit, onClose,
}: {
  open: boolean;
  kind: SustainabilityKind;
  step: number;
  answers: Record<string, number>;
  saving?: boolean;
  onAnswer: (questionId: string, value: number) => void;
  onStepChange: (step: number) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const isCircuit = kind === "circuit";
  const steps: SustainabilityStep[] = isCircuit ? CIRCUIT_SUSTAINABILITY_STEPS : OFFER_SUSTAINABILITY_STEPS;
  const score = Object.values(answers).reduce((s, v) => s + v, 0);
  const current = steps[step];
  const stepAnswered = current ? current.questions.every((q) => q.id in answers) : false;
  const level = isCircuit ? getCircuitSustainabilityLevel(score) : getOfferSustainabilityLevel(score);
  const sujet = isCircuit ? "Circuit" : "Offre";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* En-tête : catégorie en cours et progression */}
        <div className="px-7 pt-7 pb-5 border-b border-slate-100 shrink-0">
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">
            Évaluation de durabilité — {sujet}
          </p>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined align-middle text-primary" style={{ fontSize: 22 }}>
              {step < steps.length ? current.icon : "flag"}
            </span>
            {step < steps.length ? current.category : "Résultat"}
          </h2>
          {step < steps.length && (
            <p className="text-sm text-slate-500 mt-1">{current.description}</p>
          )}
          <div className="flex gap-1.5 mt-4">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-slate-100"
              }`} />
            ))}
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-1.5">
            {step < steps.length ? `Étape ${step + 1} / ${steps.length}` : "Toutes les étapes complétées"}
          </p>
        </div>

        <div className="overflow-y-auto flex-1 px-7 py-5">
          {step < steps.length ? (
            /* ── Questions de l'étape ─────────────────────────────────── */
            <div className="space-y-5">
              {current.questions.map((q) => (
                <div key={q.id}>
                  <p className="text-sm font-bold text-slate-700 mb-2">{q.text}</p>
                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <button key={opt.label} onClick={() => onAnswer(q.id, opt.value)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          answers[q.id] === opt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 text-slate-600 hover:border-primary/40"
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                {step > 0 && (
                  <button onClick={() => onStepChange(step - 1)}
                    className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                    <ChevronLeft size={16} /> Précédent
                  </button>
                )}
                <button
                  onClick={() => {
                    onStepChange(step + 1);
                    if (step === steps.length - 1) onSubmit();
                  }}
                  disabled={!stepAnswered}
                  className={`flex-1 py-3 font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all ${
                    stepAnswered ? "bg-primary text-slate-900 hover:bg-primary/90" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {step === steps.length - 1 ? "Voir mon score" : "Suivant"}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* ── Résultat : score global, niveau, détail par catégorie ── */
            <div className="text-center">
              <div className="relative w-36 h-36 mx-auto mb-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - score / 100)}`}
                    className="text-primary transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-900">{score}</span>
                  <span className="text-xs font-bold text-slate-400">/100</span>
                </div>
              </div>

              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${level.bg} mb-3`}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{level.icon}</span>
                <span className={`font-extrabold ${level.color}`}>{level.label}</span>
              </div>

              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                {score >= 71
                  ? `Excellent${isCircuit ? "" : "e"} ${sujet.toLowerCase()} éco-responsable ! Vous montrez l'exemple.`
                  : score >= 51
                  ? `Votre ${sujet.toLowerCase()} est sur la bonne voie. Continuez vos efforts !`
                  : "Ce questionnaire vous aide à identifier les axes d'amélioration."}
              </p>

              <div className="space-y-2 mb-6 text-left">
                {steps.map((s) => {
                  const catScore = s.questions.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0);
                  const catMax = s.questions.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.value)), 0);
                  return (
                    <div key={s.category} className="flex items-center gap-3">
                      <span className="material-symbols-outlined w-6 shrink-0 text-primary" style={{ fontSize: 18 }}>{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-600 truncate">{s.category}</span>
                          <span className="text-xs font-black text-slate-700 shrink-0 ml-2">{catScore}/{catMax}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full"
                            style={{ width: `${catMax > 0 ? (catScore / catMax) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button onClick={onClose} disabled={saving}
                className="w-full py-3 bg-primary text-slate-900 font-extrabold rounded-xl hover:bg-primary/90 transition-colors">
                {saving ? "Enregistrement…" : "Fermer"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
