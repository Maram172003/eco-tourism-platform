/**
 * Chemin du tableau de bord selon le rôle.
 *
 * Doit rester aligné sur `getDashboardPathByRole` du backend, qui décide de la
 * redirection après connexion. Une vingtaine d'écrans renvoyaient vers
 * `/dashboard` en dur : un éco-voyageur atterrissait donc sur le tableau de
 * bord générique après l'onboarding ou le questionnaire, alors que la connexion
 * l'envoyait sur le sien.
 */
export function cheminTableauDeBord(role?: string | null): string {
  switch (role) {
    // Le tableau de bord de l'éco-voyageur est `/dashboard`, qui porte
    // ses expériences et ses lieux ; `/dashboard/ecovoyageur` est une
    // version antérieure, conservée pour ses sous-pages de réservations.
    case "eco_traveler":  return "/dashboard";
    case "provider":      return "/dashboard/provider";
    case "guide":         return "/dashboard/guide";
    case "admin":         return "/dashboard/admin";
    case "project":
    case "project_owner": return "/dashboard/project-owner";
    default:              return "/dashboard";
  }
}

/** Le rôle du compte connecté, lu depuis le stockage local. */
export function roleCourant(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("user") ?? "null")?.role ?? null;
  } catch {
    return null;
  }
}

/** Raccourci : le tableau de bord du compte connecté. */
export function monTableauDeBord(): string {
  return cheminTableauDeBord(roleCourant());
}
