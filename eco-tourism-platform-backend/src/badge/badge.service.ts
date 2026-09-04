import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Offer } from '../offer/entities/offer.entity';
import { Circuit } from '../circuit/entities/circuit.entity';
import { Publication } from '../publication/entities/publication.entity';
import { PlaceContribution } from '../place-contribution/entities/place-contribution.entity';
import { Guide } from '../guide/entities/guide.entity';
import { Provider } from '../provider/entities/provider.entity';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { scoreDurabilite } from '../common/badge-ladder.util';

/**
 * Compteurs bruts servant à décerner les badges.
 *
 * Le service ne décide de rien : il ne fait que mesurer. Les paliers et les
 * libellés vivent côté interface, dans `lib/constants/badges.ts`, pour que le
 * même barème serve partout à l'affichage sans être dupliqué ici.
 */
export type BadgeStats = {
  role: 'guide' | 'provider' | 'eco_traveler' | null;
  /** Score de durabilité du profil, sur 100. */
  sustainability_score: number;
  /** Questionnaire de profil renseigné. */
  questionnaire_done: boolean;
  offers_published: number;
  /** Offres réellement évaluées — un score nul signale un questionnaire non passé. */
  offers_scored: number;
  /** Moyenne des scores de durabilité des offres publiées, sur 100. */
  offers_avg_score: number;
  circuits_published: number;
  circuits_scored: number;
  circuits_avg_score: number;
  /** Offres + circuits réunis — c'est sur cet ensemble que porte la progression. */
  publications_published: number;
  publications_scored: number;
  /**
   * Moyenne de durabilité sur l'ensemble offres + circuits. Recalculée sur les
   * publications elles-mêmes : la moyenne de deux moyennes serait fausse dès
   * que les deux groupes n'ont pas la même taille.
   */
  publications_avg_score: number;
  /**
   * Score de chaque offre ou circuit évalué. Les badges comptent les
   * publications qui atteignent un seuil, seuil qui varie d'un badge à
   * l'autre : renvoyer la liste évite un compteur par palier.
   */
  publication_scores: number[];
  places_shared: number;
  experiences_shared: number;
  contributions_made: number;
  /** Votes reçus sur ses contributions — mesure la reconnaissance des pairs. */
  contribution_votes: number;
};

const VIDE: BadgeStats = {
  role: null,
  sustainability_score: 0,
  questionnaire_done: false,
  offers_published: 0,
  offers_scored: 0,
  offers_avg_score: 0,
  circuits_published: 0,
  circuits_scored: 0,
  circuits_avg_score: 0,
  publications_published: 0,
  publications_scored: 0,
  publications_avg_score: 0,
  publication_scores: [],
  places_shared: 0,
  experiences_shared: 0,
  contributions_made: 0,
  contribution_votes: 0,
};

@Injectable()
export class BadgeService {
  constructor(
    @InjectRepository(Offer) private readonly offerRepo: Repository<Offer>,
    @InjectRepository(Circuit) private readonly circuitRepo: Repository<Circuit>,
    @InjectRepository(Publication) private readonly pubRepo: Repository<Publication>,
    @InjectRepository(PlaceContribution) private readonly contribRepo: Repository<PlaceContribution>,
    @InjectRepository(Guide) private readonly guideRepo: Repository<Guide>,
    @InjectRepository(Provider) private readonly providerRepo: Repository<Provider>,
    @InjectRepository(EcoTraveler) private readonly ecoRepo: Repository<EcoTraveler>,
  ) {}

  async getStats(userId: string, role: string): Promise<BadgeStats> {
    const stats =
      role === 'guide' ? await this.statsPro(userId, 'guide')
      : role === 'provider' ? await this.statsPro(userId, 'provider')
      : role === 'eco_traveler' ? await this.statsVoyageur(userId)
      : { ...VIDE };
    // Le score est désormais produit par la progression : on le recalcule ici,
    // seul endroit qui dispose de tous les compteurs, et on le persiste pour
    // les écrans qui le lisent sur le profil.
    return this.rafraichirScore(userId, role, stats);
  }

