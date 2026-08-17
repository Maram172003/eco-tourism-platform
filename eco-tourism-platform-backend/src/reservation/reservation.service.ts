import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Reservation } from './entities/reservation.entity';
import { ReservationParticipant } from './entities/reservation-participant.entity';
import { Offer } from '../offer/entities/offer.entity';
import { OfferSession } from '../offer/entities/offer-session.entity';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { Guide } from '../guide/entities/guide.entity';
import { Provider } from '../provider/entities/provider.entity';
import { User } from '../users/entities/user.entity';
import {
  AvailabilityQueryDto,
  ConfirmReservationDto,
  CreateReservationDto,
  RespondToInvitationDto,
} from './dto/reservation.dto';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notifications/notification.service';
import {
  getVariantPricing,
  resolveBookingUnitPrice,
  sortSubtypeKeys,
} from '../offer/offer-variant.util';

/** Statuses that occupy capacity (pending does NOT hold seats). */
const HELD_STATUSES = ['confirmed'];
/** Reservations still relevant for offer-delete notifications. */
const ACTIVE_STATUSES = ['pending', 'confirmed'];
/** Block duplicate bookings for the same offer + date/session. */
const DUPLICATE_BLOCK_STATUSES = ['pending', 'confirmed'];

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(ReservationParticipant)
    private readonly participantRepo: Repository<ReservationParticipant>,
    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,
    @InjectRepository(OfferSession)
    private readonly sessionRepo: Repository<OfferSession>,
    @InjectRepository(EcoTraveler)
    private readonly travelerRepo: Repository<EcoTraveler>,
    @InjectRepository(Guide)
    private readonly guideRepo: Repository<Guide>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
    private readonly notifService: NotificationService,
  ) {}

  /** Nombre de places disponibles (solo et groupe) — seules les réservations confirmées comptent. */
  async getAvailability(query: AvailabilityQueryDto): Promise<{
    spots_total: number | null;
    spots_taken: number;
    spots_available: number;
    max_group_size: number | null;
  }> {
    const offer = await this.offerRepo.findOne({ where: { id: query.offer_id } });
    if (!offer) throw new NotFoundException('Offre introuvable.');

    let spotsTotal: number | null = null;
    let spotsTaken = 0;

    if (query.session_id) {
      const session = await this.sessionRepo.findOne({ where: { id: query.session_id } });
      if (!session) throw new NotFoundException('Séance introuvable.');
      spotsTotal = session.capacity ?? offer.capacity ?? offer.max_group_size ?? null;
      spotsTaken = await this.sumHeldSpots({
        offerId: offer.id,
        sessionId: session.id,
      });
      // Keep denormalized counter in sync with confirmed seats only
      if (session.spots_taken !== spotsTaken) {
        session.spots_taken = spotsTaken;
        const cap = session.capacity ?? offer.capacity ?? offer.max_group_size ?? 0;
        if (cap > 0 && spotsTaken >= cap) session.status = 'full';
        else if (session.status === 'full') session.status = 'scheduled';
        await this.sessionRepo.save(session);
      }
    } else {
      // Capacité journalière : capacity, sinon max_group_size comme plafond
      spotsTotal = offer.capacity ?? offer.max_group_size ?? null;
      spotsTaken = await this.sumHeldSpots({
        offerId: offer.id,
        date: query.date ?? null,
        sessionId: null,
      });
    }

    // Places restantes pour ce créneau/jour (pas plafonnées par max_group_size)
    const spotsAvailable =
      spotsTotal === null ? 99 : Math.max(0, spotsTotal - spotsTaken);

    return {
      spots_total: spotsTotal,
      spots_taken: spotsTaken,
      spots_available: spotsAvailable,
      max_group_size: offer.max_group_size ?? null,
    };
  }

  /** Max acceptables pour une demande : min(places restantes, taille max de groupe). */
  private maxAcceptableParticipants(
    availability: { spots_available: number; max_group_size: number | null },
  ): number {
    const remaining = availability.spots_available;
    if (availability.max_group_size == null) return remaining;
    return Math.min(remaining, availability.max_group_size);
  }

  async create(organizerId: string, dto: CreateReservationDto): Promise<any> {
    const offer = await this.offerRepo.findOne({ where: { id: dto.offer_id } });
    if (!offer) throw new NotFoundException('Offre introuvable.');
    if (offer.status !== 'approved') {
      throw new BadRequestException("Cette offre n'est pas disponible à la réservation.");
    }

    const invitedIds = [...new Set(dto.invited_user_ids ?? [])].filter((id) => id !== organizerId);
    const rawEmails = [...new Set((dto.invited_emails ?? []).map((e) => e.trim().toLowerCase()))].filter(
      Boolean,
    );

    // Emails must match an existing eco_traveler profile — no guest email invites
    const emailOnly: Array<{ userId: string | null; email: string }> = [];
    for (const email of rawEmails) {
      const existing = await this.userRepo.findOne({ where: { email } });
      if (!existing || existing.role !== 'eco_traveler') {
        throw new BadRequestException(
          `Aucun profil éco-voyageur trouvé pour ${email}. Utilisez un profil déjà inscrit sur la plateforme.`,
        );
      }
      if (existing.id !== organizerId && !invitedIds.includes(existing.id)) {
        invitedIds.push(existing.id);
      }
    }

    // Every invited user_id must be an eco_traveler
    for (const userId of invitedIds) {
      const traveler = await this.travelerRepo.findOne({ where: { user_id: userId } });
      if (!traveler) {
        throw new BadRequestException(
          "Les invitations de groupe sont réservées aux profils éco-voyageurs existants.",
        );
      }
    }

    let session: OfferSession | null = null;
    if (dto.session_id) {
      session = await this.sessionRepo.findOne({ where: { id: dto.session_id } });
      if (!session) throw new NotFoundException('Séance introuvable.');
      if (session.status !== 'scheduled' && session.status !== 'full') {
        throw new BadRequestException("Cette séance n'est plus disponible.");
      }
    }

    // Date = séance choisie, sinon date fournie, sinon date fixée par le prestataire (availability_start)
    const offerDateStr = offer.availability_start
      ? String(offer.availability_start).slice(0, 10)
      : null;
    const reservationDateStr =
      (dto.reservation_date ? String(dto.reservation_date).slice(0, 10) : null) ??
      (session?.date ? String(session.date).slice(0, 10) : null) ??
      offerDateStr;
    if (!reservationDateStr) {
      throw new BadRequestException(
        "Aucune date n'est définie sur cette offre. Le guide/prestataire doit renseigner la disponibilité.",
      );
    }

    const dispo = ((offer as any).details as any)?.disponibilite as
      | {
          type?: string;
          dates?: string[];
          start_date?: string;
          end_date?: string;
          days_of_week?: string[];
        }
      | undefined;

    // Dates spécifiques : la date doit être dans la liste
    const specificDates = (dispo?.dates ?? [])
      .map((d) => String(d).slice(0, 10))
      .filter(Boolean);
    if (
      (dispo?.type === 'specific' || specificDates.length > 0) &&
      specificDates.length > 0 &&
      !specificDates.includes(reservationDateStr)
    ) {
      throw new BadRequestException(
        "Cette date n'est pas parmi les dates disponibles de l'offre.",
      );
    }

    // Récurrent : respecter les jours de la semaine (0=Lun … 6=Dim)
    if (dispo?.type === 'recurring' && Array.isArray(dispo.days_of_week) && dispo.days_of_week.length) {
      const js = new Date(`${reservationDateStr}T12:00:00`).getDay(); // 0=Dim
      const agenda = js === 0 ? '6' : String(js - 1);
      const allowed = dispo.days_of_week.map(String);
      if (!allowed.includes(agenda)) {
        throw new BadRequestException(
          "Cette date ne correspond pas aux jours disponibles de l'offre.",
        );
      }
    }

    const reservationDate = new Date(`${reservationDateStr}T12:00:00`);
    const startBound = offer.availability_start
      ? new Date(`${String(offer.availability_start).slice(0, 10)}T00:00:00`)
      : null;
    const endBound = offer.availability_end
      ? new Date(`${String(offer.availability_end).slice(0, 10)}T23:59:59`)
      : null;

    // Respecter la fenêtre de disponibilité de l'offre
    if (startBound && reservationDate < startBound) {
      throw new BadRequestException("Cette date est avant la période de disponibilité de l'offre.");
    }
    if (endBound && reservationDate > endBound) {
      throw new BadRequestException("Cette date est après la période de disponibilité de l'offre.");
    }

    const chosenSubtypes = this.resolveChosenSubtypes(offer, dto);

    await this.assertNoDuplicateReservation(
      organizerId,
      dto.offer_id,
      reservationDateStr,
      dto.session_id ?? null,
      chosenSubtypes,
    );

    const pricePerPerson = resolveBookingUnitPrice(offer, chosenSubtypes);
    if (pricePerPerson === null && (offer.offer_mode === 'variant' || offer.offer_mode === 'package')) {
      throw new BadRequestException('Formule invalide ou prix manquant pour cette option.');
    }

    const availability = await this.getAvailability({
      offer_id: dto.offer_id,
      session_id: dto.session_id,
      date: reservationDateStr,
    });

    const participantCount =
      dto.reservation_type === 'group'
        ? 1 + invitedIds.length + emailOnly.length
        : dto.participant_count;

    if (participantCount < 1) {
      throw new BadRequestException('Au moins un participant est requis.');
    }
    if (dto.reservation_type === 'group' && invitedIds.length === 0) {
      throw new BadRequestException(
        'Invitez au moins un éco-voyageur inscrit pour une réservation de groupe.',
      );
    }
    const maxAcceptable = this.maxAcceptableParticipants(availability);
    if (participantCount > maxAcceptable) {
      throw new BadRequestException(
        `Plus assez de places disponibles (${availability.spots_available} restante${availability.spots_available > 1 ? 's' : ''} sur ${availability.spots_total ?? '∞'}).`,
      );
    }

    const unitPrice = pricePerPerson ?? (offer.price ? Number(offer.price) : null);
    const totalPrice = unitPrice !== null ? unitPrice * participantCount : null;
    const shareAmount =
      totalPrice !== null && participantCount > 0
        ? Math.round((totalPrice / participantCount) * 100) / 100
        : null;
    const depositAmount =
      totalPrice !== null && offer.deposit_percentage
        ? Math.round(((totalPrice * offer.deposit_percentage) / 100) * 100) / 100
        : null;

    const isInstant = offer.confirmation_mode === 'instant';
    const initialStatus = isInstant ? 'confirmed' : 'pending';

    const reservation = this.reservationRepo.create({
      offer_id: dto.offer_id,
      session_id: dto.session_id ?? null,
      organizer_id: organizerId,
      reservation_type: dto.reservation_type,
      status: initialStatus,
      reservation_date: reservationDate,
      participant_count: participantCount,
      price_per_person: unitPrice,
      total_price: totalPrice,
      deposit_amount: depositAmount,
      deposit_paid: false,
      payment_status: 'unpaid',
      notes: dto.notes ?? null,
      chosen_subtypes: chosenSubtypes?.length ? chosenSubtypes : null,
      reservation_details: chosenSubtypes?.length
        ? {
            chosen_subtypes: chosenSubtypes,
            price_snapshot: unitPrice,
            pricing_breakdown: Object.fromEntries(
              chosenSubtypes.map((k) => [
                k,
                getVariantPricing(offer.details as Record<string, unknown> | null)[k] ?? null,
              ]),
            ),
          }
        : null,
    });

    const saved = await this.reservationRepo.save(reservation);

    // Only confirmed bookings occupy capacity (instant confirm claims seats now)
    if (isInstant) {
      await this.claimSpots(saved, offer);
      const dateStr = String(reservationDateStr).slice(0, 10);
      await this.sweepPendingOverCapacity(
        dto.offer_id,
        dto.session_id ?? null,
        dto.session_id ? undefined : dateStr,
      );
    }

    const participantRows: ReservationParticipant[] = [];
    for (const userId of invitedIds) {
      participantRows.push(
        this.participantRepo.create({
          reservation_id: saved.id,
          user_id: userId,
          email: null,
          status: 'pending',
        }),
      );
    }
    for (const ep of emailOnly) {
      participantRows.push(
        this.participantRepo.create({
          reservation_id: saved.id,
          user_id: null,
          email: ep.email,
          status: 'pending',
        }),
      );
    }
    if (participantRows.length) await this.participantRepo.save(participantRows);

    // Notifications & emails (best-effort)
    await this.notifyAfterCreate(saved, offer, organizerId, invitedIds, emailOnly, isInstant, shareAmount);

    const enriched = await this.enrichReservation(await this.findOneRaw(saved.id));
    return {
      ...enriched,
      share_amount: shareAmount,
      confirmation_mode: offer.confirmation_mode,
      message: isInstant
        ? 'Votre réservation est confirmée.'
        : 'Votre réservation est en attente de confirmation du prestataire.',
    };
  }

  async findMine(userId: string): Promise<{ organized: any[]; invited: any[] }> {
    const organized = await this.reservationRepo.find({
      where: { organizer_id: userId },
      relations: ['offer', 'session', 'participants'],
      order: { created_at: 'DESC' },
    });

    const invited = await this.participantRepo.find({
      where: { user_id: userId },
      relations: ['reservation', 'reservation.offer', 'reservation.session'],
      order: { invited_at: 'DESC' },
    });

    return {
      organized: await Promise.all(organized.map((r) => this.enrichReservation(r))),
      invited: await Promise.all(
        invited.map(async (p) => ({
          ...p,
          reservation: p.reservation ? await this.enrichReservation(p.reservation) : null,
        })),
      ),
    };
  }

  async findForAuthor(authorId: string): Promise<any[]> {
    const list = await this.reservationRepo
      .createQueryBuilder('r')
      .innerJoin('r.offer', 'o')
      .where('o.author_id = :authorId', { authorId })
      .leftJoinAndSelect('r.offer', 'offer')
      .leftJoinAndSelect('r.session', 'session')
      .leftJoinAndSelect('r.participants', 'participants')
      .orderBy('r.created_at', 'DESC')
      .getMany();
    return Promise.all(list.map((r) => this.enrichReservation(r)));
  }

  async findPendingInvitations(userId: string): Promise<any[]> {
    const list = await this.participantRepo.find({
      where: { user_id: userId, status: 'pending' },
      relations: ['reservation', 'reservation.offer', 'reservation.session'],
      order: { invited_at: 'DESC' },
    });
    return Promise.all(
      list.map(async (p) => ({
        ...p,
        reservation: p.reservation ? await this.enrichReservation(p.reservation) : null,
      })),
    );
  }

  async findOne(id: string): Promise<any> {
    return this.enrichReservation(await this.findOneRaw(id));
  }

  async confirmByAuthor(
    authorId: string,
    reservationId: string,
    dto: ConfirmReservationDto,
  ): Promise<any> {
    const reservation = await this.findOneRaw(reservationId);
    const offer = await this.offerRepo.findOne({ where: { id: reservation.offer_id } });
    if (!offer || offer.author_id !== authorId) {
      throw new ForbiddenException("Vous n'êtes pas l'auteur de cette offre.");
    }
    if (reservation.status !== 'pending') {
      throw new BadRequestException('Cette réservation ne peut plus être traitée.');
    }

    if (dto.status === 'confirmed') {
      // Re-check capacity at accept time — pending never held seats; only confirmed count
      const dateStr = reservation.reservation_date
        ? String(reservation.reservation_date).slice(0, 10)
        : reservation.session?.date
          ? String(reservation.session.date).slice(0, 10)
          : undefined;
      const availability = await this.getAvailability({
        offer_id: reservation.offer_id,
        session_id: reservation.session_id ?? undefined,
        date: reservation.session_id ? undefined : dateStr,
      });
      const maxAcceptable = this.maxAcceptableParticipants(availability);
      if (reservation.participant_count > maxAcceptable) {
        const reason = `Places insuffisantes : ${reservation.participant_count} participant(s) demandé(s) pour ${availability.spots_available} place(s) restante(s) sur cette date.`;
        await this.cancelForCapacity(reservation, offer, reason);
        return this.enrichReservation(await this.findOneRaw(reservationId));
      }
      reservation.status = 'confirmed';
      await this.reservationRepo.save(reservation);
      await this.claimSpots(reservation, offer);

      await this.sweepPendingOverCapacity(
        reservation.offer_id,
        reservation.session_id,
        reservation.session_id ? undefined : dateStr,
      );
    } else {
      reservation.status = 'rejected';
      if (dto.cancellation_reason) reservation.cancellation_reason = dto.cancellation_reason;
      await this.reservationRepo.save(reservation);
      // Pending never claimed seats — nothing to release
    }

    const organizer = await this.userRepo.findOne({ where: { id: reservation.organizer_id } });
    const notifType = dto.status === 'confirmed' ? 'reservation_confirmed' : 'reservation_rejected';
    const message =
      dto.status === 'confirmed'
        ? `Votre réservation pour « ${offer.title} » a été confirmée.`
        : `Votre réservation pour « ${offer.title} » a été refusée.`;

    const notifyUser = async (userId: string, email?: string | null) => {
      await this.notifService
        .create(userId, notifType, {
          reservation_id: reservation.id,
          offer_id: offer.id,
          offer_title: offer.title,
          message,
        })
        .catch(() => {});
      if (email) {
        this.mailService
          .sendReservationStatusEmail(
            email,
            offer.title,
            dto.status === 'confirmed' ? 'confirmed' : 'rejected',
            dto.cancellation_reason,
          )
          .catch(() => {});
      }
    };

    if (organizer) {
      await notifyUser(organizer.id, organizer.email);
    }

    // Notify invited participants with a platform account
    const participants = await this.participantRepo.find({
      where: { reservation_id: reservation.id },
    });
    for (const p of participants) {
      if (!p.user_id || p.user_id === reservation.organizer_id) continue;
      const u = await this.userRepo.findOne({ where: { id: p.user_id } });
      if (u) await notifyUser(u.id, u.email);
    }

    return this.enrichReservation(await this.findOneRaw(reservationId));
  }

  async respondToInvitation(
    userId: string,
    reservationId: string,
    dto: RespondToInvitationDto,
  ): Promise<ReservationParticipant> {
    const participant = await this.participantRepo.findOne({
      where: { reservation_id: reservationId, user_id: userId },
    });
    if (!participant) throw new NotFoundException('Invitation introuvable.');
    if (participant.status !== 'pending') {
      throw new BadRequestException('Vous avez déjà répondu à cette invitation.');
    }

    participant.status = dto.status;
    participant.responded_at = new Date();
    await this.participantRepo.save(participant);

    if (dto.status === 'accepted') await this.checkAndConfirm(reservationId);

    return participant;
  }

  async cancelReservation(userId: string, reservationId: string): Promise<any> {
    const reservation = await this.findOneRaw(reservationId);
    if (reservation.organizer_id !== userId) {
      throw new ForbiddenException("Seul l'organisateur peut annuler la réservation.");
    }
    if (reservation.status !== 'pending') {
      throw new BadRequestException(
        reservation.status === 'confirmed'
          ? 'Une réservation confirmée ne peut plus être annulée.'
          : 'Cette réservation ne peut pas être annulée.',
      );
    }

    reservation.status = 'cancelled';
    await this.reservationRepo.save(reservation);

    const offer = await this.offerRepo.findOne({ where: { id: reservation.offer_id } });
    if (offer) {
      // Was pending → no seats held. (If ever cancelling confirmed, release would be needed.)
      await this.notifService
        .create(offer.author_id, 'reservation_cancelled', {
          reservation_id: reservation.id,
          offer_id: offer.id,
          offer_title: offer.title,
          message: `Une réservation pour « ${offer.title} » a été annulée.`,
        })
        .catch(() => {});
    }

    return this.enrichReservation(await this.findOneRaw(reservationId));
  }

  /** Used by OfferService before delete. */
  async notifyTravelersOfferDeleted(offerId: string, offerTitle: string): Promise<void> {
    const reservations = await this.reservationRepo.find({
      where: { offer_id: offerId, status: In(ACTIVE_STATUSES) },
      relations: ['participants'],
    });

    const userIds = new Set<string>();
    for (const r of reservations) {
      userIds.add(r.organizer_id);
      for (const p of r.participants ?? []) {
        if (p.user_id) userIds.add(p.user_id);
      }
    }

    for (const uid of userIds) {
      await this.notifService
        .create(uid, 'offer_deleted', {
          offer_id: offerId,
          offer_title: offerTitle,
          message: `L'offre « ${offerTitle} » que vous aviez réservée a été supprimée. Votre réservation est annulée.`,
        })
        .catch(() => {});

      const user = await this.userRepo.findOne({ where: { id: uid } });
      if (user?.email) {
        this.mailService.sendOfferDeletedToTraveler(user.email, offerTitle).catch(() => {});
      }
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async findOneRaw(id: string): Promise<Reservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { id },
      relations: ['offer', 'session', 'participants'],
    });
    if (!reservation) throw new NotFoundException('Réservation introuvable.');
    return reservation;
  }

  private async sumHeldSpots(opts: {
    offerId: string;
    sessionId?: string | null;
    date?: string | null;
  }): Promise<number> {
    const qb = this.reservationRepo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.participant_count), 0)', 'sum')
      .where('r.offer_id = :offerId', { offerId: opts.offerId })
      .andWhere('r.status IN (:...statuses)', { statuses: HELD_STATUSES });

    if (opts.sessionId) {
      qb.andWhere('r.session_id = :sessionId', { sessionId: opts.sessionId });
    } else if (opts.date) {
      const dateOnly = String(opts.date).slice(0, 10);
      qb.andWhere('CAST(r.reservation_date AS date) = CAST(:date AS date)', { date: dateOnly });
      qb.andWhere('r.session_id IS NULL');
    } else {
      qb.andWhere('r.session_id IS NULL');
    }

    const raw = await qb.getRawOne();
    return Number(raw?.sum ?? 0);
  }

  private async claimSpots(reservation: Reservation, offer: Offer): Promise<void> {
    if (!reservation.session_id) return;
    const session = await this.sessionRepo.findOne({ where: { id: reservation.session_id } });
    if (!session) return;
    const held = await this.sumHeldSpots({
      offerId: offer.id,
      sessionId: session.id,
    });
    session.spots_taken = held;
    const cap = session.capacity ?? offer.capacity ?? offer.max_group_size ?? 0;
    if (cap > 0 && session.spots_taken >= cap) session.status = 'full';
    await this.sessionRepo.save(session);
  }

  private async releaseSpots(reservation: Reservation, offer: Offer): Promise<void> {
    if (!reservation.session_id) return;
    const session = await this.sessionRepo.findOne({ where: { id: reservation.session_id } });
    if (!session) return;
    const held = await this.sumHeldSpots({
      offerId: offer.id,
      sessionId: session.id,
    });
    session.spots_taken = held;
    const cap = session.capacity ?? offer.capacity ?? offer.max_group_size ?? 0;
    if (session.status === 'full' && (cap === 0 || session.spots_taken < cap)) {
      session.status = 'scheduled';
    }
    await this.sessionRepo.save(session);
  }

  /** Un voyageur ne peut pas réserver deux fois la même offre au même créneau (même ensemble de formules). */
  private async assertNoDuplicateReservation(
    organizerId: string,
    offerId: string,
    dateStr: string,
    sessionId: string | null,
    chosenSubtypes: string[] | null = null,
  ): Promise<void> {
    const qb = this.reservationRepo
      .createQueryBuilder('r')
      .where('r.organizer_id = :organizerId', { organizerId })
      .andWhere('r.offer_id = :offerId', { offerId })
      .andWhere('r.status IN (:...statuses)', { statuses: DUPLICATE_BLOCK_STATUSES });

    if (sessionId) {
      qb.andWhere('r.session_id = :sessionId', { sessionId });
    } else {
      qb.andWhere('r.session_id IS NULL');
      qb.andWhere('CAST(r.reservation_date AS date) = CAST(:date AS date)', {
        date: String(dateStr).slice(0, 10),
      });
    }

    if (chosenSubtypes?.length) {
      const sorted = sortSubtypeKeys(chosenSubtypes);
      qb.andWhere('r.chosen_subtypes = :subtypesJson::jsonb', {
        subtypesJson: JSON.stringify(sorted),
      });
    }

    const existing = await qb.getOne();
    if (existing) {
      const suffix = chosenSubtypes?.length
        ? ' pour cette sélection de formules à cette date.'
        : ' pour cette offre à cette date.';
      throw new BadRequestException(
        `Vous avez déjà une réservation en cours${suffix} Consultez « Mes réservations ».`,
      );
    }
  }

  private resolveChosenSubtypes(
    offer: Offer,
    dto: { chosen_subtypes?: string[]; chosen_subtype?: string },
  ): string[] | null {
    const pricing = getVariantPricing(offer.details as Record<string, unknown> | null);

    if (offer.offer_mode === 'package') {
      const all = sortSubtypeKeys(offer.offer_subtypes ?? []);
      if (!all.length) return null;
      for (const key of all) {
        if (Object.keys(pricing).length && pricing[key] === undefined) {
          throw new BadRequestException(`Prix non défini pour la formule « ${key} ».`);
        }
      }
      return all;
    }

    if (offer.offer_mode === 'variant') {
      let selected: string[] = [];
      if (dto.chosen_subtypes?.length) {
        selected = dto.chosen_subtypes.map((s) => s.trim()).filter(Boolean);
      } else if (dto.chosen_subtype?.trim()) {
        selected = [dto.chosen_subtype.trim()];
      }
      selected = sortSubtypeKeys([...new Set(selected)]);
      if (!selected.length) {
        throw new BadRequestException('Veuillez choisir au moins une formule.');
      }
      const allowed = new Set(offer.offer_subtypes ?? []);
      for (const key of selected) {
        if (!allowed.has(key)) {
          throw new BadRequestException('Formule non disponible pour cette offre.');
        }
        if (Object.keys(pricing).length && pricing[key] === undefined) {
          throw new BadRequestException('Prix non défini pour cette formule.');
        }
      }
      return selected;
    }

    if (dto.chosen_subtypes?.length || dto.chosen_subtype?.trim()) {
      throw new BadRequestException('Cette offre ne propose pas de formules.');
    }
    return null;
  }

  /** Annule une réservation en attente faute de places et notifie le voyageur. */
  private async cancelForCapacity(
    reservation: Reservation,
    offer: Offer,
    reason: string,
  ): Promise<void> {
    if (reservation.status !== 'pending') return;
    reservation.status = 'cancelled';
    reservation.cancellation_reason = reason;
    await this.reservationRepo.save(reservation);
    await this.notifyReservationCancelled(reservation, offer, reason);
  }

  /** Annule les demandes en attente qui dépassent les places restantes après une confirmation. */
  private async sweepPendingOverCapacity(
    offerId: string,
    sessionId: string | null,
    dateStr: string | undefined,
  ): Promise<void> {
    const qb = this.reservationRepo
      .createQueryBuilder('r')
      .where('r.offer_id = :offerId', { offerId })
      .andWhere('r.status = :status', { status: 'pending' });

    if (sessionId) {
      qb.andWhere('r.session_id = :sessionId', { sessionId });
    } else if (dateStr) {
      qb.andWhere('r.session_id IS NULL');
      qb.andWhere('CAST(r.reservation_date AS date) = CAST(:date AS date)', {
        date: String(dateStr).slice(0, 10),
      });
    } else {
      return;
    }

    const pending = await qb.getMany();
    if (!pending.length) return;

    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer) return;

    for (const r of pending) {
      const availability = await this.getAvailability({
        offer_id: offerId,
        session_id: sessionId ?? undefined,
        date: sessionId ? undefined : dateStr,
      });
      const maxAcceptable = this.maxAcceptableParticipants(availability);
      if (r.participant_count > maxAcceptable) {
        const reason = `Annulée automatiquement : ${r.participant_count} participant(s) demandé(s) pour seulement ${availability.spots_available} place(s) restante(s) sur cette date.`;
        await this.cancelForCapacity(r, offer, reason);
      }
    }
  }

  private async notifyReservationCancelled(
    reservation: Reservation,
    offer: Offer,
    reason: string,
  ): Promise<void> {
    const message = `Votre réservation pour « ${offer.title} » a été annulée. ${reason}`;
    const listUrl = `${process.env.FRONTEND_URL}/dashboard/ecovoyageur/reservations/${reservation.id}`;

    const notifyUser = async (userId: string, email?: string | null) => {
      await this.notifService
        .create(userId, 'reservation_cancelled', {
          reservation_id: reservation.id,
          offer_id: offer.id,
          offer_title: offer.title,
          message,
          reason,
        })
        .catch(() => {});
      if (email) {
        this.mailService
          .sendReservationCancelledEmail(email, offer.title, reason, listUrl)
          .catch(() => {});
      }
    };

    const organizer = await this.userRepo.findOne({ where: { id: reservation.organizer_id } });
    if (organizer) await notifyUser(organizer.id, organizer.email);

    const participants = await this.participantRepo.find({
      where: { reservation_id: reservation.id },
    });
    for (const p of participants) {
      if (!p.user_id || p.user_id === reservation.organizer_id) continue;
      const u = await this.userRepo.findOne({ where: { id: p.user_id } });
      if (u) await notifyUser(u.id, u.email);
    }
  }

  private async checkAndConfirm(reservationId: string): Promise<void> {
    const reservation = await this.findOneRaw(reservationId);
    const offer = await this.offerRepo.findOne({ where: { id: reservation.offer_id } });
    if (!offer || offer.confirmation_mode !== 'instant') return;
    if (reservation.status !== 'pending') return;

    const participants = await this.participantRepo.find({ where: { reservation_id: reservationId } });
    if (participants.length && participants.every((p) => p.status === 'accepted')) {
      await this.reservationRepo.update(reservationId, { status: 'confirmed' });
    }
  }

  private async enrichReservation(reservation: Reservation): Promise<any> {
    const count = reservation.participant_count || 1;
    const total = reservation.total_price != null ? Number(reservation.total_price) : null;
    const shareAmount = total !== null ? Math.round((total / count) * 100) / 100 : null;

    const invited_members = await Promise.all(
      (reservation.participants ?? []).map(async (p) => {
        let full_name = p.email ?? 'Invité';
        let photo: string | null = null;
        if (p.user_id) {
          const traveler = await this.travelerRepo.findOne({ where: { user_id: p.user_id } });
          if (traveler) {
            full_name = traveler.full_name;
            photo = traveler.photo;
          } else {
            const user = await this.userRepo.findOne({ where: { id: p.user_id } });
            if (user) full_name = user.email;
          }
        }
        return {
          id: p.id,
          user_id: p.user_id,
          email: p.email,
          full_name,
          photo,
          status: p.status,
          share_amount: shareAmount,
        };
      }),
    );

    let provider: any = null;
    let traveler: any = null;
    const offer = reservation.offer;
    if (offer?.author_id) {
      const guide = await this.guideRepo.findOne({ where: { user_id: offer.author_id } });
      const prov = await this.providerRepo.findOne({ where: { user_id: offer.author_id } });
      if (guide) {
        provider = {
          user_id: guide.user_id,
          full_name: guide.full_name,
          organization: null,
          phone: guide.telephone,
          photo: guide.photo,
        };
      } else if (prov) {
        provider = {
          user_id: prov.user_id,
          full_name: prov.full_name,
          organization: prov.organization,
          phone: prov.phone,
          photo: prov.photo,
        };
      }
    }

    if (reservation.organizer_id) {
      const orgTraveler = await this.travelerRepo.findOne({
        where: { user_id: reservation.organizer_id },
      });
      if (orgTraveler) {
        traveler = {
          user_id: orgTraveler.user_id,
          full_name: orgTraveler.full_name,
          photo: orgTraveler.photo,
          phone: null,
        };
      } else {
        const orgUser = await this.userRepo.findOne({ where: { id: reservation.organizer_id } });
        if (orgUser) {
          traveler = {
            user_id: orgUser.id,
            full_name: orgUser.email,
            photo: null,
            phone: null,
          };
        }
      }
    }

    let availability: {
      spots_total: number | null;
      spots_taken: number;
      spots_available: number;
      max_group_size: number | null;
    } | null = null;
    let can_confirm = false;

    if (offer?.id) {
      try {
        const dateStr = reservation.reservation_date
          ? String(reservation.reservation_date).slice(0, 10)
          : reservation.session?.date
            ? String(reservation.session.date).slice(0, 10)
            : undefined;
        availability = await this.getAvailability({
          offer_id: offer.id,
          session_id: reservation.session_id ?? undefined,
          date: reservation.session_id ? undefined : dateStr,
        });
        can_confirm =
          reservation.status === 'pending' &&
          reservation.participant_count <= this.maxAcceptableParticipants(availability);
      } catch {
        availability = null;
      }
    }

    return {
      ...reservation,
      share_amount: shareAmount,
      invited_members,
      provider,
      traveler,
      availability,
      can_confirm,
      offer: offer
        ? {
            ...offer,
            capacity: offer.capacity ?? null,
            max_group_size: offer.max_group_size ?? null,
          }
        : offer,
    };
  }

  private async notifyAfterCreate(
    reservation: Reservation,
    offer: Offer,
    organizerId: string,
    invitedIds: string[],
    emailOnly: Array<{ userId: string | null; email: string }>,
    isInstant: boolean,
    shareAmount: number | null,
  ): Promise<void> {
    const organizer = await this.userRepo.findOne({ where: { id: organizerId } });
    const listUrl = `${process.env.FRONTEND_URL}/dashboard/ecovoyageur/reservations/${reservation.id}`;

    if (isInstant && organizer?.email) {
      this.mailService
        .sendReservationConfirmedEmail(organizer.email, offer.title, {
          total: reservation.total_price,
          participants: reservation.participant_count,
          share: shareAmount,
          url: listUrl,
        })
        .catch(() => {});
      await this.notifService
        .create(organizerId, 'reservation_confirmed', {
          reservation_id: reservation.id,
          offer_id: offer.id,
          offer_title: offer.title,
          message: `Votre réservation pour « ${offer.title} » est confirmée.`,
        })
        .catch(() => {});
    } else if (!isInstant) {
      await this.notifService
        .create(offer.author_id, 'reservation_pending', {
          reservation_id: reservation.id,
          offer_id: offer.id,
          offer_title: offer.title,
          message: `Nouvelle réservation en attente pour « ${offer.title} ».`,
        })
        .catch(() => {});
      if (organizer?.email) {
        this.mailService
          .sendReservationPendingEmail(organizer.email, offer.title, listUrl)
          .catch(() => {});
      }
    }

    for (const uid of invitedIds) {
      await this.notifService
        .create(uid, 'reservation_invite', {
          reservation_id: reservation.id,
          offer_id: offer.id,
          offer_title: offer.title,
          message: `Vous êtes invité(e) à rejoindre une réservation pour « ${offer.title} ».`,
          share_amount: shareAmount,
        })
        .catch(() => {});
      const user = await this.userRepo.findOne({ where: { id: uid } });
      if (user?.email) {
        this.mailService
          .sendReservationInviteEmail(user.email, offer.title, shareAmount, listUrl)
          .catch(() => {});
      }
    }

    for (const ep of emailOnly) {
      this.mailService
        .sendReservationInviteEmail(
          ep.email,
          offer.title,
          shareAmount,
          `${process.env.FRONTEND_URL}/auth/register?redirect=${encodeURIComponent(listUrl)}`,
        )
        .catch(() => {});
    }
  }
}
