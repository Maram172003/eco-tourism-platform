"use client";

import { BadgeCheck, ClipboardCheck, Users2 } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Le parcours réel de la plateforme, et non des promesses génériques
 * (« contribution à la reforestation », « ateliers avec les locaux ») qui ne
 * correspondaient à aucune fonctionnalité. Le quatrième volet — l'exploration
 * par centres d'intérêt — a sa propre section juste en dessous.
 */
const steps = [
  {
    icon: BadgeCheck,
    title: "Des professionnels validés",
    description:
      "Guides et prestataires renseignent leur profil et leurs certifications. Un administrateur vérifie le dossier avant toute publication.",
  },
  {
    icon: ClipboardCheck,
    title: "Une durabilité mesurée",
    description:
      "Chaque offre et chaque circuit passe un questionnaire de durabilité qui donne un score sur 100, affiché publiquement.",
  },
  {
    icon: Users2,
    title: "Des expériences co-construites",
    description:
      "Un circuit réunit plusieurs professionnels : chacun décrit son étape et garde la main sur sa propre prestation.",
  },
];

export default function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="scroll-mt-24 bg-slate-50 dark:bg-slate-900/50 py-24 px-6 md:px-20 lg:px-40">
      <div className="max-w-[1440px] mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            Comment ça marche
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
            Un cadre commun aux éco-voyageurs, aux guides, aux prestataires et aux porteurs
            de projet, où l'engagement écologique se vérifie au lieu de se déclarer.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              /* La carte se soulève au survol, comme celles des univers et des
                 publications — l'ancienne version ne réagissait qu'en bordure. */
              whileHover={{ y: -6 }}
              className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center group hover:border-primary transition-[box-shadow,border-color] duration-300"
            >
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-slate-900 transition-all">
                <step.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-slate-500 dark:text-slate-400">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
