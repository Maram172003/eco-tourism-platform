"use client";

import { MapPin, User, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import SustainabilityBadge from "@/components/common/SustainabilityBadge";

export interface ExperienceCardProps {
  kind: "offer" | "circuit";
  image: string | null;
  /** Région pour une offre, nombre de jours pour un circuit. */
  location: string | null;
  title: string;
  author: string | null;
  score: number | null;
  description: string | null;
  /** Absent sur les circuits, dont le prix se calcule étape par étape. */
  price?: number | null;
  priceUnit?: string;
  onOpen?: () => void;
}

const UNITE: Record<string, string> = {
  per_person: "par personne",
  per_group:  "par groupe",
  per_night:  "par nuit",
  per_item:   "pièce",
};

export default function ExperienceCard({
  kind, image, location, title, author, score, description, price, priceUnit, onOpen,
}: ExperienceCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="flex flex-col rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-lg group"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-700">
        {image ? (
          <div
            className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
            style={{ backgroundImage: `url('${image}')` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300">
            <MapPin className="w-10 h-10" />
          </div>
        )}

        <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-extrabold text-primary shadow-sm uppercase tracking-widest">
          {kind === "circuit" ? "Circuit" : "Offre"}
        </div>

        {/* Même pastille de score que dans l'explorateur et les profils. */}
        {score !== null && (
          <div className="absolute top-4 right-4">
            <SustainabilityBadge score={score} kind={kind} variant="overlay" />
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-bold mb-2 line-clamp-1">{title}</h3>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs font-semibold text-slate-400">
          {author && (
            <span className="flex items-center gap-1 min-w-0">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{author}</span>
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1 min-w-0">
              {kind === "circuit"
                ? <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                : <MapPin className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{location}</span>
            </span>
          )}
        </div>

        {description && (
          <p className="text-slate-500 text-sm mb-6 line-clamp-2">{description}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-700">
          {price != null ? (
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">À partir de</span>
              <span className="text-lg font-black">
                {price} TND{" "}
                <span className="text-xs font-medium text-slate-400">
                  {UNITE[priceUnit ?? ""] ?? ""}
                </span>
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-medium">Tarif par étape</span>
          )}

          <button
            onClick={onOpen}
            className="h-10 px-4 rounded-xl border border-primary text-primary font-bold hover:bg-primary hover:text-slate-900 transition-all text-sm"
          >
            Découvrir
          </button>
        </div>
      </div>
    </motion.div>
  );
}