  /**
   * Recalcule le score de durabilité depuis l'échelle et l'enregistre.
   *
   * Le score du guide et du prestataire n'était écrit qu'à la soumission du
   * questionnaire, et ne bougeait plus jamais ensuite. Il suit maintenant leur
   * progression, comme celui de l'éco-voyageur.
   */
  private async rafraichirScore(
    userId: string,
    role: string,
    stats: BadgeStats,
  ): Promise<BadgeStats> {
    const depot =
      role === 'guide' ? this.guideRepo
      : role === 'provider' ? this.providerRepo
      : role === 'eco_traveler' ? this.ecoRepo
      : null;
    if (!depot) return stats;

    const profil: any = await (depot as any).findOne({ where: { user_id: userId } });
    if (!profil) return stats;

    const score = scoreDurabilite(role, stats, profil.score_questionnaire);
    if (score !== profil.sustainability_score) {
      await (depot as any).update({ user_id: userId }, { sustainability_score: score });
    }
    return { ...stats, sustainability_score: score };
  }

  /** Guides et prestataires : questionnaire de profil, offres, circuits. */
  private async statsPro(userId: string, role: 'guide' | 'provider'): Promise<BadgeStats> {
    const profil = role === 'guide'
      ? await this.guideRepo.findOne({ where: { user_id: userId } })
      : await this.providerRepo.findOne({ where: { user_id: userId } });

    const [offres, circuits] = await Promise.all([
      this.offerRepo.find({
        where: { author_id: userId, status: 'approved' },
        select: ['id', 'sustainability_score'],
      }),
      this.circuitRepo.find({
        where: { provider_id: userId, status: 'approved' },
        select: ['id', 'sustainability_score'],
      }),
    ]);

    /**
     * La moyenne porte sur les publications réellement évaluées : inclure les
     * non notées la tirerait vers zéro et pénaliserait une qualité constante.
     */
    const mesurer = (l: { sustainability_score: number | null }[]) => {
      const notees = l.filter((x) => (x.sustainability_score ?? 0) > 0);
      const somme = notees.reduce((s, x) => s + (x.sustainability_score ?? 0), 0);
      return {
        publiees: l.length,
        notees: notees.length,
        moyenne: notees.length ? Math.round(somme / notees.length) : 0,
      };
    };

    const o = mesurer(offres);
    const c = mesurer(circuits);
    const ensemble = mesurer([...offres, ...circuits]);

    return {
      ...VIDE,
      role,
      sustainability_score: profil?.sustainability_score ?? 0,
      questionnaire_done: (profil?.score_questionnaire ?? 0) > 0,
      offers_published:   o.publiees,
      offers_scored:      o.notees,
      offers_avg_score:   o.moyenne,
      circuits_published: c.publiees,
      circuits_scored:    c.notees,
      circuits_avg_score: c.moyenne,
      publications_published: ensemble.publiees,
      publications_scored:    ensemble.notees,
      publications_avg_score: ensemble.moyenne,
      publication_scores: [...offres, ...circuits]
        .map((x) => x.sustainability_score ?? 0)
        .filter((n) => n > 0)
        .sort((a, b) => b - a),
    };
  }

  /** Éco-voyageurs : questionnaire, lieux, expériences, contributions. */
  private async statsVoyageur(userId: string): Promise<BadgeStats> {
    const profil = await this.ecoRepo.findOne({ where: { user_id: userId } });

    const [lieux, experiences, contributions] = await Promise.all([
      this.pubRepo.count({ where: { author_id: userId, type: 'place', status: 'approved' } }),
      this.pubRepo.count({ where: { author_id: userId, type: 'experience', status: 'approved' } }),
      this.contribRepo.find({ where: { user_id: userId }, select: ['id', 'vote_count'] }),
    ]);

    return {
      ...VIDE,
      role: 'eco_traveler',
      sustainability_score: profil?.sustainability_score ?? 0,
      questionnaire_done: (profil?.score_questionnaire ?? 0) > 0,
      places_shared:       lieux,
      experiences_shared:  experiences,
      contributions_made:  contributions.length,
      contribution_votes:  contributions.reduce((s, c) => s + (c.vote_count ?? 0), 0),
    };
  }
}
