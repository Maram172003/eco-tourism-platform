"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function Hero() {
  const router = useRouter();
  const [recherche, setRecherche] = useState("");
  function lancerRecherche() {
    const q = recherche.trim();
    router.push(q ? `/destinations?q=${encodeURIComponent(q)}` : "/destinations");
  }

  return (
    <section className="px-6 md:px-20 lg:px-40 py-12 md:py-20 max-w-[1440px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-8 order-2 lg:order-1"
        >
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary dark:bg-primary/20">
            <Sparkles className="w-4 h-4" />
            Écotourisme en Tunisie
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-5xl md:text-6xl font-black leading-[1.1] tracking-tight text-slate-900 dark:text-slate-50">
              Voyagez avec <span className="text-primary">sens</span> et respect.
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
              Offres et circuits proposés par des guides et des prestataires vérifiés,
              chacun évalué sur 100 par un questionnaire de durabilité.
            </p>
          </div>

          {/* ⚠︎ Barre de recherche — présentation inchangée. */}
          <div className="relative group max-w-xl">
            <div className="flex h-16 w-full items-center rounded-2xl bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-2 overflow-hidden">
              <div className="flex items-center pl-4 text-slate-400 group-focus-within:text-primary transition-colors">
                <Search className="w-6 h-6" />
              </div>
              <input
                className="h-full w-full border-none bg-transparent px-4 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none text-base font-medium"
                placeholder="Quelle sera votre prochaine éco-aventure ?"
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") lancerRecherche(); }}
              />
              <button
                onClick={lancerRecherche}
                className="h-full px-6 rounded-xl bg-primary text-slate-900 font-bold hover:brightness-105 transition-all"
              >
                Rechercher
              </button>
            </div>
          </div>

        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative order-1 lg:order-2"
        >
          <div
            className="aspect-[4/5] w-full rounded-3xl bg-slate-200 overflow-hidden shadow-2xl rotate-2"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBr_4J4NnLKimvoZyyUfLdl-pmNq205ACfosz-GTW5G0ELpCTmrF_1PJgEH3xG2lQ6ZyjEBm-RRTcBX3sq7pNyxk3POn5zHZqOaLn8EajVYFm0DgzDSBzZzxeFmz8UjmqjYdbMAnTNh1VHD1u5ubJGCR1bHOGg31LvwKubjtwzr5HN_gpk2F4F2sOHjXUl4PweTg-F25ObRxeMDw8PL4Txb9v7teEBGU8kG1gWWijjxdX950eTzvvhecR3QwnKBeyUlHstHIus_esw')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-6 -left-6 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-4 border border-slate-100 dark:border-slate-700"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter leading-none">
                Score de durabilité
              </p>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100">
                Noté sur 100
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
