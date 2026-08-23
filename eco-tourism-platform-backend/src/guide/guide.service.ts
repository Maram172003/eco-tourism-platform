import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guide } from './entities/guide.entity';
import { Offer } from '../offer/entities/offer.entity';
import { GuideAvailabilitySlot } from './entities/guide-availability.entity';
import { OfferCollaboration } from '../offer/entities/offer-collaboration.entity';
import { Organization } from '../organization/entities/organization.entity';
import { Provider } from '../provider/entities/provider.entity';
import {
  CompleteGuideProfileDto,
  UpdateGuideSpecialtiesDto,
  UpdateGuideExperienceDto,
  UpdateGuideIdentityDto,
  UpdateGuideCertificationsDto,
  UpdateGuideServicesDto,
  CreateGuideOfferDto,
  SaveOfferDraftDto,
  SaveAvailabilitySlotDto,
} from './dto/guide.dto';
import { GuideMongoService } from './guide-mongo.service';
import { NotificationService } from '../notifications/notification.service';
import { SlotLike, overlappingDays, dispoEqual, toSlotType } from '../shared/slot.utils';
import { CircuitService } from '../circuit/circuit.service';
import { ProfileApprovalService } from '../common/services/profile-approval.service';

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class GuideService {
  constructor(
    @InjectRepository(Guide)
    private readonly repo: Repository<Guide>,
    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,
    @InjectRepository(GuideAvailabilitySlot)
    private readonly availRepo: Repository<GuideAvailabilitySlot>,
    @InjectRepository(OfferCollaboration)
    private readonly collabRepo: Repository<OfferCollaboration>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    private readonly mongoService: GuideMongoService,
    private readonly notifService: NotificationService,
    @Inject(forwardRef(() => CircuitService))
    private readonly circuitService: CircuitService,

    private readonly profileApproval: ProfileApprovalService,
  ) {}

  async getProfile(userId: string) {
    const [sqlProfile, mongoSkills, mongoEngagement] = await Promise.all([
      this.repo.findOne({ where: { user_id: userId } }),
      this.mongoService.getSkills(userId),
      this.mongoService.getEngagement(userId),
    ]);

    if (sqlProfile) {
      const freshCompletion = this.calculateCompletion(sqlProfile);
      if (freshCompletion !== sqlProfile.profile_completion) {
        sqlProfile.profile_completion = freshCompletion;
        await this.repo.save(sqlProfile);
      }
    }

    return {
      user_id: sqlProfile?.user_id,
      full_name: sqlProfile?.full_name,
      guide_type: sqlProfile?.guide_type,
      bio: sqlProfile?.bio,
      country: sqlProfile?.country,
      language: sqlProfile?.language,
      photo: sqlProfile?.photo,
      cover_photo: sqlProfile?.cover_photo,
      zone: sqlProfile?.zone,
      specialties: sqlProfile?.specialties,
      domaines: sqlProfile?.domaines,
      expertises: sqlProfile?.expertises,
      zones_couvertes: sqlProfile?.zones_couvertes,
      villes_couvertes: sqlProfile?.villes_couvertes,
      sites_maitrises: sqlProfile?.sites_maitrises,
      deplacement_possible: sqlProfile?.deplacement_possible,
      publics_accueillis: sqlProfile?.publics_accueillis,
      telephone: sqlProfile?.telephone,
      ville_residence: sqlProfile?.ville_residence,
      experience_pro: sqlProfile?.experience_pro,
      centres_interet: sqlProfile?.centres_interet,
      pourquoi_moi: sqlProfile?.pourquoi_moi,
      languages_spoken: sqlProfile?.languages_spoken,
      years_experience: sqlProfile?.years_experience,
      status: sqlProfile?.status,
      sustainability_score: sqlProfile?.sustainability_score,
      score_questionnaire: sqlProfile?.score_questionnaire ?? null,
      score_reservations: sqlProfile?.score_reservations ?? 0,
      score_feedbacks: sqlProfile?.score_feedbacks ?? 0,
      profile_completion: sqlProfile?.profile_completion,
      is_onboarded: sqlProfile?.is_onboarded,
      // MongoDB
      skills_activities: mongoSkills?.activities ?? [],
      skills_landscapes: mongoSkills?.landscapes ?? [],
      certifications: mongoSkills?.certifications ?? [],
      assurance: mongoSkills?.assurance ?? null,
      badges: mongoEngagement?.badges ?? [],
      feedback_received: mongoEngagement?.feedback_received ?? 0,
      reservations_handled: mongoEngagement?.reservations_handled ?? 0,
    };
  }

  async completeProfile(userId: string, dto: CompleteGuideProfileDto) {
    let profile = await this.repo.findOne({ where: { user_id: userId } });

    if (!profile) {
      profile = this.repo.create({ user_id: userId });
      await this.mongoService.initEngagement(userId);
    }

    profile.full_name = dto.full_name;
    profile.guide_type = dto.guide_type ?? null;
    profile.bio = dto.bio ?? null;
    profile.country = dto.country ?? null;
    profile.language = dto.language ?? null;
    profile.photo = dto.photo ?? null;
    profile.cover_photo = dto.cover_photo ?? null;
    profile.zone = dto.zone ?? null;
    profile.profile_completion = this.calculateCompletion(profile);

    return await this.repo.save(profile);
  }

  async updateSpecialties(userId: string, dto: UpdateGuideSpecialtiesDto) {
    const profile = await this.findOrFail(userId);
    profile.specialties = dto.specialties;
    profile.languages_spoken = dto.languages_spoken;
    profile.profile_completion = this.calculateCompletion(profile);

    const saved = await this.repo.save(profile);
    await this.mongoService.upsertSkills(userId, { activities: dto.specialties });

    return saved;
  }

  async updateExperience(userId: string, dto: UpdateGuideExperienceDto) {
    const profile = await this.findOrFail(userId);
    profile.years_experience = dto.years_experience;
    profile.profile_completion = this.calculateCompletion(profile);

    const saved = await this.repo.save(profile);
    await this.mongoService.upsertSkills(userId, {
      landscapes: dto.landscapes,
      certifications: dto.certifications.map((c) => ({ label: c.label, proof: c.proof ?? '' })),
    });

    return saved;
  }

  async markOnboarded(userId: string) {
    const profile = await this.findOrFail(userId);
    profile.is_onboarded = true;

    const saved = await this.repo.save(profile);
    await this.mongoService.addBadge(userId, 'Guide Éco-Certifié');

    return saved;
  }

  async updateQuestionnaireScore(userId: string, scoreQuestionnaire: number) {
    const profile = await this.findOrFail(userId);
    profile.score_questionnaire = scoreQuestionnaire;
    profile.sustainability_score = Math.round(
      scoreQuestionnaire * 0.40 + profile.score_reservations * 0.40 + profile.score_feedbacks * 0.20,
    );
    const saved = await this.repo.save(profile);
    await this.mongoService.updateScore(userId, profile.sustainability_score);
    if (profile.sustainability_score >= 80) {
      await this.mongoService.addBadge(userId, 'Guide Ambassadeur AFRATIM');
    }
    return saved;
  }

  private async findOrFail(userId: string) {
    const profile = await this.repo.findOne({ where: { user_id: userId } });
    if (!profile) {
      throw new NotFoundException("Profil introuvable. Complétez d'abord votre profil de base.");
    }
    return profile;
  }

  async getPublicProfile(guideId: string) {
    const profile = await this.repo.findOne({ where: { user_id: guideId } });
    if (!profile) throw new NotFoundException('Profil introuvable.');
    const offers = await this.offerRepo.find({
      where: { author_id: guideId, author_type: 'guide', status: 'approved' },
      order: { created_at: 'DESC' },
    });
    return {
      user_id: profile.user_id,
      full_name: profile.full_name,
      guide_type: profile.guide_type,
      bio: profile.bio,
      photo: profile.photo,
      cover_photo: profile.cover_photo,
      country: profile.country,
      zone: profile.zone,
      ville_residence: profile.ville_residence,
      specialties: profile.specialties,
      domaines: profile.domaines,
      expertises: profile.expertises,
      languages_spoken: profile.languages_spoken,
      years_experience: profile.years_experience,
      sustainability_score: profile.sustainability_score,
      zones_couvertes: profile.zones_couvertes,
      villes_couvertes: profile.villes_couvertes,
      sites_maitrises: profile.sites_maitrises,
      deplacement_possible: profile.deplacement_possible,
      publics_accueillis: profile.publics_accueillis,
      experience_pro: profile.experience_pro,
      centres_interet: profile.centres_interet,
      pourquoi_moi: profile.pourquoi_moi,
      offers,
    };
  }

  // ── Nouvelles méthodes onboarding 6 étapes ───────────────────────────────

  async updateIdentity(userId: string, dto: UpdateGuideIdentityDto) {
    let profile = await this.repo.findOne({ where: { user_id: userId } });
    if (!profile) {
      profile = this.repo.create({ user_id: userId });
      await this.mongoService.initEngagement(userId);
    }
    profile.full_name = dto.full_name;
    profile.bio = dto.bio ?? null;
    if (dto.photo !== undefined) profile.photo = dto.photo ?? null;
    if (dto.cover_photo !== undefined) profile.cover_photo = dto.cover_photo ?? null;
    profile.languages_spoken = dto.languages_spoken;
    if (dto.years_experience !== undefined) profile.years_experience = dto.years_experience;
    if (dto.telephone !== undefined) profile.telephone = dto.telephone ?? null;
    if (dto.ville_residence !== undefined) profile.ville_residence = dto.ville_residence ?? null;
    if (dto.experience_pro !== undefined) profile.experience_pro = dto.experience_pro ?? null;
    if (dto.centres_interet !== undefined) profile.centres_interet = dto.centres_interet ?? null;
    if (dto.pourquoi_moi !== undefined) profile.pourquoi_moi = dto.pourquoi_moi ?? null;
    profile.profile_completion = this.calculateCompletion(profile);
    return this.repo.save(profile);
  }

  async updateCertifications(userId: string, dto: UpdateGuideCertificationsDto) {
    const profile = await this.findOrFail(userId);
    if (dto.domaines !== undefined) profile.domaines = dto.domaines;
    if (dto.expertises !== undefined) profile.expertises = dto.expertises;
    profile.profile_completion = this.calculateCompletion(profile);
    const saved = await this.repo.save(profile);
    await this.mongoService.upsertSkills(userId, {
      certifications: dto.certifications.map((c) => ({ label: c.label, proof: c.proof ?? '' })),
      assurance: dto.assurance
        ? { name: dto.assurance.name ?? '', proof: dto.assurance.proof ?? '' }
        : null,
    });
    return saved;
  }

  async updateServices(userId: string, dto: UpdateGuideServicesDto) {
    const profile = await this.findOrFail(userId);
    if (dto.types_guidage !== undefined) profile.specialties = dto.types_guidage;
    profile.zones_couvertes = dto.zones_couvertes;
    if (dto.villes_couvertes !== undefined) profile.villes_couvertes = dto.villes_couvertes;
    if (dto.sites_maitrises !== undefined) profile.sites_maitrises = dto.sites_maitrises;
    if (dto.deplacement_possible !== undefined) profile.deplacement_possible = dto.deplacement_possible;
    profile.publics_accueillis = dto.publics_accueillis;
    profile.profile_completion = this.calculateCompletion(profile);
    return this.repo.save(profile);
  }

  // ── Offres Guide ─────────────────────────────────────────────────────────────

  async createOffer(userId: string, dto: CreateGuideOfferDto) {
    await this.profileApproval.assertApproved(userId, 'créer une offre');
    const profile = await this.findOrFail(userId);
    const errors: string[] = [];

    // Validation croisée — uniquement si le profil a déjà les données d'onboarding
    if (profile.specialties?.length && !profile.specialties.includes(dto.type_guidage_offre)) {
      errors.push(`⚠️ Ce type de guidage n'est pas déclaré dans votre profil. (valeur : ${dto.type_guidage_offre})`);
    }
    // zone_offre dérivée automatiquement — pas de validation contre le profil
    if (profile.languages_spoken?.length) {
      const invalidLangs = dto.langue_guidage.filter((l) => !profile.languages_spoken!.includes(l));
      if (invalidLangs.length > 0) {
        errors.push(`⚠️ Ces langues ne sont pas déclarées dans votre profil : ${invalidLangs.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    const tarif = (dto.details as any)?.tarification ?? {};
    const price =
      tarif.prix_par_personne
        ? Number(tarif.prix_par_personne)
        : tarif.prix_groupe
        ? Number(tarif.prix_groupe)
        : tarif.base_price
        ? Number(tarif.base_price)
        : null;

    const detailsAny = (dto.details ?? {}) as Record<string, any>;
    const fields = {
      title: dto.titre,
      description: dto.description_courte,
      duration: dto.duree,
      region: dto.zone_offre,
      meeting_point: dto.point_rendez_vous,
      meeting_lat: detailsAny.lieu_lat != null ? Number(detailsAny.lieu_lat) : null,
      meeting_lng: detailsAny.lieu_lng != null ? Number(detailsAny.lieu_lng) : null,
      max_group_size: dto.nb_participants_max,
      price,
      cancellation_policy: dto.politique_annulation,
      offer_type: 'guide' as const,
      offer_subtype: dto.type_guidage_offre,
      images: dto.photos,
      inclusions: dto.inclus_resume.join('||'),
      status: 'approved' as const,
      tags: dto.tags ?? null,
      details: {
        description_longue: dto.description_longue,
        type_prestation: dto.type_prestation,
        type_guidage_offre: dto.type_guidage_offre,
        lieu_precis: dto.lieu_precis,
        langue_guidage: dto.langue_guidage,
        heure_depart: dto.heure_depart,
        difficulte_physique: dto.difficulte_physique,
        restrictions_medicales: dto.restrictions_medicales,
        equipement_a_apporter: dto.equipement_a_apporter,
        public_cible_offre: dto.public_cible_offre,
        inclus_resume: dto.inclus_resume,
        type_disponibilite: dto.type_disponibilite,
        mode_tarification: dto.mode_tarification,
        type_confirmation: dto.type_confirmation,
        politique_annulation: dto.politique_annulation,
        ...(dto.details ?? {}),
      },
    };

    // Réutiliser un brouillon existant (par ID) ou un refus avec même titre
    // plutôt que de créer un doublon
    const draftId = (dto as any).draft_offer_id as string | undefined;
    let existing: import('../offer/entities/offer.entity').Offer | null = null;
    if (draftId) {
      existing = await this.offerRepo.findOne({ where: { id: draftId, author_id: userId } }) ?? null;
    }
    if (!existing) {
      existing = await this.offerRepo.findOne({
        where: { author_id: userId, author_type: 'guide', title: dto.titre, status: 'rejected' as any },
      }) ?? null;
    }

    const disponibilite = (dto.details as any)?.disponibilite as SlotLike | undefined;

    if (existing) {
      const oldTitle = (existing as any).title as string ?? '';
      Object.assign(existing, fields);
      const saved = await this.offerRepo.save(existing);
      if (disponibilite?.type) {
        const oldSlots = await this.availRepo.find({ where: { guide_id: userId, label: `[Offre] ${oldTitle}` } });
        if (oldSlots.length) await this.availRepo.remove(oldSlots);
        await this.availRepo.save(this.availRepo.create({
          guide_id: userId,
          type: toSlotType(disponibilite.type),
          dates: disponibilite.dates ?? null,
          start_date: disponibilite.start_date ?? null,
          end_date: disponibilite.end_date ?? null,
          days_of_week: disponibilite.days_of_week ?? null,
          label: `[Offre] ${dto.titre}`,
          time_slots: (disponibilite as any).time_slots ?? null,
        }));
      }
      return saved;
    }

    const offer = this.offerRepo.create({ author_id: userId, author_type: 'guide', ...fields });
    const saved = await this.offerRepo.save(offer);
    if (disponibilite?.type) {
      await this.availRepo.save(this.availRepo.create({
        guide_id: userId,
        type: toSlotType(disponibilite.type),
        dates: disponibilite.dates ?? null,
        start_date: disponibilite.start_date ?? null,
        end_date: disponibilite.end_date ?? null,
        days_of_week: disponibilite.days_of_week ?? null,
        label: `[Offre] ${dto.titre}`,
        time_slots: (disponibilite as any).time_slots ?? null,
      }));
    }
    return saved;
  }

  async getMyOffers(userId: string) {
    const offers = await this.offerRepo.find({
      where: { author_id: userId, author_type: 'guide' },
      order: { created_at: 'DESC' },
    });
    // Corriger en live les offres en attente_publication qui ont encore un collab non terminé
    for (const offer of offers) {
      if ((offer as any).status === 'attente_publication') {
        const collabs = await this.collabRepo.find({ where: { offer_id: offer.id } });
        const hasIncomplete = collabs.some(
          (c) => (c as any).status === 'pending' || (c as any).status === 'accepted',
        );
        if (hasIncomplete) {
          await this.offerRepo.update({ id: offer.id }, { status: 'draft' } as any);
          (offer as any).status = 'draft';
        }
      }
    }
    return offers;
  }

  async updateOffer(userId: string, offerId: string, dto: CreateGuideOfferDto) {
    await this.profileApproval.assertApproved(userId, 'modifier une offre');
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, author_id: userId, author_type: 'guide' },
    });
    if (!offer) throw new NotFoundException('Offre introuvable ou accès refusé');
    if ((offer as any).status === 'approved') {
      throw new BadRequestException('Cette offre est publiée et ne peut plus être modifiée. Supprimez-la si nécessaire.');
    }

    // ── Capturer l'état avant modification pour détecter les changements ──
    const oldTitle = (offer as any).title as string ?? '';
    const oldDisponibilite = ((offer as any).details as any)?.disponibilite as SlotLike | undefined;

    const tarif = (dto.details as any)?.tarification ?? {};
    const price =
      tarif.prix_par_personne
        ? Number(tarif.prix_par_personne)
        : tarif.prix_groupe
        ? Number(tarif.prix_groupe)
        : tarif.base_price
        ? Number(tarif.base_price)
        : null;

    const detailsAny = (dto.details ?? {}) as Record<string, any>;

    // Préserver les données de collaboration ajoutées par saveContribution
    const existingDetails = ((offer as any).details ?? {}) as Record<string, any>;
    const COLLAB_KEYS = ['restauration_types', 'restauration_svcs', 'hebergement_types', 'hebergement_svcs', 'collaborators'];
    const preservedCollab: Record<string, any> = {};
    for (const key of COLLAB_KEYS) {
      if (existingDetails[key] !== undefined) preservedCollab[key] = existingDetails[key];
    }

    const newDetails = {
      description_longue: dto.description_longue,
      type_prestation: dto.type_prestation,
      type_guidage_offre: dto.type_guidage_offre,
      lieu_precis: dto.lieu_precis,
      langue_guidage: dto.langue_guidage,
      heure_depart: dto.heure_depart,
      difficulte_physique: dto.difficulte_physique,
      restrictions_medicales: dto.restrictions_medicales,
      equipement_a_apporter: dto.equipement_a_apporter,
      public_cible_offre: dto.public_cible_offre,
      inclus_resume: dto.inclus_resume,
      type_disponibilite: dto.type_disponibilite,
      mode_tarification: dto.mode_tarification,
      type_confirmation: dto.type_confirmation,
      politique_annulation: dto.politique_annulation,
      ...(dto.details ?? {}),
      ...preservedCollab, // les données collab ont la priorité et ne sont jamais écrasées
    };

    // Lire la nouvelle disponibilité directement depuis dto.details (avant tout merge)
    const newDisponibilite = (dto.details as any)?.disponibilite as SlotLike | undefined;
    const newTitle = dto.titre ?? oldTitle;
    const titleChanged = oldTitle !== newTitle;
    const dispoChanged = !dispoEqual(oldDisponibilite, newDisponibilite);
    console.log('[updateOffer] dispoChanged=', dispoChanged, 'titleChanged=', titleChanged,
      'old=', JSON.stringify(oldDisponibilite), 'new=', JSON.stringify(newDisponibilite));

    // Déterminer le nouveau statut si _finalize est true
    let newStatus: string | undefined;
    if ((dto as any)._finalize) {
      const currentStatus = (offer as any).status as string;
      // Ne finaliser que les offres en brouillon ou rejetées :
      // - attente_publication : nécessite un clic "Publier" explicite, ne pas auto-approuver
      // - approved : déjà publiée, conserver ce statut
      if (currentStatus === 'draft' || currentStatus === 'rejected') {
        const collabs = await this.collabRepo.find({ where: { offer_id: offerId } });
        const activeCollabsForFinalize = collabs.filter((c) => (c as any).status !== 'declined');
        const hasPendingCollabs = activeCollabsForFinalize.some(
          (c) => (c as any).status === 'pending' || (c as any).status === 'accepted',
        );
        // Si des collaborateurs actifs n'ont pas encore terminé, rester en draft
        // Sinon (tous terminés, refusés, ou retirés), passer en attente_publication
        newStatus = hasPendingCollabs ? 'draft' : 'attente_publication';
      }
      // attente_publication ou approved → pas de changement de statut via _finalize
    }

    Object.assign(offer, {
      title: dto.titre,
      description: dto.description_courte,
      duration: dto.duree,
      region: dto.zone_offre,
      meeting_point: dto.point_rendez_vous,
      meeting_lat: detailsAny.lieu_lat != null ? Number(detailsAny.lieu_lat) : null,
      meeting_lng: detailsAny.lieu_lng != null ? Number(detailsAny.lieu_lng) : null,
      max_group_size: dto.nb_participants_max,
      price,
      cancellation_policy: dto.politique_annulation,
      offer_subtype: dto.type_guidage_offre,
      images: dto.photos,
      inclusions: dto.inclus_resume.join('||'),
      details: newDetails,
      tags: dto.tags ?? null,
      ...(newStatus ? { status: newStatus } : {}),
    });
    const savedOffer = await this.offerRepo.save(offer);

    // ── Synchroniser les créneaux agenda si disponibilité ou titre a changé ──
    if ((dispoChanged || titleChanged) && newDisponibilite?.type) {
      // Mettre à jour le créneau [Offre] du propriétaire s'il existe
      const oldOwnerLabel = `[Offre] ${oldTitle}`;
      const newOwnerLabel = `[Offre] ${newTitle}`;
      const ownerSlots = await this.availRepo.find({ where: { guide_id: userId, label: oldOwnerLabel } });
      if (ownerSlots.length) await this.availRepo.remove(ownerSlots);
      await this.availRepo.save(this.availRepo.create({
        guide_id: userId,
        type: toSlotType(newDisponibilite.type),
        dates: newDisponibilite.dates ?? null,
        start_date: newDisponibilite.start_date ?? null,
        end_date: newDisponibilite.end_date ?? null,
        days_of_week: newDisponibilite.days_of_week ?? null,
        label: newOwnerLabel,
        time_slots: (newDisponibilite as any).time_slots ?? null,
      }));

      // Mettre à jour les créneaux [Collab] de chaque collaborateur non-refusé
      const collabs = await this.collabRepo.find({ where: { offer_id: offerId } });
      const activeCollabs = collabs.filter((c) => (c as any).status !== 'declined');

      for (const c of activeCollabs) {
        const collabStatus = (c as any).status as string;
        const oldCollabLabel = `[Collab] ${oldTitle} — ${(c as any).section}`;
        const newCollabLabel = `[Collab] ${newTitle} — ${(c as any).section}`;
        const collabUserId = (c as any).invited_user_id as string;
        const hasDoneSlot = ['accepted', 'completed'].includes(collabStatus);

        if (dispoChanged) {
          // Vérifier les conflits sur les créneaux AUTRES que l'ancien [Collab]
          const allSlots = await this.availRepo.find({ where: { guide_id: collabUserId } });
          const oldSlots = allSlots.filter((s) => (s as any).label === oldCollabLabel);
          const otherSlots = allSlots.filter((s) => (s as any).label !== oldCollabLabel);
          let conflictInfo: { label: string; days: string[] } | null = null;
          for (const slot of otherSlots) {
            const days = overlappingDays(newDisponibilite, slot as SlotLike);
            if (days.length > 0) {
              conflictInfo = { label: (slot as any).label ?? slot.type, days };
              break;
            }
          }

          if (conflictInfo) {
            // Conflit → mettre QUAND MÊME à jour le créneau [Collab] aux nouvelles dates
            // (le collaborateur doit voir les deux créneaux côte à côte pour résoudre lui-même)
            if (hasDoneSlot) {
              if (oldSlots.length) await this.availRepo.remove(oldSlots);
              await this.availRepo.save(this.availRepo.create({
                guide_id: collabUserId,
                type: toSlotType(newDisponibilite.type),
                dates: newDisponibilite.dates ?? null,
                start_date: newDisponibilite.start_date ?? null,
                end_date: newDisponibilite.end_date ?? null,
                days_of_week: newDisponibilite.days_of_week ?? null,
                label: newCollabLabel,
                time_slots: (newDisponibilite as any).time_slots ?? null,
              }));
            }
            // Puis notifier le conflit (slot personnel qui chevauche les nouvelles dates)
            await this.notifService.replaceForOffer(collabUserId, 'offer_schedule_conflict', offerId, {
              offer_id: offerId,
              offer_title: newTitle,
              section: (c as any).section,
              conflicting_slot: conflictInfo.label,
              conflict_days: conflictInfo.days,
              message: `Les horaires de l'offre « ${newTitle} » ont changé et créent un conflit avec votre agenda (${conflictInfo.label}). Réglez votre agenda pour maintenir votre collaboration.`,
            });
            await this.notifService.deleteForOffer(collabUserId, 'offer_schedule_changed', offerId).catch(() => {});
          } else if (hasDoneSlot) {
            // Pas de conflit et collaborateur engagé → remplacer le créneau et notifier
            if (oldSlots.length) await this.availRepo.remove(oldSlots);
            await this.availRepo.save(this.availRepo.create({
              guide_id: collabUserId,
              type: toSlotType(newDisponibilite.type),
              dates: newDisponibilite.dates ?? null,
              start_date: newDisponibilite.start_date ?? null,
              end_date: newDisponibilite.end_date ?? null,
              days_of_week: newDisponibilite.days_of_week ?? null,
              label: newCollabLabel,
              time_slots: (newDisponibilite as any).time_slots ?? null,
            }));
            // Plus de conflit → supprimer les anciennes notifs de conflit
            await this.notifService.deleteForOffer(collabUserId, 'offer_schedule_conflict', offerId).catch(() => {});
            await this.notifService.create(collabUserId, 'offer_schedule_changed', {
              offer_id: offerId,
              offer_title: newTitle,
              section: (c as any).section,
              message: `Les horaires de l'offre « ${newTitle} » ont été mis à jour. Votre agenda a été synchronisé automatiquement.`,
            });
          }
          // Les collabs pending n'ont pas encore de créneau → pas de notification de changement d'horaire
        } else if (titleChanged && hasDoneSlot) {
          // Seul le titre a changé → renommer le label du créneau existant
          const oldSlots = await this.availRepo.find({ where: { guide_id: collabUserId, label: oldCollabLabel } });
          if (oldSlots.length) {
            await this.availRepo.save(this.availRepo.create({
              guide_id: collabUserId,
              type: (oldSlots[0] as any).type,
              dates: (oldSlots[0] as any).dates ?? null,
              start_date: (oldSlots[0] as any).start_date ?? null,
              end_date: (oldSlots[0] as any).end_date ?? null,
              days_of_week: (oldSlots[0] as any).days_of_week ?? null,
              label: newCollabLabel,
              time_slots: (oldSlots[0] as any).time_slots ?? null,
            }));
          }
        }
      }
    }

    return savedOffer;
  }

  /** Met à jour uniquement la disponibilité d'une offre guide (depuis l'agenda).
   *  Synchronise le créneau [Offre] du propriétaire et les créneaux [Collab] des collaborateurs.
   */
  async updateOfferAvailability(
    userId: string,
    offerId: string,
    disponibilite: SlotLike & { time_slots?: any },
  ): Promise<{ message: string }> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, author_id: userId, author_type: 'guide' },
    });
    if (!offer) throw new NotFoundException('Offre introuvable ou accès refusé');

    const offerTitle = (offer as any).title as string ?? '';
    const existingDetails = ((offer as any).details ?? {}) as Record<string, any>;
    const oldDisponibilite = existingDetails?.disponibilite as SlotLike | undefined;

    const dispoChanged = !dispoEqual(oldDisponibilite, disponibilite as SlotLike);
    if (!dispoChanged) return { message: 'Aucun changement de disponibilité.' };

    // ── Mettre à jour le créneau [Offre] du propriétaire ──
    const ownerLabel = `[Offre] ${offerTitle}`;
    const ownerSlots = await this.availRepo.find({ where: { guide_id: userId, label: ownerLabel } });
    if (ownerSlots.length) await this.availRepo.remove(ownerSlots);
    await this.availRepo.save(this.availRepo.create({
      guide_id: userId,
      type: toSlotType(disponibilite.type),
      dates: disponibilite.dates ?? null,
      start_date: disponibilite.start_date ?? null,
      end_date: disponibilite.end_date ?? null,
      days_of_week: disponibilite.days_of_week ?? null,
      label: ownerLabel,
      time_slots: (disponibilite as any).time_slots ?? null,
    }));

    // ── Synchroniser les créneaux [Collab] des collaborateurs actifs ──
    const collabs = await this.collabRepo.find({ where: { offer_id: offerId } });
    const activeCollabs = collabs.filter((c) => (c as any).status !== 'declined');

    for (const c of activeCollabs) {
      const collabStatus = (c as any).status as string;
      const collabLabel = `[Collab] ${offerTitle} — ${(c as any).section}`;
      const collabUserId = (c as any).invited_user_id as string;
      const hasDoneSlot = ['accepted', 'completed'].includes(collabStatus);

      const allSlots = await this.availRepo.find({ where: { guide_id: collabUserId } });
      const oldCollabSlots = allSlots.filter((s) => (s as any).label === collabLabel);
      const otherSlots = allSlots.filter((s) => (s as any).label !== collabLabel);

      let conflictInfo: { label: string; days: string[] } | null = null;
      for (const slot of otherSlots) {
        const days = overlappingDays(disponibilite as SlotLike, slot as SlotLike);
        if (days.length > 0) {
          conflictInfo = { label: (slot as any).label ?? slot.type, days };
          break;
        }
      }

      if (hasDoneSlot) {
        if (oldCollabSlots.length) await this.availRepo.remove(oldCollabSlots);
        await this.availRepo.save(this.availRepo.create({
          guide_id: collabUserId,
          type: toSlotType(disponibilite.type),
          dates: disponibilite.dates ?? null,
          start_date: disponibilite.start_date ?? null,
          end_date: disponibilite.end_date ?? null,
          days_of_week: disponibilite.days_of_week ?? null,
          label: collabLabel,
          time_slots: (disponibilite as any).time_slots ?? null,
        }));
      }

      if (conflictInfo) {
        await this.notifService.replaceForOffer(collabUserId, 'offer_schedule_conflict', offerId, {
          offer_id: offerId, offer_title: offerTitle, section: (c as any).section,
          conflicting_slot: conflictInfo.label, conflict_days: conflictInfo.days,
          message: `Les horaires de l'offre « ${offerTitle} » ont changé et créent un conflit avec votre agenda (${conflictInfo.label}).`,
        });
        await this.notifService.deleteForOffer(collabUserId, 'offer_schedule_changed', offerId).catch(() => {});
      } else if (hasDoneSlot) {
        await this.notifService.deleteForOffer(collabUserId, 'offer_schedule_conflict', offerId).catch(() => {});
        await this.notifService.create(collabUserId, 'offer_schedule_changed', {
          offer_id: offerId, offer_title: offerTitle, section: (c as any).section,
          message: `Les horaires de l'offre « ${offerTitle} » ont été mis à jour. Votre agenda a été synchronisé.`,
        });
      } else {
        await this.notifService.create(collabUserId, 'offer_schedule_changed', {
          offer_id: offerId, offer_title: offerTitle, section: (c as any).section,
          message: `Les horaires de l'offre « ${offerTitle} » à laquelle vous êtes invité ont été mis à jour.`,
        });
      }
    }

    // ── Sauvegarder la nouvelle disponibilité dans les détails de l'offre ──
    (offer as any).details = { ...existingDetails, disponibilite };
    await this.offerRepo.save(offer);

    return { message: 'Disponibilité mise à jour.' };
  }

  async deleteOffer(userId: string, offerId: string): Promise<{ message: string }> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, author_id: userId, author_type: 'guide' },
    });
    if (!offer) throw new NotFoundException('Offre introuvable ou accès refusé');

    // Notifier et marquer les collaborations comme supprimées (on les garde pour affichage côté collab)
    const collabs = await this.collabRepo.find({ where: { offer_id: offerId } });
    const offerTitle = (offer as any).title ?? 'une offre';
    const offerDescription = (offer as any).description ?? null;
    const offerImages: string[] = (offer as any).images ?? [];
    const offerCover: string | null = Array.isArray(offerImages) && offerImages.length > 0 ? offerImages[0] : null;
    await Promise.all(
      collabs.map(async (c) => {
        await this.notifService.create((c as any).invited_user_id, 'offer_deleted', {
          offer_id: offerId,
          collab_id: (c as any).id,
          offer_title: offerTitle,
          section: (c as any).section,
          message: `L'offre « ${offerTitle} » à laquelle vous collaboriez a été supprimée par son propriétaire.`,
        });
        // Marquer le collab comme "décliné + offre supprimée" pour conserver un historique visible
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
      }),
    );

    // Supprimer le créneau agenda du propriétaire ([Offre] …)
    if (offer.title) {
      const ownerSlots = await this.availRepo.find({
        where: { guide_id: userId, label: `[Offre] ${offer.title}` },
      });
      if (ownerSlots.length) await this.availRepo.remove(ownerSlots);

      // Supprimer les créneaux agenda de chaque collaborateur ([Collab] … — section)
      for (const c of collabs) {
        const collabLabel = `[Collab] ${offer.title} — ${(c as any).section}`;
        const collabSlots = await this.availRepo.find({
          where: { guide_id: (c as any).invited_user_id, label: collabLabel },
        });
        if (collabSlots.length) await this.availRepo.remove(collabSlots);
      }
    }

    await this.offerRepo.remove(offer);
    return { message: 'Offre supprimée' };
  }

  // ── Disponibilités ───────────────────────────────────────────────────────────

  async getAvailability(guideId: string) {
    // Nettoyer en arrière-plan les notifications de conflit qui ne sont plus valides
    this.syncCollabConflictNotifications(guideId).catch(() => {});
    this.circuitService.syncCircuitConflictNotifications(guideId).catch(() => {});
    return this.availRepo.find({
      where: { guide_id: guideId },
      order: { created_at: 'ASC' },
    });
  }

  async saveAvailabilitySlot(guideId: string, dto: SaveAvailabilitySlotDto) {
    const slot = this.availRepo.create({
      guide_id: guideId,
      type: dto.type,
      dates: dto.dates?.length ? dto.dates : null,
      start_date: dto.start_date ?? null,
      end_date: dto.end_date ?? null,
      days_of_week: dto.days_of_week?.length ? dto.days_of_week : null,
      label: dto.label ?? null,
      time_slots: dto.time_slots ?? null,
    });
    const saved = await this.availRepo.save(slot);
    // Re-vérifier les conflits collab après tout changement de créneau personnel
    await this.syncCollabConflictNotifications(guideId).catch(() => {});
    await this.circuitService.syncCircuitConflictNotifications(guideId).catch(() => {});
    return saved;
  }

  async deleteAvailabilitySlot(guideId: string, slotId: string) {
    const slot = await this.availRepo.findOne({ where: { id: slotId, guide_id: guideId } });
    if (!slot) throw new NotFoundException('Créneau introuvable.');
    await this.availRepo.remove(slot);
    // Re-vérifier les conflits collab après suppression d'un créneau personnel
    await this.syncCollabConflictNotifications(guideId).catch(() => {});
    await this.circuitService.syncCircuitConflictNotifications(guideId).catch(() => {});
    return { deleted: true };
  }

  /** Re-évalue toutes les notifications de conflit d'agenda du collaborateur.
   *  Si un conflit précédemment signalé n'existe plus (horaires non chevauchants),
   *  la notification est supprimée et remplacée par une notif de changement neutre.
   */
  private async syncCollabConflictNotifications(userId: string): Promise<void> {
    const collabs = await this.collabRepo.find({ where: { invited_user_id: userId } });
    // Traiter tous les collabs non-déclinés : les accepted/completed pour la création de slots,
    // mais aussi les pending pour le nettoyage des vieilles notifications de conflit
    const activeCollabs = collabs.filter((c) => (c as any).status !== 'declined');

    // Nettoyer les notifications orphelines des collabs déclinés suite à suppression de l'offre
    const deletedOfferCollabs = collabs.filter(
      (c) => (c as any).status === 'declined' && (c as any).contribution_data?.offer_deleted === true,
    );
    for (const c of deletedOfferCollabs) {
      const offerId = (c as any).offer_id as string;
      await this.notifService.deleteForOffer(userId, 'offer_schedule_conflict', offerId).catch(() => {});
      await this.notifService.deleteForOffer(userId, 'offer_schedule_changed', offerId).catch(() => {});
    }

    if (!activeCollabs.length) return;

    const currentSlots = await this.availRepo.find({ where: { guide_id: userId } });
    // Seuls les créneaux personnels (pas [Collab] ni [Offre])
    const personalSlots = currentSlots.filter(
      (s) => !((s as any).label?.startsWith('[Collab]') || (s as any).label?.startsWith('[Offre]')),
    );

    for (const c of activeCollabs) {
      const offerId = (c as any).offer_id as string;
      const offer = await this.offerRepo.findOne({ where: { id: offerId } });
      if (!offer) {
        // Offre introuvable (supprimée sans mise à jour du statut du collab) → nettoyer les notifications
        await this.notifService.deleteForOffer(userId, 'offer_schedule_conflict', offerId).catch(() => {});
        await this.notifService.deleteForOffer(userId, 'offer_schedule_changed', offerId).catch(() => {});
        continue;
      }
      const disponibilite = ((offer as any).details as any)?.disponibilite as SlotLike | undefined;
      if (!disponibilite?.type) continue;

      const collabStatus = (c as any).status as string;
      const isDone = collabStatus === 'accepted' || collabStatus === 'completed';
      const offerTitle = (offer as any).title ?? '';
      const collabLabel = `[Collab] ${offerTitle} — ${(c as any).section}`;

      // S'assurer que le slot collab existe pour les collabs ayant accepté
      // (peut être absent si l'acceptation s'est faite sans disponibilité définie)
      if (isDone) {
        const collabSlotExists = currentSlots.some((s) => (s as any).label === collabLabel);
        if (!collabSlotExists) {
          const newSlot = await this.availRepo.save(this.availRepo.create({
            guide_id: userId,
            type: toSlotType(disponibilite.type),
            dates: disponibilite.dates ?? null,
            start_date: disponibilite.start_date ?? null,
            end_date: disponibilite.end_date ?? null,
            days_of_week: disponibilite.days_of_week ?? null,
            label: collabLabel,
            time_slots: (disponibilite as any).time_slots ?? null,
          }));
          currentSlots.push(newSlot as any);
        }
      }

      let hasConflict = false;
      for (const ps of personalSlots) {
        if (overlappingDays(disponibilite, ps as SlotLike).length > 0) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        // Plus de conflit → supprimer la notification de conflit (pour pending ET accepted)
        await this.notifService.deleteForOffer(userId, 'offer_schedule_conflict', offerId).catch(() => {});
      }
    }
  }

  // ── Brouillon & Collaborations ─────────────────────────────────────────────

  async saveOfferDraft(userId: string, dto: SaveOfferDraftDto): Promise<Offer> {
    await this.profileApproval.assertApproved(userId, 'créer une offre');
    const profile = await this.findOrFail(userId);
    const tarifDraft = (dto.details as any)?.tarification ?? {};
    const priceDraft =
      tarifDraft.prix_par_personne ? Number(tarifDraft.prix_par_personne)
      : tarifDraft.prix_groupe     ? Number(tarifDraft.prix_groupe)
      : tarifDraft.base_price      ? Number(tarifDraft.base_price)
      : null;

    const offer = this.offerRepo.create({
      author_id: userId,
      author_type: 'guide',
      title: dto.titre || 'Brouillon',
      description: dto.description_courte ?? null,
      duration: dto.duree ?? null,
      region: dto.zone_offre ?? null,
      meeting_point: dto.point_rendez_vous ?? null,
      max_group_size: dto.nb_participants_max ?? null,
      price: priceDraft,
      offer_type: 'guide',
      offer_subtype: dto.type_guidage_offre ?? null,
      images: dto.photos ?? [],
      status: 'draft',
      details: {
        description_longue: dto.description_longue,
        type_prestation: dto.type_prestation,
        type_guidage_offre: dto.type_guidage_offre,
        lieu_precis: dto.lieu_precis,
        langue_guidage: dto.langue_guidage,
        heure_depart: dto.heure_depart,
        restrictions_medicales: dto.restrictions_medicales,
        equipement_a_apporter: dto.equipement_a_apporter,
        public_cible_offre: dto.public_cible_offre,
        inclus_resume: dto.inclus_resume,
        type_disponibilite: dto.type_disponibilite,
        mode_tarification: dto.mode_tarification,
        type_confirmation: dto.type_confirmation,
        politique_annulation: dto.politique_annulation,
        ...(dto.details ?? {}),
      },
    });
    const COLLAB_KEYS = ['restauration_types', 'restauration_svcs', 'hebergement_types', 'hebergement_svcs', 'collaborators'];

    function mergePreservingCollab(existing: any, newOffer: any) {
      const existingDetails = (existing.details ?? {}) as Record<string, any>;
      const preserved: Record<string, any> = {};
      for (const key of COLLAB_KEYS) {
        if (existingDetails[key] !== undefined) preserved[key] = existingDetails[key];
      }
      Object.assign(existing, newOffer);
      existing.details = { ...existing.details, ...preserved };
    }

    // Conserver le même ID si l'offre brouillon existe déjà
    if ((dto as any).draft_offer_id) {
      const existing = await this.offerRepo.findOne({ where: { id: (dto as any).draft_offer_id, author_id: userId } });
      if (existing) {
        mergePreservingCollab(existing, offer);
        return this.offerRepo.save(existing);
      }
    }
    // Supprimer un éventuel brouillon précédent pour la même session (évite les doublons)
    const prev = await this.offerRepo.findOne({ where: { author_id: userId, author_type: 'guide', status: 'draft', title: offer.title || 'Brouillon' } });
    if (prev) {
      mergePreservingCollab(prev, offer);
      return this.offerRepo.save(prev);
    }
    return this.offerRepo.save(offer);
  }

  /** Vérifie si la nouvelle disponibilité crée des conflits dans l'agenda des collaborateurs acceptés */
  async checkCollabConflicts(
    ownerId: string,
    offerId: string,
    disponibilite: SlotLike,
  ): Promise<{ userId: string; userName: string; section: string; conflictSlot: string; conflictDays: string[] }[]> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId, author_id: ownerId } });
    if (!offer) throw new NotFoundException('Offre introuvable');

    const collabs = await this.collabRepo.find({ where: { offer_id: offerId } });
    const activeCollabs = collabs.filter((c) => (c as any).status !== 'declined');

    const result: { userId: string; userName: string; section: string; conflictSlot: string; conflictDays: string[]; conflictTimeSlots: any }[] = [];

    for (const c of activeCollabs) {
      const collabUserId = (c as any).invited_user_id as string;
      // Exclure l'ancien créneau [Collab] de cette offre (il sera de toute façon remplacé)
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
          break; // un conflit par collaborateur suffit
        }
      }
    }

    return result;
  }

  async inviteCollaborator(
    guideId: string,
    offerId: string,
    dto: { invited_user_id: string; invited_user_type: string; invited_user_name: string; section: string; message?: string; section_context?: Record<string, any> | null },
  ): Promise<OfferCollaboration> {
    // Un profil non validé ne doit pas pouvoir solliciter des collaborateurs.
    await this.profileApproval.assertApproved(guideId, 'inviter un collaborateur');
    const offer = await this.offerRepo.findOne({ where: { id: offerId, author_id: guideId } });
    if (!offer) throw new NotFoundException('Offre introuvable ou non autorisée');
    // Éviter les vrais doublons (pending/accepted/completed) mais permettre la réinvitation après refus
    const existing = await this.collabRepo.findOne({ where: { offer_id: offerId, invited_user_id: dto.invited_user_id, section: dto.section } });
    if (existing) {
      const st = (existing as any).status as string;
      if (st !== 'declined') return existing; // déjà en cours — ne pas dupliquer
      // Réinvitation après refus : remettre à pending, mettre à jour le contexte
      (existing as any).status = 'pending';
      (existing as any).message = dto.message ?? null;
      (existing as any).contribution_data = null;
      (existing as any).section_context = dto.section_context ?? null;
      await this.collabRepo.save(existing);
    }

    const collab = existing ?? this.collabRepo.create({
      offer_id: offerId,
      guide_id: guideId,
      invited_user_id: dto.invited_user_id,
      invited_user_type: dto.invited_user_type,
      invited_user_name: dto.invited_user_name,
      section: dto.section,
      message: dto.message ?? null,
      status: 'pending',
      section_context: dto.section_context ?? null,
    });
    const saved = existing ?? await this.collabRepo.save(collab);

    // Quand le guide délègue la section hébergement à un collaborateur,
    // vider hebergement_svcs dans l'offre pour que le collaborateur parte d'une feuille blanche.
    if (dto.section === 'hebergement') {
      const details = (offer.details ?? {}) as Record<string, unknown>;
      offer.details = { ...details, hebergement_svcs: {} };
      await this.offerRepo.save(offer);
    }

    const guideProfile = await this.repo.findOne({ where: { user_id: guideId } });
    let inviterName = guideProfile?.full_name ?? null;
    if (!inviterName) {
      const providerProfile = await this.providerRepo.findOne({ where: { user_id: guideId } });
      inviterName = providerProfile?.full_name ?? 'Un organisateur';
    }
    await this.notifService.create(dto.invited_user_id, 'collaboration_invite', {
      offer_id: offerId,
      offer_title: offer.title ?? offer.id,
      inviter_name: inviterName,
      section: dto.section,
      message: dto.message ?? null,
      collab_id: saved.id,
    });

    return saved;
  }

  async respondToCollaboration(
    userId: string,
    collabId: string,
    status: 'accepted' | 'declined',
  ): Promise<OfferCollaboration | any> {
    const collab = await this.collabRepo.findOne({ where: { id: collabId, invited_user_id: userId } });
    if (!collab) {
      return this.circuitService.respondToCircuitCollab(userId, collabId, status);
    }

    const offer = await this.offerRepo.findOne({ where: { id: collab.offer_id } });
    const offerTitle = (offer as any)?.title ?? 'votre offre';

    // ── Vérification de conflit d'agenda si le guide accepte ──────────────
    if (status === 'accepted' && offer) {
      const disponibilite = ((offer as any).details as any)?.disponibilite as SlotLike | undefined;
      if (disponibilite?.type) {
        const existingSlots = await this.availRepo.find({ where: { guide_id: userId } });
        for (const existing of existingSlots) {
          const days = overlappingDays(disponibilite, existing as SlotLike);
          if (days.length > 0) {
            throw new ConflictException({
              message: 'Conflit d\'agenda détecté',
              conflictingSlot: { label: (existing as any).label ?? existing.type, days },
            });
          }
        }
        // Aucun conflit → ajouter automatiquement le créneau à l'agenda
        await this.availRepo.save(
          this.availRepo.create({
            guide_id: userId,
            type: toSlotType(disponibilite.type),
            dates: disponibilite.dates ?? null,
            start_date: disponibilite.start_date ?? null,
            end_date: disponibilite.end_date ?? null,
            days_of_week: disponibilite.days_of_week ?? null,
            label: `[Collab] ${offerTitle} — ${(collab as any).section}`,
            time_slots: (disponibilite as any).time_slots ?? null,
          }),
        );
      }
    }

    collab.status = status;
    const saved = await this.collabRepo.save(collab);
    const type = status === 'accepted' ? 'collab_accepted' : 'collab_declined';
    const message = status === 'accepted'
      ? `${collab.invited_user_name} a accepté votre invitation pour la section ${collab.section} de "${offerTitle}".`
      : `${collab.invited_user_name} a refusé votre invitation pour la section ${collab.section} de "${offerTitle}".`;

    await this.notifService.create(collab.guide_id, type, {
      collab_id: collab.id,
      offer_id: collab.offer_id,
      offer_title: offerTitle,
      section: collab.section,
      invited_user_name: collab.invited_user_name,
      message,
    });

    return saved;
  }

  async findPublicOfferDetail(offerId: string): Promise<any> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Offre introuvable');
    const allCollabs = await this.collabRepo.find({ where: { offer_id: offerId } });
    const activeCollabs = allCollabs.filter((c) => !((c as any).status === 'declined' && (c as any).contribution_data?.kicked === true));
    if (activeCollabs.length > 0) {
      const collaborators = activeCollabs.map((c) => ({
        id: (c as any).invited_user_id,
        name: (c as any).invited_user_name ?? (c as any).invited_user_id,
        section: (c as any).section,
        status: (c as any).status,
      }));
      const existing = ((offer as any).details ?? {}) as Record<string, any>;
      (offer as any).details = { ...existing, collaborators };
    }
    return offer;
  }

  async getOfferForCollaborator(userId: string, offerId: string): Promise<Offer> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Offre introuvable');
    const isAuthor = offer.author_id === userId;
    const isInvited = await this.collabRepo.findOne({ where: { offer_id: offerId, invited_user_id: userId } });
    if (!isAuthor && !isInvited) throw new NotFoundException('Accès non autorisé');

    // Enrichir les details avec les collaborateurs réels (depuis la table collab, sans les kicked)
    const allCollabsForDetail = await this.collabRepo.find({ where: { offer_id: offerId } });
    const collabs = allCollabsForDetail.filter((c) => !((c as any).status === 'declined' && (c as any).contribution_data?.kicked === true));
    if (collabs.length > 0) {
      const collaborators = collabs.map((c) => ({
        id: (c as any).invited_user_id,
        name: (c as any).invited_user_name ?? (c as any).invited_user_id,
        section: (c as any).section,
        status: (c as any).status,
      }));
      const existingDetails = ((offer as any).details ?? {}) as Record<string, any>;
      (offer as any).details = { ...existingDetails, collaborators };
    }

    return offer;
  }

  async saveContribution(
    userId: string,
    collabId: string,
    data: Record<string, any>,
  ): Promise<OfferCollaboration | any> {
    const collab = await this.collabRepo.findOne({ where: { id: collabId, invited_user_id: userId } });
    if (!collab) {
      return this.circuitService.saveCircuitContribution(userId, collabId, data);
    }
    if (collab.status !== 'accepted' && collab.status !== 'completed') throw new BadRequestException('Vous devez accepter l\'invitation avant de contribuer');

    // Bloquer toute modification si l'offre est déjà publiée
    const offerCheck = await this.offerRepo.findOne({ where: { id: collab.offer_id } });
    if ((offerCheck as any)?.status === 'approved') {
      throw new BadRequestException('Cette offre est publiée. Votre contribution ne peut plus être modifiée.');
    }

    (collab as any).contribution_data = data;
    (collab as any).status = 'completed';
    const saved = await this.collabRepo.save(collab);

    // Propager les données du collaborateur dans les details de l'offre principale
    // afin que le guide et les autres collaborateurs voient les modifications
    const SERVICE_SECTIONS = ['restauration', 'transport', 'hebergement', 'autre_service'];
    if (SERVICE_SECTIONS.includes(collab.section)) {
      const offer = await this.offerRepo.findOne({ where: { id: collab.offer_id } });
      if (offer) {
        const details: Record<string, any> = { ...((offer as any).details ?? {}) };
        // Pour transport : le guide est propriétaire de transport_types/svcs (le collab choisit un sous-type via formData).
        // On ne met à jour section_types/svcs que si le tableau est non-vide.
        if (Array.isArray(data.types) && data.types.length > 0) {
          details[`${collab.section}_types`] = data.types;
        }
        if (data.svcs && Object.keys(data.svcs as Record<string, any>).length > 0) {
          details[`${collab.section}_svcs`] = {
            ...((details[`${collab.section}_svcs`] as Record<string, any>) ?? {}),
            ...(data.svcs as Record<string, any>),
          };
        }
        // Propager les champs libres du collab (mode guidage, détails gastro, etc.)
        if (data.formData && typeof data.formData === 'object') {
          Object.assign(details, data.formData as Record<string, any>);
        }
        await this.offerRepo.update({ id: collab.offer_id }, { details } as any);
      }
    }

    // Si tous les collaborateurs actifs (non-refusés) ont terminé → "attente_publication"
    const allCollabs = await this.collabRepo.find({ where: { offer_id: collab.offer_id } });
    const activeCollabs = allCollabs.filter((c) => (c as any).status !== 'declined');
    const allCompleted = activeCollabs.length > 0 && activeCollabs.every((c) => (c as any).status === 'completed');
    if (allCompleted) {
      await this.offerRepo.update({ id: collab.offer_id }, { status: 'attente_publication' } as any);
    }

    return saved;
  }

  async withdrawContribution(userId: string, collabId: string): Promise<void> {
    const collab = await this.collabRepo.findOne({ where: { id: collabId, invited_user_id: userId } });
    if (!collab) {
      return this.circuitService.withdrawCircuitContribution(userId, collabId);
    }
    if (!['accepted', 'completed'].includes((collab as any).status)) throw new BadRequestException('Impossible de quitter cette collaboration');

    const offer = await this.offerRepo.findOne({ where: { id: (collab as any).offer_id } });

    // Bloquer si l'offre est déjà publiée — le collaborateur ne peut plus quitter
    if ((offer as any)?.status === 'approved') {
      throw new BadRequestException('Cette offre est déjà publiée. Vous ne pouvez plus quitter la collaboration. Contactez le propriétaire de l\'offre.');
    }

    // Quitter la collaboration : marquer guide_quit et passer à "declined"
    (collab as any).contribution_data = { guide_quit: true, offer_title: (offer as any)?.title ?? '' };
    (collab as any).status = 'declined';
    await this.collabRepo.save(collab);

    // Nettoyer les données de la section dans offer.details
    const section = (collab as any).section as string;
    const SERVICE_SECTIONS = ['restauration', 'transport', 'hebergement', 'autre_service'];
    if (offer && SERVICE_SECTIONS.includes(section)) {
      const details: Record<string, any> = { ...((offer as any).details ?? {}) };
      // Format multi-type (ancien)
      delete details[`${section}_types`];
      delete details[`${section}_svcs`];
      // Format PrestSubBlock (flat keys)
      if (section === 'transport') {
        delete details.transport_eco_sous_type;
        delete details.transport_eco_details;
        delete details.transport_std_sous_type;
        delete details.transport_std_details;
      } else if (section === 'restauration') {
        delete details.restauration_mode;
        delete details.restauration_gastro_expertise;
        delete details.restauration_gastro_details;
        delete details.restauration_prest_sous_type;
        delete details.restauration_prest_details;
      } else if (section === 'hebergement') {
        delete details.hebergement_prest_sous_type;
        delete details.hebergement_prest_details;
      } else if (section === 'autre_service') {
        delete details.autre_service_sous_type;
        delete details.autre_service_details;
      }
      await this.offerRepo.update({ id: (collab as any).offer_id }, { details } as any);
    }

    // Repasser l'offre en "draft" si elle était publiée ou en attente de publication
    const offerStatus = (offer as any)?.status as string | undefined;
    if (offer && ['approved', 'attente_publication'].includes(offerStatus ?? '')) {
      await this.offerRepo.update({ id: (collab as any).offer_id }, { status: 'draft' } as any);
    }

    // Supprimer le créneau agenda créé lors de l'acceptation
    const agendaLabel = `[Collab] ${(offer as any)?.title ?? ''} — ${section}`;
    const agendaSlots = await this.availRepo.find({ where: { guide_id: userId, label: agendaLabel } });
    if (agendaSlots.length) await this.availRepo.remove(agendaSlots);
    // Nettoyer les notifications de conflit et de changement d'horaire liées à cette offre
    const quitOfferId = (collab as any).offer_id as string;
    await this.notifService.deleteForOffer(userId, 'offer_schedule_conflict', quitOfferId).catch(() => {});
    await this.notifService.deleteForOffer(userId, 'offer_schedule_changed', quitOfferId).catch(() => {});

    // Notifier le propriétaire de l'offre que le guide a quitté la collaboration
    await this.notifService.create((collab as any).guide_id, 'collab_quit', {
      collab_id: collab.id,
      offer_id: (collab as any).offer_id,
      offer_title: (offer as any)?.title ?? 'votre offre',
      section: (collab as any).section,
      invited_user_name: (collab as any).invited_user_name,
      message: `${(collab as any).invited_user_name} a quitté la collaboration pour la section ${(collab as any).section} de "${(offer as any)?.title ?? 'votre offre'}".`,
    });
  }

  async leaveCollabBySlotLabel(userId: string, slotLabel: string): Promise<void> {
    // Delete the slot immediately using the exact known label
    const directSlots = await this.availRepo.find({ where: { guide_id: userId, label: slotLabel } });
    if (directSlots.length) await this.availRepo.remove(directSlots);

    // Format circuit: [Collab] Title — section JN
    const circuitMatch = slotLabel.match(/^\[Collab\]\s+(.+?)\s+—\s+(\S+)\s+J(-?\d+)$/);
    if (circuitMatch) {
      const target = await this.circuitService.getCircuitCollabBySlotLabel(userId, slotLabel);
      if (target) {
        await this.circuitService.withdrawCircuitContribution(userId, (target as any).id).catch(() => {});
      }
      return;
    }

    // Format offre: [Collab] Title — section
    const match = slotLabel.match(/^\[Collab\]\s+(.+?)\s+[—–-]\s+(\w+)$/);
    if (!match) return;
    const offerTitle = match[1].trim();
    const section    = match[2].trim();

    const collabs = await this.collabRepo.find({ where: { invited_user_id: userId, section } });
    const active = collabs.filter(c => ['accepted', 'completed'].includes((c as any).status));
    if (!active.length) return;

    let target: OfferCollaboration | null = null;
    for (const c of active) {
      const offer = await this.offerRepo.findOne({ where: { id: (c as any).offer_id } });
      if ((offer as any)?.title === offerTitle) { target = c; break; }
    }
    if (!target && active.length === 1) target = active[0];
    if (!target) return;

    await this.withdrawContribution(userId, (target as any).id);
  }

  async dismissCollaboration(userId: string, collabId: string): Promise<void> {
    // Autoriser l'appelant s'il est le collab invité OU le guide auteur de l'offre
    let collab = await this.collabRepo.findOne({ where: { id: collabId, invited_user_id: userId } });
    let isOfferAuthor = false;
    if (!collab) {
      // Vérifier si l'appelant est le guide auteur de l'offre
      collab = await this.collabRepo.findOne({ where: { id: collabId } });
      if (!collab) {
        return this.circuitService.dismissCircuitCollab(userId, collabId);
      }
      const offer = await this.offerRepo.findOne({ where: { id: (collab as any).offer_id, author_id: userId } });
      if (!offer) {
        return this.circuitService.dismissCircuitCollab(userId, collabId);
      }
      isOfferAuthor = true;
    }

    const status = (collab as any).status as string;

    // Bloquer seulement les collabs actives sur une offre publiée — les declined peuvent toujours être supprimées
    const offerForCheck = await this.offerRepo.findOne({ where: { id: (collab as any).offer_id } });
    if ((offerForCheck as any)?.status === 'approved' && ['accepted', 'completed'].includes(status)) {
      throw new BadRequestException('Cette offre est publiée. Les collaborations actives ne peuvent plus être modifiées.');
    }

    // Si le collab a déjà contribué (accepted/completed), nettoyer ses données dans offer.details
    if (['accepted', 'completed'].includes(status)) {
      const offer = offerForCheck;
      if (offer) {
        const section = (collab as any).section as string;
        const SERVICE_SECTIONS = ['restauration', 'transport', 'hebergement', 'autre_service'];
        if (SERVICE_SECTIONS.includes(section)) {
          const details: Record<string, any> = { ...((offer as any).details ?? {}) };
          delete details[`${section}_types`];
          delete details[`${section}_svcs`];
          if (section === 'transport') {
            delete details.transport_eco_sous_type;
            delete details.transport_eco_details;
            delete details.transport_std_sous_type;
            delete details.transport_std_details;
          } else if (section === 'restauration') {
            delete details.restauration_mode;
            delete details.restauration_gastro_expertise;
            delete details.restauration_gastro_details;
            delete details.restauration_prest_sous_type;
            delete details.restauration_prest_details;
          } else if (section === 'hebergement') {
            delete details.hebergement_prest_sous_type;
            delete details.hebergement_prest_details;
          } else if (section === 'autre_service') {
            delete details.autre_service_sous_type;
            delete details.autre_service_details;
          }
          await this.offerRepo.update({ id: (collab as any).offer_id }, { details } as any);
        }
        // Repasser l'offre en draft si elle était en attente ou publiée
        const offerStatus = (offer as any).status as string;
        if (['approved', 'attente_publication'].includes(offerStatus)) {
          await this.offerRepo.update({ id: (collab as any).offer_id }, { status: 'draft' } as any);
        }
      }
    }

    // Seul le collab invité peut supprimer une invitation pending (le guide peut tout supprimer)
    if (!isOfferAuthor && !['pending', 'declined'].includes(status)) {
      throw new BadRequestException('Utilisez /withdraw pour quitter une collaboration acceptée');
    }

    await this.collabRepo.delete({ id: collabId });
  }

  async kickCollaborator(guideId: string, collabId: string): Promise<void> {
    const collab = await this.collabRepo.findOne({ where: { id: collabId } });
    if (!collab) {
      return this.circuitService.kickCircuitCollaborator(guideId, collabId);
    }

    const offer = await this.offerRepo.findOne({ where: { id: (collab as any).offer_id, author_id: guideId } });
    if (!offer) {
      return this.circuitService.kickCircuitCollaborator(guideId, collabId);
    }
    if ((offer as any).status === 'approved') {
      throw new BadRequestException('Cette offre est publiée. Les collaborations ne peuvent plus être modifiées.');
    }

    const status = (collab as any).status as string;
    const section = (collab as any).section as string;

    // Nettoyer les données de la section dans l'offre si le collab avait déjà contribué
    if (['accepted', 'completed'].includes(status)) {
      const SERVICE_SECTIONS = ['restauration', 'transport', 'hebergement', 'autre_service'];
      if (SERVICE_SECTIONS.includes(section)) {
        const details: Record<string, any> = { ...((offer as any).details ?? {}) };
        delete details[`${section}_types`];
        delete details[`${section}_svcs`];
        if (section === 'transport') {
          delete details.transport_eco_sous_type; delete details.transport_eco_details;
          delete details.transport_std_sous_type; delete details.transport_std_details;
        } else if (section === 'restauration') {
          delete details.restauration_mode; delete details.restauration_gastro_expertise;
          delete details.restauration_gastro_details; delete details.restauration_prest_sous_type;
          delete details.restauration_prest_details;
        } else if (section === 'hebergement') {
          delete details.hebergement_prest_sous_type; delete details.hebergement_prest_details;
        } else if (section === 'autre_service') {
          delete details.autre_service_sous_type; delete details.autre_service_details;
        }
        await this.offerRepo.update({ id: (collab as any).offer_id }, { details } as any);
      }
      const offerStatus = (offer as any).status as string;
      if (['approved', 'attente_publication'].includes(offerStatus)) {
        await this.offerRepo.update({ id: (collab as any).offer_id }, { status: 'draft' } as any);
      }
    }

    const offerTitle = (offer as any).title ?? 'une offre';
    const existingData = (collab as any).contribution_data ?? {};
    await this.collabRepo.update(
      { id: collabId },
      {
        status: 'declined',
        contribution_data: { ...existingData, kicked: true, offer_title: offerTitle },
      } as any,
    );

    // Supprimer le créneau agenda du collaborateur retiré
    const kickedUserId = (collab as any).invited_user_id as string;
    const agendaLabel = `[Collab] ${offerTitle} — ${section}`;
    const agendaSlots = await this.availRepo.find({ where: { guide_id: kickedUserId, label: agendaLabel } });
    if (agendaSlots.length) await this.availRepo.remove(agendaSlots);
    // Nettoyer les notifications de conflit et de changement d'horaire liées à cette offre
    const kickOfferId = (collab as any).offer_id as string;
    await this.notifService.deleteForOffer(kickedUserId, 'offer_schedule_conflict', kickOfferId).catch(() => {});
    await this.notifService.deleteForOffer(kickedUserId, 'offer_schedule_changed', kickOfferId).catch(() => {});

    await this.notifService.create(kickedUserId, 'collab_kicked', {
      collab_id: collabId,
      offer_id: (collab as any).offer_id,
      offer_title: offerTitle,
      section,
      message: `Vous avez été retiré de la collaboration pour la section « ${section} » de l'offre « ${offerTitle} » par son propriétaire.`,
    });
  }

  async publishOffer(userId: string, offerId: string): Promise<void> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId, author_id: userId } });
    if (!offer) throw new NotFoundException('Offre introuvable ou accès non autorisé');
    if ((offer as any).status !== 'attente_publication') {
      throw new BadRequestException('L\'offre n\'est pas en attente de publication');
    }
    // Récupérer les collaborateurs actifs (exclure les kicked)
    const allCollabs = await this.collabRepo.find({ where: { offer_id: offerId } });
    const collabs = allCollabs.filter((c) => !((c as any).status === 'declined' && (c as any).contribution_data?.kicked === true));
    const collaborators = await Promise.all(
      collabs.map(async (c) => {
        const uid = (c as any).invited_user_id;
        const section = (c as any).section;
        // Chercher d'abord dans les guides, sinon dans les prestataires
        const guideProfile = await this.repo.findOne({ where: { user_id: uid } });
        if (guideProfile) {
          return { id: uid, name: (guideProfile as any).full_name ?? uid, section };
        }
        const providerProfile = await this.providerRepo.findOne({ where: { user_id: uid } as any });
        if (providerProfile) {
          return { id: uid, name: (providerProfile as any).name ?? uid, section };
        }
        return { id: uid, name: uid, section };
      }),
    );
    const details: Record<string, any> = { ...((offer as any).details ?? {}) };
    details.collaborators = collaborators;
    await this.offerRepo.update({ id: offerId }, { status: 'approved', details } as any);
  }

  async findPublicCollaborations(userId: string) {
    const all = await this.findMyCollaborations(userId);
    return all.filter((c: any) => {
      if (c.status !== 'completed') return false;
      const offerApproved = c.source_type === 'circuit'
        ? c.circuit_status === 'approved'
        : c.offer_status === 'approved';
      return offerApproved;
    });
  }

  async findMyCollaborations(userId: string) {
    const collabs = await this.collabRepo.find({
      where: { invited_user_id: userId },
      order: { created_at: 'DESC' } as any,
    });
    const offerResults = await Promise.all(
      collabs.map(async (c) => {
        const offer = await this.offerRepo.findOne({ where: { id: (c as any).offer_id } });
        const contribData = (c as any).contribution_data ?? {};
        const isOfferDeleted = contribData.offer_deleted === true;
        const isKicked = contribData.kicked === true;
        const isGuideQuit = contribData.guide_quit === true;
        const images: string[] | null = (offer as any)?.images ?? null;
        const cover = (Array.isArray(images) && images.length > 0) ? images[0] : (contribData.offer_cover ?? null);
        let offerStatusResolved: string;
        if (isOfferDeleted) offerStatusResolved = 'offer_deleted';
        else if (isKicked) offerStatusResolved = 'collab_kicked';
        else if (isGuideQuit) offerStatusResolved = 'collab_quit';
        else offerStatusResolved = (offer as any)?.status ?? null;
        return {
          ...(c as any),
          source_type: 'offer' as const,
          offer_title: (offer as any)?.title ?? contribData.offer_title ?? 'Offre supprimée',
          offer_description: (offer as any)?.description ?? contribData.offer_description ?? null,
          offer_cover: cover,
          offer_status: offerStatusResolved,
          // Le collaborateur voit le score de l'offre à laquelle il contribue.
          offer_sustainability_score: (offer as any)?.sustainability_score ?? null,
          guide_id: (offer as any)?.author_id ?? null,
        };
      }),
    );

    const circuitResults = await this.circuitService.findMyCircuitCollaborations(userId);

    return [...offerResults, ...circuitResults].sort(
      (a, b) => new Date((b as any).created_at).getTime() - new Date((a as any).created_at).getTime(),
    );
  }

  async getCollaborationStatus(userId: string, collabId: string) {
    const collab = await this.collabRepo.findOne({ where: { id: collabId, invited_user_id: userId } });
    if (collab) {
      return {
        status: (collab as any).status,
        section: (collab as any).section,
        contribution_data: (collab as any).contribution_data ?? null,
      };
    }
    // Fallback : collab circuit (stockée dans circuit_collaborations, pas offer_collaborations)
    return this.circuitService.getCircuitCollabStatus(userId, collabId);
  }

  async getOfferCollaborations(guideId: string, offerId: string): Promise<OfferCollaboration[]> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId, author_id: guideId } });
    if (!offer) throw new NotFoundException('Offre introuvable ou non autorisée');
    const all = await this.collabRepo.find({ where: { offer_id: offerId } });
    // Exclure les collabs retirés (kicked) — ils restent en base pour l'historique du collaborateur
    return all.filter((c) => !((c as any).status === 'declined' && (c as any).contribution_data?.kicked === true));
  }

  async searchCollaborators(
    query: string,
    excludeUserId?: string,
    section?: string,
    mode?: string,
  ): Promise<{ user_id: string; name: string; photo?: string; type: string; subtitle?: string }[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const pattern = `%${q.toLowerCase()}%`;

    // mode = "guide" → guides seulement
    // mode = slug de catégorie (ex: "restaurant_terroir", "eco_tour") → prestataires de cette catégorie
    // mode absent → utiliser les catégories par défaut de la section (transport, hebergement)
    const SECTION_DEFAULTS: Record<string, string[]> = {
      transport:  ['transport_eco', 'transport'],
      hebergement: ['hebergement'],
    };
    const onlyGuides = mode === 'guide';
    let sectionCats: string[] = [];
    if (!onlyGuides) {
      if (mode && mode !== 'guide') {
        sectionCats = [mode];
      } else if (!mode && section) {
        sectionCats = SECTION_DEFAULTS[section] ?? [];
      }
    }
    const onlyProviders = !onlyGuides && sectionCats.length > 0;

    // Guides
    const guideResults: { user_id: string; name: string; photo?: string; type: 'guide'; subtitle?: string }[] = [];
    if (!onlyProviders) {
      const guidesQb = this.repo
        .createQueryBuilder('g')
        .where('LOWER(g.full_name) LIKE :q', { q: pattern })
        .select(['g.user_id', 'g.full_name', 'g.photo', 'g.zone', 'g.guide_type'])
        .limit(10);
      if (excludeUserId) guidesQb.andWhere('g.user_id != :ex', { ex: excludeUserId });
      const guides = await guidesQb.getMany();
      guideResults.push(...guides.map((g) => ({
        user_id: g.user_id,
        name: g.full_name,
        photo: g.photo ?? undefined,
        type: 'guide' as const,
        subtitle: g.guide_type ?? g.zone ?? 'Guide',
      })));
    }

    // Prestataires
    const providerMap = new Map<string, { user_id: string; name: string; photo?: string; type: 'provider'; subtitle?: string }>();
    if (!onlyGuides) {
      // Prestataires — recherche par nom d'organisation
      // LEFT JOIN providers pour vérifier activité principale ET secondaire du prestataire lié
      const orgsQb = this.orgRepo
        .createQueryBuilder('o')
        .leftJoin('providers', 'p', 'p.user_id = o.provider_id')
        .where('LOWER(o.name) LIKE :q', { q: pattern })
        .select(['o.provider_id', 'o.name', 'o.logo', 'o.provider_type', 'o.region'])
        .limit(10);
      if (excludeUserId) orgsQb.andWhere('o.provider_id != :ex', { ex: excludeUserId });
      if (sectionCats.length > 0) {
        const conditions = sectionCats.map((_, i) =>
          `(o.provider_type = :ocat${i} OR p.activity_types LIKE :pcat${i} OR p.secondary_activity_types LIKE :pcat${i})`
        ).join(' OR ');
        const params = {
          ...Object.fromEntries(sectionCats.map((cat, i) => [`ocat${i}`, cat])),
          ...Object.fromEntries(sectionCats.map((cat, i) => [`pcat${i}`, `%${cat}%`])),
        };
        orgsQb.andWhere(`(${conditions})`, params);
      }
      const orgs = await orgsQb.getMany();

      // Prestataires — recherche par nom personnel (full_name dans la table providers)
      // LEFT JOIN organizations pour fallback sur provider_type si activity_types est NULL
      const providersQb = this.providerRepo
        .createQueryBuilder('p')
        .leftJoin('organizations', 'o', 'o.provider_id = p.user_id')
        .where('p.full_name IS NOT NULL')
        .andWhere('LOWER(p.full_name) LIKE :q', { q: pattern })
        .select(['p.user_id', 'p.full_name', 'p.photo'])
        .limit(10);
      if (excludeUserId) providersQb.andWhere('p.user_id != :ex', { ex: excludeUserId });
      if (sectionCats.length > 0) {
        const conditions = sectionCats.map((_, i) =>
          `(p.activity_types LIKE :pcat${i} OR p.secondary_activity_types LIKE :pcat${i} OR o.provider_type = :ocat${i})`
        ).join(' OR ');
        const params = {
          ...Object.fromEntries(sectionCats.map((cat, i) => [`pcat${i}`, `%${cat}%`])),
          ...Object.fromEntries(sectionCats.map((cat, i) => [`ocat${i}`, cat])),
        };
        providersQb.andWhere(`(${conditions})`, params);
      }
      const providers = await providersQb.getMany();

      for (const o of orgs) {
        providerMap.set(o.provider_id, {
          user_id: o.provider_id,
          name: o.name,
          photo: o.logo ?? undefined,
          type: 'provider',
          subtitle: o.provider_type ?? o.region ?? 'Prestataire',
        });
      }
      for (const p of providers) {
        if (!providerMap.has(p.user_id)) {
          providerMap.set(p.user_id, {
            user_id: p.user_id,
            name: p.full_name ?? '',
            photo: p.photo ?? undefined,
            type: 'provider',
            subtitle: 'Prestataire',
          });
        }
      }
    }

    return [...guideResults, ...Array.from(providerMap.values())].slice(0, 15);
  }

  async searchGuides(query: string) {
    const q = query.trim();
    if (!q) return [];
    return this.repo
      .createQueryBuilder('g')
      .where('LOWER(g.full_name) LIKE :q', { q: `%${q.toLowerCase()}%` })
      .select(['g.user_id', 'g.full_name', 'g.photo', 'g.zone', 'g.guide_type', 'g.sustainability_score'])
      .limit(20)
      .getMany();
  }

  private calculateCompletion(p: Partial<Guide>): number {
    let score = 0;

    const identityFields = [p.full_name, p.country, p.language];
    score += (identityFields.filter(Boolean).length / identityFields.length) * 30;

    if (p.guide_type) score += 10;
    if (p.zone) score += 10;
    if (p.specialties?.length) score += 15;
    if (p.languages_spoken?.length) score += 10;
    if (p.years_experience !== null && p.years_experience !== undefined) score += 15;
    if (p.photo) score += 10;

    return Math.round(score);
  }
}
