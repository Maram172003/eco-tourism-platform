"use client";

import Link from "next/link";
import { ArrowLeft, Leaf, Menu } from "lucide-react";

type NavbarProps = {
  variant?: "home" | "auth";
  currentPage?: "login" | "register" | null;
  backHref?: string;
};

export default function Navbar({
  variant = "home",
  currentPage = null,
  backHref = "/",
}: NavbarProps) {
  const isAuth = variant === "auth";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-6 md:px-20 lg:px-40 py-4">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between">
        <div className="flex items-center gap-4">
          {isAuth && (
            <Link
              href={backHref}
              className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>
          )}

          <Link
            href="/"
            className="flex items-center gap-2 text-slate-900 dark:text-slate-100"
          >
            <Leaf className="text-primary w-8 h-8" />
            <h2 className="text-xl font-extrabold tracking-tight">Éco-Voyage</h2>
          </Link>
        </div>

        {!isAuth && (
          <nav className="hidden lg:flex items-center gap-10">
            <Link
              href="/destinations"
              className="text-sm font-semibold hover:text-primary transition-colors"
            >
              Destinations
            </Link>
            <Link
              href="/#comment-ca-marche"
              className="text-sm font-semibold hover:text-primary transition-colors"
            >
              Comment ça marche
            </Link>
            <Link
              href="/#publications"
              className="text-sm font-semibold hover:text-primary transition-colors"
            >
              Projets Éco
            </Link>
            <Link
              href="/#a-propos"
              className="text-sm font-semibold hover:text-primary transition-colors"
            >
              À propos
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className={`hidden sm:flex h-11 items-center justify-center rounded-xl px-5 text-sm font-bold transition-all ${
              currentPage === "login"
                ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200"
            }`}
          >
            Connexion
          </Link>

          <Link
            href="/auth/register"
            className={`flex h-11 items-center justify-center rounded-xl px-6 text-sm font-bold transition-all ${
              currentPage === "register"
                ? "bg-primary text-slate-900 shadow-lg shadow-primary/20"
                : "bg-primary text-slate-900 shadow-lg shadow-primary/20 hover:scale-105"
            }`}
          >
            S&apos;inscrire
          </Link>

          <button className="lg:hidden p-2 text-slate-600 dark:text-slate-400">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
}