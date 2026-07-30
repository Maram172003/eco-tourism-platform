import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
    profile.photo = dto.photo ?? null;
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
    return this.offerRepo.find({
      where: { author_id: userId, author_type: 'guide' },
      order: { created_at: 'DESC' },
    });
  }

  async updateOffer(userId: string, offerId: string, dto: CreateGuideOfferDto) {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, author_id: userId, author_type: 'guide' },
    });
    if (!offer) throw new NotFoundException('Offre introuvable ou accès refusé');

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
    const COLLAB_KEYS = ['restauration_types', 'restauration_svcs', 'transport_types', 'transport_svcs', 'hebergement_types', 'hebergement_svcs', 'collaborators'];
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
      const collabs = await this.collabRepo.find({ where: { offer_id: offerId } });
      const activeCollabsForFinalize = collabs.filter((c) => (c as any).status !== 'declined');
      const hasPendingCollabs = activeCollabsForFinalize.some(
        (c) => (c as any).status === 'pending' || (c as any).status === 'accepted',
      );
      // Si des collaborateurs actifs n'ont pas encore terminé, rester en draft
      // Sinon (pas de collabs actifs ou tous terminés), publier directement
      newStatus = hasPendingCollabs ? 'draft' : 'approved';
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
          } else {
            // Pas de conflit et collaborateur en attente (pending) → juste notifier, pas de slot
            await this.notifService.create(collabUserId, 'offer_schedule_changed', {
              offer_id: offerId,
              offer_title: newTitle,
              section: (c as any).section,
              message: `Les horaires de l'offre « ${newTitle} » à laquelle vous êtes invité ont été mis à jour.`,
            });
          }
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

  async deleteOffer(userId: string, offerId: string): Promise<{ message: string }> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, author_id: userId, author_type: 'guide' },
    });
    if (!offer) throw new NotFoundException('Offre introuvable ou accès refusé');

    // Notifier et supprimer les collaborations liées à cette offre
    const collabs = await this.collabRepo.find({ where: { offer_id: offerId } });
    const offerTitle = (offer as any).title ?? 'une offre';
    await Promise.all(
      collabs.map((c) =>
        this.notifService.create((c as any).invited_user_id, 'offer_deleted', {
          offer_id: offerId,
          offer_title: offerTitle,
          section: (c as any).section,
          message: `L'offre « ${offerTitle} » à laquelle vous collaboriez a été supprimée par son propriétaire.`,
        }),
      ),
    );
    if (collabs.length) await this.collabRepo.remove(collabs);

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
    return this.availRepo.save(slot);
  }

  async deleteAvailabilitySlot(guideId: string, slotId: string) {
    const slot = await this.availRepo.findOne({ where: { id: slotId, guide_id: guideId } });
    if (!slot) throw new NotFoundException('Créneau introuvable.');
    await this.availRepo.remove(slot);
    return { deleted: true };
  }

  // ── Brouillon & Collaborations ─────────────────────────────────────────────

  async saveOfferDraft(userId: string, dto: SaveOfferDraftDto): Promise<Offer> {
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
    const COLLAB_KEYS = ['restauration_types', 'restauration_svcs', 'transport_types', 'transport_svcs', 'hebergement_types', 'hebergement_svcs', 'collaborators'];

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
    dto: { invited_user_id: string; invited_user_type: string; invited_user_name: string; section: string; message?: string },
  ): Promise<OfferCollaboration> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId, author_id: guideId } });
    if (!offer) throw new NotFoundException('Offre introuvable ou non autorisée');
    // Éviter les vrais doublons (pending/accepted/completed) mais permettre la réinvitation après refus
    const existing = await this.collabRepo.findOne({ where: { offer_id: offerId, invited_user_id: dto.invited_user_id, section: dto.section } });
    if (existing) {
      const st = (existing as any).status as string;
      if (st !== 'declined') return existing; // déjà en cours — ne pas dupliquer
      // Réinvitation après refus : remettre à pending
      (existing as any).status = 'pending';
      (existing as any).message = dto.message ?? null;
      (existing as any).contribution_data = null;
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
    });
    const saved = existing ?? await this.collabRepo.save(collab);

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
  ): Promise<OfferCollaboration> {
    const collab = await this.collabRepo.findOne({ where: { id: collabId, invited_user_id: userId } });
    if (!collab) throw new NotFoundException('Invitation introuvable ou non autorisée');

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

  async getOfferForCollaborator(userId: string, offerId: string): Promise<Offer> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Offre introuvable');
    const isAuthor = offer.author_id === userId;
    const isInvited = await this.collabRepo.findOne({ where: { offer_id: offerId, invited_user_id: userId } });
    if (!isAuthor && !isInvited) throw new NotFoundException('Accès non autorisé');

    // Enrichir les details avec les collaborateurs réels (depuis la table collab)
    const collabs = await this.collabRepo.find({ where: { offer_id: offerId } });
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
  ): Promise<OfferCollaboration> {
    const collab = await this.collabRepo.findOne({ where: { id: collabId, invited_user_id: userId } });
    if (!collab) throw new NotFoundException('Invitation introuvable');
    if (collab.status !== 'accepted' && collab.status !== 'completed') throw new BadRequestException('Vous devez accepter l\'invitation avant de contribuer');
    (collab as any).contribution_data = data;
    (collab as any).status = 'completed';
    const saved = await this.collabRepo.save(collab);

    // Propager les données du collaborateur dans les details de l'offre principale
    // afin que le guide et les autres collaborateurs voient les modifications
    const SERVICE_SECTIONS = ['restauration', 'transport', 'hebergement'];
    if (SERVICE_SECTIONS.includes(collab.section) && data.types && data.svcs) {
      const offer = await this.offerRepo.findOne({ where: { id: collab.offer_id } });
      if (offer) {
        const details: Record<string, any> = { ...((offer as any).details ?? {}) };
        // Les types choisis par le collaborateur remplacent/complètent ceux de sa section
        details[`${collab.section}_types`] = data.types;
        // Les svcs du collaborateur sont fusionnés dans les svcs de la section
        details[`${collab.section}_svcs`] = {
          ...((details[`${collab.section}_svcs`] as Record<string, any>) ?? {}),
          ...(data.svcs as Record<string, any>),
        };
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
    if (!collab) throw new NotFoundException('Invitation introuvable');
    if (!['accepted', 'completed'].includes((collab as any).status)) throw new BadRequestException('Impossible de quitter cette collaboration');

    const offer = await this.offerRepo.findOne({ where: { id: (collab as any).offer_id } });

    // Bloquer si l'offre est déjà publiée — le collaborateur ne peut plus quitter
    if ((offer as any)?.status === 'approved') {
      throw new BadRequestException('Cette offre est déjà publiée. Vous ne pouvez plus quitter la collaboration. Contactez le propriétaire de l\'offre.');
    }

    // Quitter la collaboration : effacer les données et passer à "declined"
    (collab as any).contribution_data = null;
    (collab as any).status = 'declined';
    await this.collabRepo.save(collab);

    // Nettoyer les données de la section dans offer.details
    const section = (collab as any).section as string;
    const SERVICE_SECTIONS = ['restauration', 'transport', 'hebergement'];
    if (offer && SERVICE_SECTIONS.includes(section)) {
      const details: Record<string, any> = { ...((offer as any).details ?? {}) };
      delete details[`${section}_types`];
      delete details[`${section}_svcs`];
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
    // Support em dash (—), en dash (–) and regular hyphen for robustness
    const match = slotLabel.match(/^\[Collab\]\s+(.+?)\s+[—–-]\s+(\w+)$/);
    if (!match) throw new BadRequestException('Label de créneau invalide');
    const offerTitle = match[1].trim();
    const section    = match[2].trim();

    // Delete the slot immediately using the exact known label — this is the user's primary goal
    // and must succeed even if the offer or collab record no longer exist in the DB
    const directSlots = await this.availRepo.find({ where: { guide_id: userId, label: slotLabel } });
    if (directSlots.length) await this.availRepo.remove(directSlots);

    // Best-effort: find the matching collab record and clean it up
    const collabs = await this.collabRepo.find({ where: { invited_user_id: userId, section } });
    const active = collabs.filter(c => ['accepted', 'completed'].includes((c as any).status));

    if (!active.length) return; // slot already deleted above — orphan cleaned up

    // Try exact title match first
    let target: OfferCollaboration | null = null;
    for (const c of active) {
      const offer = await this.offerRepo.findOne({ where: { id: (c as any).offer_id } });
      if ((offer as any)?.title === offerTitle) { target = c; break; }
    }
    // Fallback: only one active collab for this section — must be the right one
    if (!target && active.length === 1) target = active[0];

    if (!target) return; // slot cleaned up but couldn't determine which collab — acceptable

    await this.withdrawContribution(userId, (target as any).id);
  }

  async dismissCollaboration(userId: string, collabId: string): Promise<void> {
    const collab = await this.collabRepo.findOne({ where: { id: collabId, invited_user_id: userId } });
    if (!collab) throw new NotFoundException('Invitation introuvable');
    const status = (collab as any).status as string;
    if (!['pending', 'declined'].includes(status)) {
      throw new BadRequestException('Utilisez /withdraw pour quitter une collaboration acceptée');
    }
    await this.collabRepo.delete({ id: collabId });
  }

  async publishOffer(userId: string, offerId: string): Promise<void> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId, author_id: userId } });
    if (!offer) throw new NotFoundException('Offre introuvable ou accès non autorisé');
    if ((offer as any).status !== 'attente_publication') {
      throw new BadRequestException('L\'offre n\'est pas en attente de publication');
    }
    // Récupérer les collaborateurs avec leurs noms
    const collabs = await this.collabRepo.find({ where: { offer_id: offerId } });
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

  async findMyCollaborations(userId: string) {
    const collabs = await this.collabRepo.find({
      where: { invited_user_id: userId },
      order: { created_at: 'DESC' } as any,
    });
    return Promise.all(
      collabs.map(async (c) => {
        const offer = await this.offerRepo.findOne({ where: { id: (c as any).offer_id } });
        const images: string[] | null = (offer as any)?.images ?? null;
        const cover = (Array.isArray(images) && images.length > 0) ? images[0] : null;
        return {
          ...(c as any),
          offer_title: (offer as any)?.title ?? 'Offre sans titre',
          offer_description: (offer as any)?.description ?? null,
          offer_cover: cover,
          offer_status: (offer as any)?.status ?? null,
          guide_id: (offer as any)?.author_id ?? null,
        };
      }),
    );
  }

  async getCollaborationStatus(userId: string, collabId: string) {
    const collab = await this.collabRepo.findOne({ where: { id: collabId, invited_user_id: userId } });
    if (!collab) throw new NotFoundException('Invitation introuvable');
    return {
      status: (collab as any).status,
      section: (collab as any).section,
      contribution_data: (collab as any).contribution_data ?? null,
    };
  }

  async getOfferCollaborations(guideId: string, offerId: string): Promise<OfferCollaboration[]> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId, author_id: guideId } });
    if (!offer) throw new NotFoundException('Offre introuvable ou non autorisée');
    return this.collabRepo.find({ where: { offer_id: offerId } });
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
