import { DataSource } from 'typeorm';
import {
  Answer,
  Question,
  QuestionCategory,
  Questionnaire,
} from '../../questionnaire/entities/questionnaire.entities';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../../../.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  entities: [Questionnaire, QuestionCategory, Question, Answer],
  synchronize: true,
});

const QUESTIONS = [
  {
    text: "Comment gérez-vous la consommation d'énergie dans votre établissement ou activité ?",
    category: 'environmental',
    order: 1,
    answers: [
      { text: "Je n'ai pas de pratique particulière", score: 1 },
      { text: "J'éteins les lumières et équipements inutilisés", score: 2 },
      { text: "J'ai installé des équipements économes en énergie", score: 3 },
      { text: "J'utilise des énergies renouvelables et suis certifié éco-responsable", score: 4 },
    ],
  },
  {
    text: "Comment gérez-vous les déchets produits par votre activité ?",
    category: 'environmental',
    order: 2,
    answers: [
      { text: "Je ne fais pas de tri particulier", score: 1 },
      { text: "Je trie les déchets recyclables", score: 2 },
      { text: "Je trie, réduis et sensibilise mes clients au zéro déchet", score: 3 },
      { text: "Je pratique le zéro déchet, compost, et je mesure mon impact annuellement", score: 4 },
    ],
  },
  {
    text: "Quel est votre rapport à l'approvisionnement local ?",
    category: 'economic',
    order: 3,
    answers: [
      { text: "Je m'approvisionne au moins cher, peu importe l'origine", score: 1 },
      { text: "J'achète local quand c'est pratique", score: 2 },
      { text: "Je favorise systématiquement les producteurs locaux", score: 3 },
      { text: "Je travaille exclusivement avec des producteurs locaux certifiés et transparents", score: 4 },
    ],
  },
  {
    text: "Comment intégrez-vous les communautés locales dans votre activité ?",
    category: 'social',
    order: 4,
    answers: [
      { text: "Mon activité est indépendante de la communauté locale", score: 1 },
      { text: "J'emploie quelques personnes du quartier", score: 2 },
      { text: "Je crée des partenariats avec des artisans et producteurs locaux", score: 3 },
      { text: "Je co-gère mon activité avec la communauté et reverse une part aux projets sociaux locaux", score: 4 },
    ],
  },
  {
    text: "Comment informez-vous vos clients sur vos pratiques durables ?",
    category: 'social',
    order: 5,
    answers: [
      { text: "Je n'en parle pas", score: 1 },
      { text: "J'affiche quelques informations", score: 2 },
      { text: "Je fournis un guide de bonnes pratiques à chaque client", score: 3 },
      { text: "J'organise des ateliers de sensibilisation et publie un rapport annuel de durabilité", score: 4 },
    ],
  },
  {
    text: "Quelle est votre politique vis-à-vis de la faune et de la flore locale ?",
    category: 'environmental',
    order: 6,
    answers: [
      { text: "Je n'ai pas de politique particulière", score: 1 },
      { text: "Je respecte les espèces protégées quand je les connais", score: 2 },
      { text: "Je forme mon personnel et mes clients à la protection de la biodiversité", score: 3 },
      { text: "Je participe activement à des programmes de conservation locaux", score: 4 },
    ],
  },
  {
    text: "Comment gérez-vous la consommation d'eau dans votre établissement ?",
    category: 'environmental',
    order: 7,
    answers: [
      { text: "Je ne limite pas la consommation d'eau", score: 1 },
      { text: "J'encourage les clients à économiser l'eau", score: 2 },
      { text: "J'ai installé des équipements hydro-économes", score: 3 },
      { text: "Je collecte l'eau de pluie et surveille ma consommation mensuelle", score: 4 },
    ],
  },
  {
    text: "Proposez-vous des options pour réduire l'empreinte carbone de vos clients ?",
    category: 'environmental',
    order: 8,
    answers: [
      { text: "Non, ce n'est pas mon rôle", score: 1 },
      { text: "Je mentionne les transports en commun", score: 2 },
      { text: "Je propose des alternatives de transport éco-responsable", score: 3 },
      { text: "J'intègre la compensation carbone et collabore avec des acteurs de mobilité durable", score: 4 },
    ],
  },
  {
    text: "Comment rémunérez-vous vos employés et collaborateurs locaux ?",
    category: 'economic',
    order: 9,
    answers: [
      { text: "Je paie le minimum légal", score: 1 },
      { text: "Je paie correctement selon le marché", score: 2 },
      { text: "Je paie au-dessus du marché et offre des avantages sociaux", score: 3 },
      { text: "Je pratique la rémunération équitable, transparente et indexée sur les bénéfices", score: 4 },
    ],
  },
  {
    text: "Avez-vous des certifications ou labels de durabilité pour votre activité ?",
    category: 'economic',
    order: 10,
    answers: [
      { text: "Aucune certification", score: 1 },
      { text: "Je connais les labels mais n'en ai pas encore", score: 2 },
      { text: "Je suis en cours de certification", score: 3 },
      { text: "Je possède une ou plusieurs certifications éco-responsables reconnues", score: 4 },
    ],
  },
];

async function seed() {
  if (!process.env.DB_HOST || !process.env.DB_PASSWORD) {
    console.error('Variables .env manquantes.');
    process.exit(1);
  }

  await dataSource.initialize();
  console.log('Database connected');

  const questionnaireRepo = dataSource.getRepository(Questionnaire);
  const categoryRepo      = dataSource.getRepository(QuestionCategory);
  const questionRepo      = dataSource.getRepository(Question);
  const answerRepo        = dataSource.getRepository(Answer);

  const existing = await questionnaireRepo.findOne({
    where: { target_type: 'provider', is_active: true },
  });

  if (existing) {
    console.log('Questionnaire provider already seeded. Skipping.');
    await dataSource.destroy();
    return;
  }

  // Réutiliser les catégories existantes ou créer si nécessaire
  let categories = await categoryRepo.find({
    where: [{ name: 'environmental' }, { name: 'social' }, { name: 'economic' }],
  });

  if (categories.length < 3) {
    const existing = new Set(categories.map((c) => c.name));
    const toCreate = ['environmental', 'social', 'economic'].filter((n) => !existing.has(n));
    const newCats = await categoryRepo.save(toCreate.map((name) => categoryRepo.create({ name })));
    categories = [...categories, ...newCats];
  }

  const catMap = new Map(categories.map((c) => [c.name, c]));

  const questionnaire = await questionnaireRepo.save(
    questionnaireRepo.create({
      name: 'Questionnaire Prestataire Éco-Responsable',
      target_type: 'provider',
      version: 1,
      description: 'Évaluez les pratiques durables de votre activité en tant que prestataire éco-touristique.',
      max_score: QUESTIONS.length * 4,
      is_active: true,
    }),
  );

  for (const q of QUESTIONS) {
    const question = await questionRepo.save(
      questionRepo.create({
        questionnaire_id: questionnaire.id,
        category_id:      catMap.get(q.category)!.id,
        question_text:    q.text,
        question_order:   q.order,
        weight:           1,
      }),
    );

    for (let i = 0; i < q.answers.length; i++) {
      await answerRepo.save(
        answerRepo.create({
          question_id:  question.id,
          answer_text:  q.answers[i].text,
          score:        q.answers[i].score,
          answer_order: i,
        }),
      );
    }
  }

  console.log(`Seeded provider questionnaire with ${QUESTIONS.length} questions`);
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
