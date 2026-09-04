import { BadRequestException, Injectable, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Offer } from './entities/offer.entity';
import { OfferSession } from './entities/offer-session.entity';
import { OfferCollaboration } from './entities/offer-collaboration.entity';
import { CreateOfferDto, OfferSustainabilityDto, UpdateOfferDto } from './dto/offer.dto';
import {
  extractConfirmationLabel,
  normalizeConfirmationMode,
} from '../common/confirmation.util';
import { ProviderActivity } from '../provider-activity/entities/provider-activity.entity';
import { ActivityDetails, ActivityDetailsDocument } from '../provider-activity/schemas/activity-details.schema';
import { GuideAvailabilitySlot } from '../guide/entities/guide-availability.entity';
import { Guide } from '../guide/entities/guide.entity';
import { Provider } from '../provider/entities/provider.entity';
import { ProfileApprovalService } from '../common/services/profile-approval.service';
import { Organization } from '../organization/entities/organization.entity';
import { NotificationService } from '../notifications/notification.service';
import { SlotLike, overlappingDays, dispoEqual, toSlotType } from '../shared/slot.utils';
import { ReservationService } from '../reservation/reservation.service';
import { enrichOfferWithVariantFields } from './offer-variant.util';

// Champs d'onboarding pouvant contraindre la capacité d'une offre
const CAPACITY_FIELD_NAMES = [
  'capacite_max', 'capacite_salle', 'nb_places', 'max_participants',
  'capacite_vehicule', 'nb_personnes_max', 'nb_lits', 'nombre_places',
];

/**
 * Sépare ce que le formulaire envoie en un seul champ : un code pour la
 * colonne, l'intitulé choisi pour les détails.
 *
 * Le prestataire envoyait jusqu'ici l'intitulé directement dans
 * `confirmation_mode` ; la colonne contenait alors « Sous 24h (validation
 * manuelle) », que plus rien ne pouvait comparer à `'instant'`. Une offre à
 * confirmation immédiate partait donc quand même en attente.
 */
function repartirConfirmation(
  recu: string | null | undefined,
  details: Record<string, any> | null | undefined,
): { mode: string; details: Record<string, any> | null } {
  let sortie: Record<string, any> | null = details ? { ...details } : null;
  const intitule = extractConfirmationLabel(recu);
  if (intitule) {
    // On ne perd pas la nuance « sous 24h » / « sous 48h » / « devis » : elle
    // n'a pas d'équivalent dans le code stocké en colonne.
    sortie = { ...(sortie ?? {}), type_confirmation: intitule };
  }
  const mode =
    normalizeConfirmationMode(recu) ??
    normalizeConfirmationMode(sortie?.type_confirmation) ??
    'manual';
  return { mode, details: sortie };
}

@Injectable()
export class OfferService {
  constructor(
    @InjectRepository(Offer)
    private readonly repo: Repository<Offer>,

    @InjectRepository(OfferSession)
    private readonly sessionRepo: Repository<OfferSession>,

    @InjectRepository(ProviderActivity)
    private readonly activityRepo: Repository<ProviderActivity>,

    @InjectModel(ActivityDetails.name)
    private readonly activityDetailsModel: Model<ActivityDetailsDocument>,

    @InjectRepository(OfferCollaboration)
    private readonly collabRepo: Repository<OfferCollaboration>,

    @InjectRepository(GuideAvailabilitySlot)
    private readonly availRepo: Repository<GuideAvailabilitySlot>,

    @InjectRepository(Guide)
    private readonly guideRepo: Repository<Guide>,

    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,

    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,

    private readonly notifService: NotificationService,

    private readonly profileApproval: ProfileApprovalService,

    @Optional()
    private readonly reservationService?: ReservationService,
  ) {}

