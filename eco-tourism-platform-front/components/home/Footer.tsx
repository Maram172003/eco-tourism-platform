import { Leaf, Globe, MessageSquare } from "lucide-react";

export default function Footer() {
  return (
    <footer id="a-propos" className="scroll-mt-24 bg-white dark:bg-background-dark border-t border-slate-100 dark:border-slate-800 px-6 md:px-20 lg:px-40 py-16">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Leaf className="text-primary w-8 h-8" />
            <h2 className="text-xl font-extrabold tracking-tight">Éco-Voyage</h2>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">
            Redéfinir le voyage en mettant l'humain et la planète au centre de l'expérience.
          </p>
          <div className="flex gap-4">
            <a
              href="#"
              className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
            >
              <Globe className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-bold mb-6 text-slate-900 dark:text-slate-100">Explorer</h4>
          <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
            <li><a className="hover:text-primary transition-colors" href="/destinations">Toutes les destinations</a></li>
            <li><a className="hover:text-primary transition-colors" href="/destinations?macro=nature">Nature</a></li>
            <li><a className="hover:text-primary transition-colors" href="/destinations?macro=gastronomie">Gastronomie</a></li>
            <li><a className="hover:text-primary transition-colors" href="/destinations?macro=artisanat">Artisanat</a></li>
            <li><a className="hover:text-primary transition-colors" href="/destinations?macro=hebergement">Hébergement</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-6 text-slate-900 dark:text-slate-100">Rejoindre</h4>
          <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
            <li><a className="hover:text-primary transition-colors" href="/auth/register?role=eco_traveler">Devenir éco-voyageur</a></li>
            <li><a className="hover:text-primary transition-colors" href="/auth/register?role=guide">Devenir guide</a></li>
            <li><a className="hover:text-primary transition-colors" href="/auth/register?role=provider">Devenir prestataire</a></li>
            <li><a className="hover:text-primary transition-colors" href="/auth/login">Se connecter</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-6 text-slate-900 dark:text-slate-100">Légal</h4>
          <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
            <li><a className="hover:text-primary transition-colors" href="#">Confidentialité</a></li>
            <li><a className="hover:text-primary transition-colors" href="#">Conditions Générales</a></li>
            <li><a className="hover:text-primary transition-colors" href="#">Mentions Légales</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto mt-16 pt-8 border-t border-slate-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-slate-400 font-medium">
          © 2026 Éco-Voyage. Fièrement engagé pour la planète.
        </p>
        <a href="/destinations" className="text-xs font-bold text-primary hover:underline underline-offset-4">
          Découvrir les offres et circuits
        </a>
      </div>
    </footer>
  );
}