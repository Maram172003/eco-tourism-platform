import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TAXONOMY_TAGS } from '@/lib/constants/taxonomy-tags';

const VALID_SLUGS = new Set(TAXONOMY_TAGS.map((t) => t.slug));
const SLUG_LIST   = TAXONOMY_TAGS.map((t) => t.slug).join(', ');

const SYSTEM_PROMPT = `Tu es un assistant de classification pour une plateforme d'écotourisme en Tunisie.
On te donne le titre et la description d'une offre ou d'un circuit touristique.

Ta tâche : sélectionner entre 5 et 8 slugs parmi la liste ci-dessous qui correspondent le mieux à cette offre.
Réponds UNIQUEMENT avec un tableau JSON valide de slugs, sans texte autour, sans markdown, sans explication.
Exemple de réponse valide : ["randonnee_pedestre","faune","parcs_naturels"]

Slugs disponibles (utilise UNIQUEMENT ces slugs, orthographe exacte) :
${SLUG_LIST}`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[suggest-tags] GEMINI_API_KEY manquante dans .env.local');
    return NextResponse.json({ error: 'Clé API manquante côté serveur' }, { status: 500 });
  }

  try {
    const { titre, description } = await req.json();

    if (!titre && !description) {
      return NextResponse.json({ error: 'titre ou description requis' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(
      `Titre : ${titre || '(non renseigné)'}\nDescription : ${description || '(non renseignée)'}`,
    );

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