  async create(authorId: string, dto: CreateOfferDto, initialStatus: string = 'draft'): Promise<Offer> {
    if (dto.status) initialStatus = dto.status;
    // Aucune offre — pas même un brouillon — tant que le profil n'est pas validé.
    await this.profileApproval.assertApproved(authorId, 'créer une offre');
    // Validation des contraintes si une activité est liée
    if (dto.activity_id) {
      await this.validateAgainstActivity(dto);
    }

    if (!dto.availability_start || !dto.availability_end) {
      throw new BadRequestException('Les dates de disponibilité (début et fin) sont obligatoires.');
    }
    if (new Date(dto.availability_end) < new Date(dto.availability_start)) {
      throw new BadRequestException('La date de fin doit être postérieure à la date de début.');
    }

    // Le formulaire envoie l'intitulé en toutes lettres. La colonne garde un
    // code — seul comparable — et l'intitulé exact rejoint les détails, d'où
    // la fiche de l'offre et la réservation le reliront tel quel.
    const confirmation = repartirConfirmation(dto.confirmation_mode, dto.details);

    const offer = this.repo.create({
      author_id: authorId,
      author_type: 'provider',
      organization_id: dto.organization_id ?? null,
      activity_id: dto.activity_id ?? null,
      title: dto.title,
      description: dto.description ?? null,
      price: dto.price ?? null,
      duration: dto.duration ?? null,
      offer_type: dto.offer_type ?? null,
      offer_subtype: dto.offer_subtype ?? (dto.offer_subtypes?.[0] ?? null),
      offer_subtypes: dto.offer_subtypes?.length ? dto.offer_subtypes : null,
      offer_mode: dto.offer_mode ?? 'single',
      availability_mode: dto.availability_mode ?? 'period',
      availability_start: new Date(dto.availability_start),
      availability_end: new Date(dto.availability_end),
      fulfillment_mode: dto.fulfillment_mode ?? null,
      confirmation_mode: confirmation.mode,
      price_type: dto.price_type ?? 'per_person',
      capacity: dto.capacity ?? null,
      booking_deadline_hours: dto.booking_deadline_hours ?? null,
      confirmation_deadline_hours: dto.confirmation_deadline_hours ?? null,
      production_delay_days: dto.production_delay_days ?? null,
      deposit_percentage: dto.deposit_percentage ?? 0,
      details: confirmation.details,
      images: dto.images?.length ? dto.images : null,
      inclusions: dto.inclusions ?? null,
      region: dto.region ?? null,
      meeting_point: dto.meeting_point ?? null,
      meeting_lat: dto.meeting_lat ?? null,
      meeting_lng: dto.meeting_lng ?? null,
      min_group_size: dto.min_group_size ?? null,
      max_group_size: dto.max_group_size ?? null,
      min_age: dto.min_age ?? null,
      cancellation_policy: dto.cancellation_policy ?? null,
      status: initialStatus,
    });
    return this.repo.save(offer);
  }

  async findByAuthor(authorId: string): Promise<Offer[]> {
    const offers = await this.repo.find({
      where: { author_id: authorId },
      order: { created_at: 'DESC' },
    });
    // Corriger les offres en attente_publication qui ont encore un collab non terminé
    for (const offer of offers) {
      if ((offer as any).status === 'attente_publication') {
        const collabs = await this.collabRepo.find({ where: { offer_id: offer.id } });
        const hasIncomplete = collabs.some(
          (c) => (c as any).status === 'pending' || (c as any).status === 'accepted',
        );
        if (hasIncomplete) {
          await this.repo.update({ id: offer.id }, { status: 'draft' } as any);
          (offer as any).status = 'draft';
        }
      }
    }
    return offers;
  }

  async findByOrganization(organizationId: string): Promise<Offer[]> {
    return this.repo.find({
      where: { organization_id: organizationId },
      order: { created_at: 'DESC' },
    });
  }

  async findPublishedByOrganization(organizationId: string): Promise<Offer[]> {
    return this.repo.find({
      where: { organization_id: organizationId, status: 'approved' },
      order: { created_at: 'DESC' },
    });
  }

