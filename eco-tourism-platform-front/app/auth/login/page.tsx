"use client";

import Navbar from "@/components/home/Navbar";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loginUser, resolvePostLoginRedirect } from "@/lib/auth";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const result = await loginUser({ email, password });

      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("refresh_token", result.refresh_token);
      localStorage.setItem("user", JSON.stringify(result.user));

      const next = resolvePostLoginRedirect(
        redirectUrl,
        result.user.role,
        result.dashboard,
      );
      // Hard navigation so role-based redirect always applies
      window.location.assign(next);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la connexion.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col">
      {/* TopAppBar */}
      <Navbar variant="auth" currentPage="login" backHref="/" />

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-3xl rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-tertiary/5 blur-3xl rounded-full -ml-48 -mb-48"></div>

        <div className="w-full max-w-[1440px] px-6 flex justify-center items-center">
          <div className="bg-surface shadow-xl rounded-[2rem] overflow-hidden flex flex-col md:flex-row w-full max-w-5xl min-h-[600px] border border-surface-container-highest/50">
            {/* Left Side */}
            <div className="hidden md:block md:w-1/2 relative bg-surface-container-high overflow-hidden">
              <img
                className="absolute inset-0 w-full h-full object-cover"
                alt="breathtaking landscape of mist-covered alpine mountains at sunrise with emerald green pine forests and a tranquil lake reflecting the sky"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBaI59f32OuFydYZbedv6K31cRTLJhdP9aVgGNb-sRWgxE8XT8vs4TRqjYT5Ol9zUb4pG9XKZdFp6rdyks6Oqn9ekbG2g_rXGqzfXeEtZuWlbduB2yWB9c7WMSodGT1Crvm3p6id3H1157v8NEHN8qjxLudjTE9bUxg-t7gn2c8vaC0QWqS7gBuXslZmRpkeUiHBQCKqEPs6r4oq1JMowJ5lV6Sf1-kvsyLnu5lCr4EFJ3vg2gsuEueh5tA-7KJ77Yxg56EKYq0ZGk"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

              <div className="absolute bottom-12 left-12 right-12 text-white">
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-4 block">
                  L&apos;Avenir du Voyage
                </span>
                <h2 className="text-4xl font-extrabold leading-tight mb-4">
                  Voyagez avec conscience, explorez sans laisser de trace.
                </h2>

                <div className="flex items-center gap-4 text-sm font-medium opacity-90">
                  <div className="flex -space-x-2">
                    <img
                      className="w-8 h-8 rounded-full border-2 border-white"
                      alt="portrait of a traveler smiling"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuACV_RclEv9AkBMBFw5IoCCijncdXfoYKsmcuE1kh42zuRtFVkRKGtUKcnQKogK-aQdM11anQl2xzzJRCCre5T8_gt3mMfxp712luQFr2BNA_T6wywndKj_xnldy2RYZdNHyMmMFOuDTmAkTDtGKRR0q7R4UYGJT-x7Af_c9bDU8NA1Dy3aMEUrzVazWXlO2PRMVrLbTdMvI8qPKZ4DDalHnWQCPokeyTM_oypxBEl7LVTRkJwJWWGreRAcxX16ksrZlcm2MQ7Gs9M"
                    />
                    <img
                      className="w-8 h-8 rounded-full border-2 border-white"
                      alt="portrait of an adventurer in nature"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCizsMnhvoEldF0S-5tMhtYqV36H1TXefH5kgfBXibMv_6pYucn8ha-t3wthlVO3LvyW2oQqjEasPuHy08UamsRm-l606gj1bq5gNUKC4pRB4KazKC8Xc5QG9GNrAkiBT7lKVRw2ypxP5cI9emW0cwyUuQ_0VUzR3cegJBBLlF10pOJco0X2aYwTxw-jk5B0riBcYNShuht3hu3eFaWwHOsCXOJIJOT01gsLNvqpRa73hwwkH5nBppQHJT29JvpgrNrytMgarWty4"
                    />
                  </div>
                  <span>+20k voyageurs éco-responsables</span>
                </div>
              </div>
            </div>

            {/* Right Side */}
            <div className="w-full md:w-1/2 p-10 lg:p-16 flex flex-col justify-center">
              <div className="mb-10 text-center md:text-left">
                <h1 className="text-3xl font-extrabold text-on-surface mb-2 tracking-tight">
                  Connexion
                </h1>
                <p className="text-on-surface-variant font-medium">
                  Bon retour parmi nous ! Veuillez entrer vos coordonnées.
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label
                    className="block text-sm font-bold text-on-surface-variant ml-1"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                      mail
                    </span>
                    <input
                      className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary transition-all font-medium text-on-surface placeholder:text-outline/60"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      id="email"
                      placeholder="nom@exemple.com"
                      type="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label
                      className="text-sm font-bold text-on-surface-variant"
                      htmlFor="password"
                    >
                      Mot de passe
                    </label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>

                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                      lock
                    </span>
                    <input
                      className="w-full pl-12 pr-12 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary transition-all font-medium text-on-surface placeholder:text-outline/60"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      id="password"
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>

                  {error && (
                    <p className="text-sm font-semibold text-red-600">{error}</p>
                  )}
                </div>

                <button
                  disabled={loading}
                  className="w-full py-4 bg-primary text-slate-900 rounded-xl font-extrabold text-lg shadow-lg shadow-primary/30 hover:-translate-y-0.5 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-60"
                  type="submit"
                >
                  {loading ? "Chargement..." : "Se connecter"}
                </button>
              </form>

              <div className="relative my-10">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-container-highest"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-surface text-on-surface-variant font-medium">
                    Ou continuer avec
                  </span>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1">
                <button onClick={() => {
                  window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
                  }} className="flex items-center justify-center gap-3 py-3 px-4 border-2 border-surface-container-highest rounded-xl hover:bg-surface-container-low transition-colors font-bold text-sm w-full">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    ></path>
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    ></path>
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    ></path>
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                      fill="#EA4335"
                    ></path>
                  </svg>
                  Google
                </button>
              </div>

              <p className="mt-10 text-center text-sm font-medium text-on-surface-variant">
                Nouveau sur Éco-Voyage ?
                <Link
                  href="/auth/register"
                  className="text-primary font-bold hover:underline ml-1"
                >
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 mt-auto bg-transparent">
        <div className="flex flex-col md:flex-row justify-center items-center gap-6 px-8 font-manrope text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="text-slate-400">
            © 2024 Éco-Voyage. Tous droits réservés.
          </span>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-primary transition-colors cursor-pointer">
              Confidentialité
            </Link>
            <Link href="#" className="hover:text-primary transition-colors cursor-pointer">
              Conditions
            </Link>
            <Link href="#" className="hover:text-primary transition-colors cursor-pointer">
              Aide
            </Link>
            <Link href="#" className="hover:text-primary transition-colors cursor-pointer">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}