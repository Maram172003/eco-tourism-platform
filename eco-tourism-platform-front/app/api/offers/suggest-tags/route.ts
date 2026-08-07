import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TAXONOMY_TAGS } from '@/lib/constants/taxonomy-tags';

const VALID_SLUGS = new Set(TAXONOMY_TAGS.map((t) => t.slug));
const SLUG_LIST   = TAXONOMY_TAGS.map((t) => t.slug).join(', ');

const SYSTEM_PROMPT = `Tu es un assistant de classification pour une plateforme d'écotourisme en Tunisie.
On te donne une offre ou un circuit avec ses données structurées.

PRIORITÉ des sources :
1. domaines et expertises du guide propriétaire — donnée la plus fiable
2. catégories et sous-types des collaborateurs (prestataires ou guides invités)
3. titre et description — contexte secondaire uniquement

Ta tâche : sélectionner entre 5 et 8 slugs parmi la liste ci-dessous qui correspondent le mieux à cette offre.
Réponds UNIQUEMENT avec un tableau JSON valide de slugs, sans texte autour, sans markdown, sans explication.
Exemple de réponse valide : ["randonnee_pedestre","faune","parcs_naturels"]

Slugs disponibles (utilise UNIQUEMENT ces slugs, orthographe exacte) :
${SLUG_LIST}`;

interface SectionCollab {
  section?: string;
  domaine?: string;
  expertises?: string[];
  categorie?: string;
  sous_types?: string[];
}

interface Contexte {
  // Offre guide
  domaine_guide?: string;
  expertises_guide?: string[];
  // Offre prestataire
  categorie_prestataire?: string;
  sous_types_prestataire?: string[];
  // Collaborateurs (offres et circuits)
  sections_collab?: SectionCollab[];
  // Circuit : étapes
  etapes_circuit?: Array<{
    domaine?: string;
    expertises?: string[];
    categorie?: string;
    subtypes?: string[];
  }>;
}

function buildContexteText(ctx: Contexte): string {
  const lines: string[] = [];

  if (ctx.domaine_guide) {
    lines.push(`Domaine du guide : ${ctx.domaine_guide}`);
  }
  if (ctx.expertises_guide?.length) {
    lines.push(`Expertises du guide : ${ctx.expertises_guide.join(', ')}`);
  }
  if (ctx.categorie_prestataire) {
    lines.push(`Catégorie prestataire : ${ctx.categorie_prestataire}`);
  }
  if (ctx.sous_types_prestataire?.length) {
    lines.push(`Sous-types prestataire : ${ctx.sous_types_prestataire.join(', ')}`);
  }

  if (ctx.sections_collab?.length) {
    const parts = ctx.sections_collab
      .map((c) => {
        const items: string[] = [];
        if (c.section)    items.push(`section=${c.section}`);
        if (c.domaine)    items.push(`domaine=${c.domaine}`);
        if (c.expertises?.length) items.push(`expertises=${c.expertises.join('/')}`);
        if (c.categorie)  items.push(`catégorie=${c.categorie}`);
        if (c.sous_types?.length) items.push(`sous-types=${c.sous_types.join('/')}`);
        return items.join(', ');
      })
      .filter(Boolean);
    if (parts.length) lines.push(`Collaborateurs : ${parts.join(' | ')}`);
  }

  if (ctx.etapes_circuit?.length) {
    const etapeParts = ctx.etapes_circuit
      .map((e) => {
        const items: string[] = [];
        if (e.domaine)    items.push(`domaine=${e.domaine}`);
        if (e.expertises?.length) items.push(`expertises=${e.expertises.join('/')}`);
        if (e.categorie)  items.push(`catégorie=${e.categorie}`);
        if (e.subtypes?.length)   items.push(`sous-types=${e.subtypes.join('/')}`);
        return items.join(', ');
      })
      .filter(Boolean);
    if (etapeParts.length) lines.push(`Étapes du circuit : ${etapeParts.join(' | ')}`);
  }

  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[suggest-tags] GEMINI_API_KEY manquante dans .env.local');
    return NextResponse.json({ error: 'Clé API manquante côté serveur' }, { status: 500 });
  }

  try {
    const body = await req.json() as { titre?: string; description?: string; contexte?: Contexte };
    const { titre, description, contexte } = body;

    if (!titre && !description && !contexte) {
      return NextResponse.json({ error: 'Au moins un champ requis' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const contextePart = contexte ? buildContexteText(contexte) : '';
    const userMessage = [
      contextePart && `--- Données structurées (priorité haute) ---\n${contextePart}`,
      `--- Titre : ${titre || '(non renseigné)'}`,
      `--- Description : ${description || '(non renseignée)'}`,
    ].filter(Boolean).join('\n\n');

    const result = await model.generateContent(userMessage);
    const raw = result.response.text().trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Réponse non-JSON du modèle' }, { status: 500 });
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Réponse invalide du modèle' }, { status: 500 });
    }

    const tags = (parsed as unknown[]).filter(
      (s): s is string => typeof s === 'string' && VALID_SLUGS.has(s),
    );

    return NextResponse.json({ tags });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur interne';
    console.error('[suggest-tags]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