  async findPublishedByAuthor(authorId: string): Promise<Offer[]> {
    return this.repo.find({
      where: { author_id: authorId, status: 'approved' },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Collaborateurs d'une offre tels qu'un visiteur doit les voir.
   *
   * `details.collaborators` est un instantané écrit une seule fois, à la
   * publication : un nom corrigé depuis, ou une invitation qui a changé d'état,
   * n'y sont jamais reportés — l'offre publiée continue d'annoncer ce qui était
   * vrai ce jour-là. La table des collaborations fait foi, on la relit donc.
   *
   * Et seules les collaborations acceptées sont publiées : qui a été invité et
   * n'a pas encore répondu relève de la préparation de l'offre, pas du
   * catalogue. L'identifiant du collaborateur n'a rien à y faire non plus.
   */
  private detailsPublics(
    details: Record<string, any> | null | undefined,
    collabs: OfferCollaboration[],
  ): Record<string, any> | null {
    if (!details) return details ?? null;
    const publics = collabs
      .filter((c) => c.status === 'accepted' || c.status === 'completed')
      .map((c) => ({
        name: c.invited_user_name ?? null,
        section: c.section,
        status: c.status,
      }))
      .filter((c) => c.name);
    const sortie: Record<string, any> = { ...details };
    if (publics.length > 0) sortie.collaborators = publics;
    else delete sortie.collaborators;
    return sortie;
  }

  async findAllPublic(): Promise<any[]> {
    const offers = await this.repo.find({
      where: { status: 'approved' },
      order: { created_at: 'DESC' },
    });

    // Une seule requête pour toutes les offres : la liste publique est
    // parcourue en entier à chaque affichage du catalogue.
    const collabRows = offers.length
      ? await this.collabRepo.find({ where: { offer_id: In(offers.map((o) => o.id)) } })
      : [];
    const collabsParOffre = new Map<string, OfferCollaboration[]>();
    for (const c of collabRows) {
      const liste = collabsParOffre.get(c.offer_id) ?? [];
      liste.push(c);
      collabsParOffre.set(c.offer_id, liste);
    }

    return Promise.all(
      offers.map(async (offer) => {
        let author_name: string | null = null;
        let author_photo: string | null = null;
        let org_name: string | null = null;
        let org_logo: string | null = null;

        if (offer.author_type === 'guide') {
          const guide = await this.guideRepo.findOne({ where: { user_id: offer.author_id } });
          author_name = guide?.full_name ?? null;
          author_photo = guide?.photo ?? null;
        } else {
          const provider = await this.providerRepo.findOne({ where: { user_id: offer.author_id } as any });
          author_name = (provider as any)?.full_name ?? null;
          author_photo = (provider as any)?.photo ?? null;
        }

        if (offer.organization_id) {
          const org = await this.orgRepo.findOne({ where: { id: offer.organization_id } as any });
          org_name = (org as any)?.name ?? null;
          org_logo = (org as any)?.logo ?? null;
        }

        return enrichOfferWithVariantFields({
          ...offer,
          details: this.detailsPublics(
            (offer as any).details,
            collabsParOffre.get(offer.id) ?? [],
          ),
          author_name,
          author_photo,
          org_name,
          org_logo,
        } as Offer);
      }),
    );
  }

  async findById(id: string): Promise<Offer> {
    const offer = await this.repo.findOne({ where: { id } });
    if (!offer) throw new NotFoundException('Offre introuvable.');
    // Route publique : mêmes collaborateurs que dans la liste du catalogue.
    const collabs = await this.collabRepo.find({ where: { offer_id: id } });
    (offer as any).details = this.detailsPublics((offer as any).details, collabs);
    return enrichOfferWithVariantFields(offer);
  }

  async update(authorId: string, offerId: string, dto: UpdateOfferDto): Promise<Offer> {
    // Profil non validé : les brouillons déjà en base ne sont pas modifiables non plus.
    await this.profileApproval.assertApproved(authorId, 'modifier une offre');
    const offer = await this.findOrFail(offerId);
    if (offer.author_id !== authorId) throw new ForbiddenException('Accès refusé.');
    if ((offer as any).status === 'approved') {
      throw new BadRequestException('Cette offre est publiée et ne peut plus être modifiée. Supprimez-la si nécessaire.');
    }

    if (dto.activity_id) {
      await this.validateAgainstActivity({ activity_id: dto.activity_id, capacity: undefined, max_group_size: undefined, details: dto.details } as CreateOfferDto);
    }

    // Capture state before modification to detect changes relevant to collab agenda
    const oldTitle = offer.title ?? '';
    const oldDispo = ((offer as any).details as any)?.disponibilite as SlotLike | undefined;

    if (dto.title !== undefined) offer.title = dto.title;
    if (dto.organization_id !== undefined) offer.organization_id = dto.organization_id ?? null;
    if (dto.activity_id !== undefined) offer.activity_id = dto.activity_id ?? null;
    if (dto.description !== undefined) offer.description = dto.description ?? null;
    if (dto.price !== undefined) offer.price = dto.price ?? null;
    if (dto.duration !== undefined) offer.duration = dto.duration ?? null;
    if (dto.offer_type !== undefined) offer.offer_type = dto.offer_type ?? null;
    if (dto.offer_subtype !== undefined) offer.offer_subtype = dto.offer_subtype ?? null;
    if (dto.offer_subtypes !== undefined) offer.offer_subtypes = dto.offer_subtypes?.length ? dto.offer_subtypes : null;
    if (dto.offer_mode !== undefined) offer.offer_mode = dto.offer_mode ?? 'single';
    if (dto.availability_mode !== undefined) offer.availability_mode = dto.availability_mode ?? 'period';
    if (dto.availability_start !== undefined) {
      if (!dto.availability_start) {
        throw new BadRequestException('La date de début de disponibilité est obligatoire.');
      }
      offer.availability_start = new Date(dto.availability_start);
    }
    if (dto.availability_end !== undefined) {
      if (!dto.availability_end) {
        throw new BadRequestException('La date de fin de disponibilité est obligatoire.');
      }
      offer.availability_end = new Date(dto.availability_end);
    }
    if (dto.images !== undefined) offer.images = dto.images?.length ? dto.images : null;
    if (dto.inclusions !== undefined) offer.inclusions = dto.inclusions ?? null;
    if (dto.region !== undefined) offer.region = dto.region ?? null;
    if (dto.meeting_point !== undefined) offer.meeting_point = dto.meeting_point ?? null;
    if (dto.meeting_lat !== undefined) offer.meeting_lat = dto.meeting_lat ?? null;
    if (dto.meeting_lng !== undefined) offer.meeting_lng = dto.meeting_lng ?? null;
    if (dto.min_group_size !== undefined) offer.min_group_size = dto.min_group_size ?? null;
    if (dto.max_group_size !== undefined) offer.max_group_size = dto.max_group_size ?? null;
    if (dto.min_age !== undefined) offer.min_age = dto.min_age ?? null;
    if (dto.cancellation_policy !== undefined) offer.cancellation_policy = dto.cancellation_policy ?? null;
    // (le type de confirmation est réparti plus bas, avec les détails)
    if (dto.confirmation_deadline_hours !== undefined) offer.confirmation_deadline_hours = dto.confirmation_deadline_hours ?? null;
    if (dto.deposit_percentage !== undefined) offer.deposit_percentage = dto.deposit_percentage ?? null;
    if (dto.details !== undefined) offer.details = dto.details ?? null;
    if (dto.confirmation_mode !== undefined || dto.details !== undefined) {
      const maj = repartirConfirmation(
        dto.confirmation_mode ?? offer.confirmation_mode,
        (offer.details as Record<string, any> | null) ?? undefined,
      );
      offer.confirmation_mode = maj.mode;
      offer.details = maj.details;
    }
    if (dto.tags !== undefined) (offer as any).tags = dto.tags ?? null;
    // Le profil est déjà vérifié en tête de méthode : un PATCH ne peut donc plus
    // servir à contourner publishOffer() en forçant un statut diffusable.
    if (dto.status !== undefined) offer.status = dto.status;

    // Logique _finalize : draft → attente_publication si tous les collabs sont terminés/refusés
    if ((dto as any)._finalize) {
      const currentStatus = (offer as any).status as string;
      if (currentStatus === 'draft' || currentStatus === 'rejected') {
        const collabs = await this.collabRepo.find({ where: { offer_id: offerId } });
        const activeCollabs = collabs.filter((c) => (c as any).status !== 'declined');
        const hasPending = activeCollabs.some(
          (c) => (c as any).status === 'pending' || (c as any).status === 'accepted',
        );
        (offer as any).status = hasPending ? 'draft' : 'attente_publication';
      }
    }

    const saved = await this.repo.save(offer);

    // Synchronize collaborator agenda slots when title or availability changed
    const newTitle = saved.title ?? oldTitle;
    const newDispo = ((saved as any).details as any)?.disponibilite as SlotLike | undefined;
    const titleChanged = oldTitle !== newTitle;
    const dispoChanged = !dispoEqual(oldDispo, newDispo);

    if ((titleChanged || dispoChanged) && (newDispo?.type || dispoChanged)) {
      await this.syncCollabSlots(offerId, oldTitle, newTitle, oldDispo, newDispo, titleChanged, dispoChanged);
    }

    return saved;
  }

  private async syncCollabSlots(
    offerId: string,
    oldTitle: string,
    newTitle: string,
    oldDispo: SlotLike | undefined,
    newDispo: SlotLike | undefined,
    titleChanged: boolean,
    dispoChanged: boolean,
  ): Promise<void> {
    const collabs = await this.collabRepo.find({ where: { offer_id: offerId } });
    const activeCollabs = collabs.filter((c) => (c as any).status !== 'declined');

    for (const c of activeCollabs) {
      const collabStatus = (c as any).status as string;
      const oldLabel = `[Collab] ${oldTitle} — ${(c as any).section}`;
      const newLabel = `[Collab] ${newTitle} — ${(c as any).section}`;
      const collabUserId = (c as any).invited_user_id as string;
      const hasSlot = ['accepted', 'completed'].includes(collabStatus);

      if (dispoChanged && newDispo?.type) {
        const allSlots = await this.availRepo.find({ where: { guide_id: collabUserId } });
        const oldSlots = allSlots.filter((s) => (s as any).label === oldLabel);
        const otherSlots = allSlots.filter((s) => (s as any).label !== oldLabel);

        let conflictInfo: { label: string; days: string[] } | null = null;
        for (const slot of otherSlots) {
          const days = overlappingDays(newDispo, slot as SlotLike);
          if (days.length > 0) { conflictInfo = { label: (slot as any).label ?? slot.type, days }; break; }
        }

        if (hasSlot) {
          if (oldSlots.length) await this.availRepo.remove(oldSlots);
          await this.availRepo.save(this.availRepo.create({
            guide_id: collabUserId,
            type: toSlotType(newDispo.type),
            dates: newDispo.dates ?? null,
            start_date: newDispo.start_date ?? null,
            end_date: newDispo.end_date ?? null,
            days_of_week: newDispo.days_of_week ?? null,
            label: newLabel,
            time_slots: (newDispo as any).time_slots ?? null,
          }));
        }

        // Ne notifier le conflit que pour les collabs ayant déjà accepté (hasSlot)
        // Les pending n'ont pas de créneau agenda et peuvent juste refuser l'invitation
        if (hasSlot) {
          if (conflictInfo) {
            await this.notifService.replaceForOffer(collabUserId, 'offer_schedule_conflict', offerId, {
              offer_id: offerId,
              offer_title: newTitle,
              section: (c as any).section,
              conflicting_slot: conflictInfo.label,
              conflict_days: conflictInfo.days,
              message: `Les horaires de l'offre « ${newTitle} » ont changé et créent un conflit avec votre agenda (${conflictInfo.label}). Réglez votre agenda pour maintenir votre collaboration.`,
            });
            await this.notifService.deleteForOffer(collabUserId, 'offer_schedule_changed', offerId).catch(() => {});
          } else {
            await this.notifService.deleteForOffer(collabUserId, 'offer_schedule_conflict', offerId).catch(() => {});
            await this.notifService.create(collabUserId, 'offer_schedule_changed', {
              offer_id: offerId,
              offer_title: newTitle,
              section: (c as any).section,
              message: `Les horaires de l'offre « ${newTitle} » ont été mis à jour. Votre agenda a été synchronisé automatiquement.`,
            });
          }
        } else {
          // Collab pending : nettoyer les éventuelles vieilles notifs de conflit
          await this.notifService.deleteForOffer(collabUserId, 'offer_schedule_conflict', offerId).catch(() => {});
        }
      } else if (titleChanged && hasSlot && oldTitle !== newTitle) {
        // Only title changed — rename the existing slot label
        const oldSlots = await this.availRepo.find({ where: { guide_id: collabUserId, label: oldLabel } });
        if (oldSlots.length) {
          const s = oldSlots[0];
          await this.availRepo.remove(oldSlots);
          await this.availRepo.save(this.availRepo.create({
            guide_id: collabUserId,
            type: s.type,
            dates: s.dates ?? null,
            start_date: s.start_date ?? null,
            end_date: s.end_date ?? null,
            days_of_week: s.days_of_week ?? null,
            label: newLabel,
            time_slots: s.time_slots ?? null,
          }));
        }
      }
    }
  }

  async checkCollabConflicts(
    ownerId: string,
    offerId: string,
    disponibilite: SlotLike,
  ): Promise<{ userId: string; userName: string; section: string; conflictSlot: string; conflictDays: string[]; conflictTimeSlots: any }[]> {
    const offer = await this.findOrFail(offerId);
    if (offer.author_id !== ownerId) throw new ForbiddenException('Accès refusé.');

    const collabs = await this.collabRepo.find({ where: { offer_id: offerId } });
    const activeCollabs = collabs.filter((c) => (c as any).status !== 'declined');
    const result: { userId: string; userName: string; section: string; conflictSlot: string; conflictDays: string[]; conflictTimeSlots: any }[] = [];

    for (const c of activeCollabs) {
      const collabUserId = (c as any).invited_user_id as string;
      const collabLabel = `[Collab] ${(offer as any).title} — ${(c as any).section}`;
      const allSlots = await this.availRepo.find({ where: { guide_id: collabUserId } });
      const otherSlots = allSlots.filter((s) => (s as any).label !== collabLabel);

      for (const slot of otherSlots) {
        const days = overlappingDays(disponibilite, slot as SlotLike);
        if (days.length > 0) {
          result.push({
            userId: collabUserId,
            userName: (c as any).invited_user_name ?? collabUserId,
            section: (c as any).section,
            conflictSlot: (slot as any).label ?? slot.type,
            conflictDays: days,
            conflictTimeSlots: (slot as any).time_slots ?? null,
          });
          break;
        }
      }
    }

    return result;
  }

  async updateOfferSustainability(authorId: string, offerId: string, dto: OfferSustainabilityDto): Promise<Offer> {
    const offer = await this.findOrFail(offerId);
    if (offer.author_id !== authorId) throw new ForbiddenException('Accès refusé.');
    offer.sustainability_score = dto.score;
    return this.repo.save(offer);
  }

  async remove(authorId: string, offerId: string): Promise<{ message: string }> {
    const offer = await this.findOrFail(offerId);
    if (offer.author_id !== authorId) throw new ForbiddenException('Accès refusé.');

    const offerTitle = offer.title ?? 'une offre';
    const offerDescription = (offer as any).description ?? null;
    const offerImages: string[] = (offer as any).images ?? [];
    const offerCover: string | null = Array.isArray(offerImages) && offerImages.length > 0 ? offerImages[0] : null;

    // Notifier les voyageurs ayant une réservation active avant suppression
    if (this.reservationService) {
      await this.reservationService.notifyTravelersOfferDeleted(offerId, offerTitle).catch(() => {});
    }

    // Notifier les collaborateurs et marquer les collabs comme supprimés (sans suppression physique)
    // pour que les collaborateurs puissent encore les voir avec le statut "offre supprimée"
    const collabs = await this.collabRepo.find({ where: { offer_id: offerId } });
    for (const c of collabs) {
      await this.notifService.create((c as any).invited_user_id, 'offer_deleted', {
        offer_id: offerId,
        collab_id: (c as any).id,
        offer_title: offerTitle,
        section: (c as any).section,
        message: `L'offre « ${offerTitle} » à laquelle vous collaboriez a été supprimée par son propriétaire.`,
      });
      // Supprimer le créneau agenda du collaborateur
      const collabLabel = `[Collab] ${offerTitle} — ${(c as any).section}`;
      const slots = await this.availRepo.find({ where: { guide_id: (c as any).invited_user_id, label: collabLabel } });
      if (slots.length) await this.availRepo.remove(slots);
      // Nettoyer les notifications de conflit et de changement d'horaire liées à cette offre
      await this.notifService.deleteForOffer((c as any).invited_user_id, 'offer_schedule_conflict', offerId).catch(() => {});
      await this.notifService.deleteForOffer((c as any).invited_user_id, 'offer_schedule_changed', offerId).catch(() => {});
      // Marquer le collab declined + offer_deleted pour conserver un historique visible
      const existingData = (c as any).contribution_data ?? {};
      await this.collabRepo.update(
        { id: (c as any).id },
        {
          status: 'declined',
          contribution_data: {
            ...existingData,
            offer_deleted: true,
            offer_title: offerTitle,
            offer_description: offerDescription,
            offer_cover: offerCover,
          },
        } as any,
      );
    }

    await this.repo.remove(offer);
    return { message: 'Offre supprimée.' };
  }

  async publishOffer(authorId: string, offerId: string): Promise<void> {
    // Un profil professionnel doit être validé par un administrateur avant diffusion.
    await this.profileApproval.assertApproved(authorId, 'publier une offre');
    const offer = await this.findOrFail(offerId);
    if (offer.author_id !== authorId) throw new ForbiddenException('Accès refusé.');
    if ((offer as any).status !== 'attente_publication') {
      throw new BadRequestException('L\'offre n\'est pas en attente de publication.');
    }
    const allCollabs = await this.collabRepo.find({ where: { offer_id: offerId } });
    const collabs = allCollabs.filter((c) => !((c as any).status === 'declined' && (c as any).contribution_data?.kicked === true));
    const collaborators = collabs.map((c) => ({
      id: (c as any).invited_user_id,
      name: (c as any).invited_user_name ?? (c as any).invited_user_id,
      section: (c as any).section,
    }));
    const details: Record<string, any> = { ...((offer as any).details ?? {}) };
    details.collaborators = collaborators;
    await this.repo.update({ id: offerId }, { status: 'approved', details } as any);
  }

  // ─── Sessions ────────────────────────────────────────────────────────────────

  async getSessionsForOffer(offerId: string): Promise<OfferSession[]> {
    return this.sessionRepo.find({
      where: { offer_id: offerId },
      order: { date: 'ASC', start_time: 'ASC' },
    });
  }

  async createSession(authorId: string, offerId: string, dto: any): Promise<OfferSession> {
    const offer = await this.findOrFail(offerId);
    if (offer.author_id !== authorId) throw new ForbiddenException('Accès refusé.');
    const session = this.sessionRepo.create({ offer_id: offerId, ...dto } as Partial<OfferSession>);
    return this.sessionRepo.save(session as OfferSession);
  }

  async updateSession(authorId: string, sessionId: string, dto: any): Promise<OfferSession> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Séance introuvable.');
    const offer = await this.findOrFail(session.offer_id);
    if (offer.author_id !== authorId) throw new ForbiddenException('Accès refusé.');
    Object.assign(session, dto);
    return this.sessionRepo.save(session);
  }

  async deleteSession(authorId: string, sessionId: string): Promise<{ message: string }> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Séance introuvable.');
    const offer = await this.findOrFail(session.offer_id);
    if (offer.author_id !== authorId) throw new ForbiddenException('Accès refusé.');
    await this.sessionRepo.remove(session);
    return { message: 'Séance supprimée.' };
  }

  // ─── Constraint validation ────────────────────────────────────────────────────

  private async validateAgainstActivity(dto: CreateOfferDto): Promise<void> {
    if (!dto.activity_id) return;

    const details = await this.activityDetailsModel.findOne({ activity_id: dto.activity_id });
    if (!details) return;

    const fields = details.fields as Record<string, any>;

    // Chercher la capacité max déclarée dans l'onboarding
    let maxCapacity: number | null = null;
    for (const key of CAPACITY_FIELD_NAMES) {
      const val = fields[key];
      if (val != null && !isNaN(Number(val))) {
        maxCapacity = Number(val);
        break;
      }
    }

    if (maxCapacity !== null) {
      if (dto.capacity && dto.capacity > maxCapacity) {
        throw new BadRequestException(
          `Capacité dépassée. Votre activité peut accueillir au maximum ${maxCapacity} personnes selon votre profil. Modifiez votre profil si cette capacité a changé.`,
        );
      }
      if (dto.max_group_size && dto.max_group_size > maxCapacity) {
        throw new BadRequestException(
          `Groupe maximum dépassé. Votre activité peut accueillir au maximum ${maxCapacity} personnes selon votre profil.`,
        );
      }
    }

    // Validation des niveaux : ceux de l'offre doivent être déclarés dans l'onboarding
    const niveauxOnboarding: string[] = fields['niveaux'] ?? fields['niveaux_acceptes'] ?? [];
    if (
      niveauxOnboarding.length > 0 &&
      dto.details &&
      Array.isArray((dto.details as any)['niveaux'])
    ) {
      const niveauxOffre: string[] = (dto.details as any)['niveaux'];
      const invalid = niveauxOffre.filter((n) => !niveauxOnboarding.includes(n));
      if (invalid.length > 0) {
        throw new BadRequestException(
          `Niveaux non déclarés : ${invalid.join(', ')}. Votre profil déclare uniquement : ${niveauxOnboarding.join(', ')}.`,
        );
      }
    }

    // Validation des langues guides
    const languesOnboarding: string[] = fields['langues_guides'] ?? fields['langues'] ?? [];
    if (
      languesOnboarding.length > 0 &&
      dto.details &&
      Array.isArray((dto.details as any)['langues'])
    ) {
      const languesOffre: string[] = (dto.details as any)['langues'];
      const invalid = languesOffre.filter((l) => !languesOnboarding.includes(l));
      if (invalid.length > 0) {
        throw new BadRequestException(
          `Langues non déclarées : ${invalid.join(', ')}. Votre profil déclare uniquement : ${languesOnboarding.join(', ')}.`,
        );
      }
    }
  }

  async findFollowingsOffers(followingIds: string[]): Promise<any[]> {
    if (followingIds.length === 0) return [];

    const directOffers = await this.repo.find({
      where: { author_id: In(followingIds), status: 'approved' },
      order: { created_at: 'DESC' },
    });

    const collabs = await this.collabRepo.find({
      where: { invited_user_id: In(followingIds), status: 'accepted' },
    });
    const collabOfferIds = [...new Set(collabs.map((c) => c.offer_id))];

    let collabOffers: Offer[] = [];
    if (collabOfferIds.length > 0) {
      collabOffers = await this.repo.find({
        where: { id: In(collabOfferIds), status: 'approved' },
        order: { created_at: 'DESC' },
      });
    }

    const seen = new Set<string>();
    const all: Offer[] = [];
    for (const offer of [...directOffers, ...collabOffers]) {
      if (!seen.has(offer.id)) { seen.add(offer.id); all.push(offer); }
    }

    return Promise.all(
      all.map(async (offer) => {
        let author_name: string | null = null;
        let author_photo: string | null = null;
        let org_name: string | null = null;
        let org_logo: string | null = null;

        if (offer.author_type === 'guide') {
          const guide = await this.guideRepo.findOne({ where: { user_id: offer.author_id } });
          author_name = guide?.full_name ?? null;
          author_photo = guide?.photo ?? null;
        } else {
          const provider = await this.providerRepo.findOne({ where: { user_id: offer.author_id } as any });
          author_name = (provider as any)?.full_name ?? null;
          author_photo = (provider as any)?.photo ?? null;
        }

        if (offer.organization_id) {
          const org = await this.orgRepo.findOne({ where: { id: offer.organization_id } as any });
          org_name = (org as any)?.name ?? null;
          org_logo = (org as any)?.logo ?? null;
        }

        const collabRows = await this.collabRepo.find({ where: { offer_id: offer.id, status: In(['accepted', 'completed']) } });
        const collaborators = await Promise.all(collabRows.map(async (c) => {
          let collab_photo: string | null = null;
          if ((c as any).invited_user_type === 'guide') {
            const g = await this.guideRepo.findOne({ where: { user_id: (c as any).invited_user_id } });
            collab_photo = g?.photo ?? null;
          } else {
            const org = await this.orgRepo.findOne({ where: { provider_id: (c as any).invited_user_id } as any });
            collab_photo = (org as any)?.logo ?? null;
            if (!collab_photo) {
              const prov = await this.providerRepo.findOne({ where: { user_id: (c as any).invited_user_id } as any });
              collab_photo = (prov as any)?.photo ?? null;
            }
          }
          return {
            name: c.invited_user_name,
            section: c.section,
            section_context: c.section_context ?? null,
            contribution_data: (c as any).contribution_data ?? null,
            photo: collab_photo,
          };
        }));

        return { ...offer, author_name, author_photo, org_name, org_logo, collaborators };
      }),
    );
  }

  async findAllApprovedForRecommendations(): Promise<any[]> {
    const offers = await this.repo.find({
      where: { status: 'approved' },
      order: { created_at: 'DESC' },
    });
    if (offers.length === 0) return [];

    const guideIds = [...new Set(offers.filter(o => o.author_type === 'guide').map(o => o.author_id))];
    const providerIds = [...new Set(offers.filter(o => o.author_type !== 'guide').map(o => o.author_id))];
    const orgIds = [...new Set(offers.filter(o => o.organization_id).map(o => o.organization_id!))];

    const [guides, providers, orgs] = await Promise.all([
      guideIds.length ? this.guideRepo.find({ where: { user_id: In(guideIds) } }) : Promise.resolve([]),
      providerIds.length ? this.providerRepo.find({ where: { user_id: In(providerIds) } as any }) : Promise.resolve([]),
      orgIds.length ? this.orgRepo.find({ where: { id: In(orgIds) } as any }) : Promise.resolve([]),
    ]);

    const guideMap = new Map(guides.map(g => [g.user_id, g]));
    const providerMap = new Map(providers.map((p: any) => [p.user_id, p]));
    const orgMap = new Map(orgs.map((o: any) => [o.id, o]));

    return offers.map(offer => {
      let author_name: string | null = null;
      let author_photo: string | null = null;
      let org_name: string | null = null;
      let org_logo: string | null = null;

      if (offer.author_type === 'guide') {
        const g = guideMap.get(offer.author_id);
        author_name = g?.full_name ?? null;
        author_photo = g?.photo ?? null;
      } else {
        const p = providerMap.get(offer.author_id);
        author_name = (p as any)?.full_name ?? null;
        author_photo = (p as any)?.photo ?? null;
      }

      if (offer.organization_id) {
        const org = orgMap.get(offer.organization_id);
        org_name = (org as any)?.name ?? null;
        org_logo = (org as any)?.logo ?? null;
      }

      return { ...offer, author_name, author_photo, org_name, org_logo };
    });
  }

  private async findOrFail(id: string): Promise<Offer> {
    const offer = await this.repo.findOne({ where: { id } });
    if (!offer) throw new NotFoundException('Offre introuvable.');
    return offer;
  }
}
