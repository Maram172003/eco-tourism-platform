"use client";

import DestinationsPage from "@/app/destinations/page";

/**
 * Catalogue de l'éco-voyageur.
 *
 * Même contenu que la page publique des destinations — offres, circuits,
 * projets, filtres — mais avec la barre de la plateforme au lieu de l'en-tête
 * public, et sans le héros, les témoignages ni le pied de page.
 *
 * On monte le composant existant plutôt que d'en recopier 1300 lignes : les
 * deux vues resteront ainsi toujours synchronisées.
 */
export default function CataloguePage() {
  return <DestinationsPage interne />;
}
