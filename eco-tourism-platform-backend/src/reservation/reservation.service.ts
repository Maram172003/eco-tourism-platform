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
  UpdateReservationDto,
} from './dto/reservation.dto';
import { isInstantConfirmation } from '../common/confirmation.util';
import { partsEgales, resoudreRepartition, type Repartition } from '../common/payment-split.util';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notifications/notification.service';
import {
  getVariantPricing,
  resolveBookingUnitPrice,
  sortSubtypeKeys,
} from '../offer/offer-variant.util';
import { ReservationCircuitService } from './reservation-circuit.service';
import { OfferCollaboration } from '../offer/entities/offer-collaboration.entity';

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
    @InjectRepository(OfferCollaboration)
    private readonly offerCollabRepo: Repository<OfferCollaboration>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
    private readonly notifService: NotificationService,
    private readonly circuitBooking: ReservationCircuitService,
  ) {}

  /** Nombre de places disponibles — offre ou circuit. */
  async getAvailability(query: AvailabilityQueryDto): Promise<{
    spots_total: number | null;
    spots_taken: number;
    spots_available: number;
    max_group_size: number | null;
  }> {
    if (query.circuit_id) {
      return this.circuitBooking.getAvailability(query.circuit_id, query.date);
    }
    if (!query.offer_id) {
      throw new BadRequestException('offer_id ou circuit_id requis.');
    }
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
    if (dto.circuit_id) {
      const saved = await this.circuitBooking.create(organizerId, dto);
      const enriched = await this.enrichReservation(await this.findOneRaw(saved.id));
      const circuit = enriched.circuit;
      return {
        ...enriched,
        confirmation_mode: isInstantConfirmation(circuit) ? 'instant' : 'manual',
        message:
          saved.status === 'confirmed'
            ? 'Votre réservation est confirmée.'
            : 'Votre réservation est en attente de confirmation.',
      };
    }
    if (!dto.offer_id) {
      throw new BadRequestException('offer_id ou circuit_id requis.');
    }
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

    this.assertDateReservable(offer, reservationDateStr);
    const reservationDate = new Date(`${reservationDateStr}T12:00:00`);

    const chosenSubtypes = this.resolveChosenSubtypes(offer, dto);

    await this.assertNoDuplicateReservation(
      organizerId,
      dto.offer_id!,
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

    // Le type de confirmation choisi sur l'offre fait foi, qu'il soit rangé
    // dans la colonne ou dans `details.type_confirmation`.
    // Qui paie quoi. En solo la question ne se pose pas ; en groupe c'est
    // l'organisateur qui a tranché dans le formulaire.
    const repartition = this.resoudreParts(dto, totalPrice, invitedIds, emailOnly);

    const isInstant = isInstantConfirmation(offer as any);
    // Une réservation de groupe n'est transmise au prestataire qu'une fois le
    // groupe fixé : tant qu'un invité n'a pas répondu, le nombre de
    // participants et le prix peuvent encore changer. Ni notification, ni
    // confirmation immédiate avant cela.
    const attendLeGroupe =
      dto.reservation_type === 'group' && invitedIds.length + emailOnly.length > 0;
    const confirmeMaintenant = isInstant && !attendLeGroupe;
    const initialStatus = confirmeMaintenant ? 'confirmed' : 'pending';

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
      payment_split: dto.reservation_type === 'group' ? repartition.mode : null,
      organizer_share: repartition.organisateur,
      submitted_at: attendLeGroupe ? null : new Date(),
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
    if (confirmeMaintenant) {
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
          share_amount: repartition.invites[userId] ?? null,
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
          share_amount: repartition.invites[`email:${ep.email}`] ?? null,
        }),
      );
    }
    if (participantRows.length) await this.participantRepo.save(participantRows);

    // Notifications & emails (best-effort)
    await this.notifyAfterCreate(
      saved, offer, organizerId, invitedIds, emailOnly, confirmeMaintenant, repartition, attendLeGroupe,
    );

    const enriched = await this.enrichReservation(await this.findOneRaw(saved.id));
    return {
      ...enriched,
      share_amount: repartition.organisateur,
      payment_split: dto.reservation_type === 'group' ? repartition.mode : null,
      confirmation_mode: isInstant ? 'instant' : 'manual',
      awaiting_group: attendLeGroupe,
      message: attendLeGroupe
        ? 'Votre réservation part au prestataire dès que tous vos invités auront répondu.'
        : confirmeMaintenant
          ? 'Votre réservation est confirmée.'
          : 'Votre réservation est en attente de confirmation du prestataire.',
    };
  }

  async findMine(userId: string): Promise<{ organized: any[]; invited: any[] }> {
    const organized = await this.reservationRepo.find({
      where: { organizer_id: userId },
      relations: ['offer', 'circuit', 'session', 'participants'],
      order: { created_at: 'DESC' },
    });

    const invited = await this.participantRepo.find({
      where: { user_id: userId },
      relations: ['reservation', 'reservation.offer', 'reservation.circuit', 'reservation.session'],
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
    const offerList = await this.reservationRepo
      .createQueryBuilder('r')
      .innerJoin('r.offer', 'o')
      .where('o.author_id = :authorId', { authorId })
      .leftJoinAndSelect('r.offer', 'offer')
      .leftJoinAndSelect('r.circuit', 'circuit')
      .leftJoinAndSelect('r.session', 'session')
      .leftJoinAndSelect('r.participants', 'participants')
      .orderBy('r.created_at', 'DESC')
      .getMany();

    const circuitList = await this.reservationRepo
      .createQueryBuilder('r')
      .innerJoin('r.circuit', 'c')
      .where('c.provider_id = :authorId', { authorId })
      .leftJoinAndSelect('r.offer', 'offer')
      .leftJoinAndSelect('r.circuit', 'circuit')
      .leftJoinAndSelect('r.session', 'session')
      .leftJoinAndSelect('r.participants', 'participants')
      .orderBy('r.created_at', 'DESC')
      .getMany();

    // Les offres auxquelles il collabore : la prestation le concerne, elle doit
    // figurer dans sa liste — mais la décision reste à l'auteur.
    const collabs = await this.offerCollabRepo.find({
      where: { invited_user_id: authorId, status: In(['accepted', 'completed']) },
    });
    const offresCollab = [...new Set(collabs.map((c) => c.offer_id))];
    const dejaLa = new Set([...offerList, ...circuitList].map((r) => r.id));
    const collabList = offresCollab.length
      ? (await this.reservationRepo
          .createQueryBuilder('r')
          .where('r.offer_id IN (:...ids)', { ids: offresCollab })
          .leftJoinAndSelect('r.offer', 'offer')
          .leftJoinAndSelect('r.circuit', 'circuit')
          .leftJoinAndSelect('r.session', 'session')
          .leftJoinAndSelect('r.participants', 'participants')
          .orderBy('r.created_at', 'DESC')
          .getMany()
        ).filter((r) => !dejaLa.has(r.id))
      : [];
    const idsCollab = new Set(collabList.map((r) => r.id));

    const merged = [...offerList, ...circuitList, ...collabList]
      // Une réservation de groupe dont un invité n'a pas répondu n'est pas
      // encore une demande : son nombre de participants et son prix peuvent
      // encore changer. Le prestataire la verra quand elle sera arrêtée.
      // Une fois transmise, elle ne disparaît plus de sa liste, même si
      // l'organisateur invite quelqu'un de plus.
      .filter((r) => r.submitted_at != null || !(r.participants ?? []).some((p) => p.status === 'pending'))
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return Promise.all(
      merged.map(async (r) => ({
        ...this.vuePourAuteur(await this.enrichReservation(r)),
        // Marque la ligne comme informative : le collaborateur la voit, il ne
        // la confirme pas. Le client s'en sert pour masquer les actions.
        as_collaborator: idsCollab.has(r.id),
        // Ne remplacer `can_confirm` que sur les lignes de collaboration :
        // l'écraser partout effacerait la valeur calculée pour l'auteur.
        ...(idsCollab.has(r.id) ? { can_confirm: false } : {}),
      })),
    );
  }

  /**
   * La réservation telle que son prestataire doit la voir.
   *
   * Qui a refusé l'invitation ne viendra pas : le faire figurer dans la liste
   * des participants laissait le prestataire compter des personnes qu'il ne
   * verra pas, et exposait au passage un échange privé entre l'organisateur et
   * ses proches. Seuls les membres qui ont accepté sont transmis.
   */
  private vuePourAuteur(enrichie: any): any {
    return {
      ...enrichie,
      invited_members: (enrichie.invited_members ?? []).filter(
        (m: any) => m.status === 'accepted',
      ),
    };
  }

  async findPendingInvitations(userId: string): Promise<any[]> {
    const list = await this.participantRepo.find({
      where: { user_id: userId, status: 'pending' },
      relations: ['reservation', 'reservation.offer', 'reservation.circuit', 'reservation.session'],
      order: { invited_at: 'DESC' },
    });
    return Promise.all(
      list.map(async (p) => ({
        ...p,
        reservation: p.reservation ? await this.enrichReservation(p.reservation) : null,
      })),
    );
  }

  /**
   * Une réservation n'est lisible que par les personnes qu'elle concerne :
   * son organisateur, les invités, et l'auteur de la prestation qui doit la
   * confirmer. La route ne vérifiait rien — n'importe quel compte pouvait lire
   * la réservation d'un autre, avec le nom de ses participants et leurs parts.
   */
  async findOne(id: string, userId?: string): Promise<any> {
    const reservation = await this.findOneRaw(id);
    if (userId) {
      const invite = await this.participantRepo.findOne({
        where: { reservation_id: id, user_id: userId },
      });
      // L'offre et le circuit sont déjà chargés par findOneRaw.
      const estAuteur =
        reservation.offer?.author_id === userId ||
        (reservation.circuit as any)?.provider_id === userId;
      // Un collaborateur fournit une partie de la prestation : la réservation
      // le concerne, il doit pouvoir la consulter — sans pouvoir la trancher.
      const estCollaborateur = reservation.offer_id
        ? !!(await this.offerCollabRepo.findOne({
            where: {
              offer_id: reservation.offer_id,
              invited_user_id: userId,
              status: In(['accepted', 'completed']),
            },
          }))
        : false;
      if (reservation.organizer_id !== userId && !invite && !estAuteur && !estCollaborateur) {
        throw new ForbiddenException('Cette réservation ne vous concerne pas.');
      }
      // L'auteur et ses collaborateurs ne voient que le groupe final.
      if ((estAuteur || estCollaborateur) && reservation.organizer_id !== userId && !invite) {
        const vue = this.vuePourAuteur(await this.enrichReservation(reservation));
        return estAuteur ? vue : { ...vue, as_collaborator: true, can_confirm: false };
      }
    }
    return this.enrichReservation(reservation);
  }

  async confirmByAuthor(
    authorId: string,
    reservationId: string,
    dto: ConfirmReservationDto,
  ): Promise<any> {
    const reservation = await this.findOneRaw(reservationId);
    if (reservation.circuit_id) {
      const status = dto.status === 'confirmed' ? 'confirmed' : 'rejected';
      await this.circuitBooking.confirmReservation(
        authorId,
        reservation,
        status,
        dto.cancellation_reason,
      );
      return this.enrichReservation(await this.findOneRaw(reservationId));
    }

    const offer = await this.offerRepo.findOne({ where: { id: reservation.offer_id! } });
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
        offer_id: reservation.offer_id!,
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
        reservation.offer_id!,
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
    if (dto.status === 'declined') await this.libererPlaceApresRefus(reservationId);

    await this.notifyOrganizerOfResponse(reservationId, userId, dto.status);
    await this.soumettreAuPrestataire(reservationId);

    return participant;
  }

  /**
   * Prévient les collaborateurs d'une offre qu'elle vient d'être réservée.
   *
   * Ils fournissent une partie de la prestation : ils doivent savoir qu'elle
   * aura lieu, avec combien de personnes et à quelle date. En revanche
   * l'acceptation reste à l'auteur seul — la notification les informe, elle ne
   * leur demande rien.
   */
  private async notifierCollaborateurs(
    reservation: Reservation,
    offer: Offer,
  ): Promise<void> {
    try {
      const collabs = await this.offerCollabRepo.find({
        where: { offer_id: offer.id, status: In(['accepted', 'completed']) },
      });
      const date = String(reservation.reservation_date).slice(0, 10);
      for (const c of collabs) {
        const invite = (c as any).invited_user_id as string | undefined;
        if (!invite || invite === offer.author_id) continue;
        await this.notifService
          .create(invite, 'reservation_collab', {
            reservation_id: reservation.id,
            offer_id: offer.id,
            offer_title: offer.title,
            section: (c as any).section ?? null,
            participant_count: reservation.participant_count,
            reservation_date: date,
            message:
              `« ${offer.title} », à laquelle vous collaborez, vient d'être réservée `
              + `pour ${reservation.participant_count} personne(s).`,
          })
          .catch(() => {});
      }
    } catch {
      // Informer ne doit jamais faire échouer la réservation elle-même.
    }
  }

  /**
   * Transmet la réservation au prestataire une fois le groupe fixé.
   *
   * Tant qu'un invité n'a pas répondu, le nombre de participants et le prix
   * peuvent encore bouger : soumettre au prestataire une demande qui va changer
   * lui aurait fait confirmer autre chose que ce qui sera réservé. On attend
   * donc la dernière réponse, puis on le prévient — ou l'on confirme
   * directement si l'offre est en confirmation immédiate.
   *
   * `submitted_at` sert de garde : si l'organisateur invite quelqu'un de plus
   * après coup, le prestataire ne sera pas notifié une seconde fois.
   */
  private async soumettreAuPrestataire(reservationId: string): Promise<void> {
    const reservation = await this.findOneRaw(reservationId);
    if (reservation.status !== 'pending' || reservation.submitted_at) return;

    const participants = await this.participantRepo.find({
      where: { reservation_id: reservationId },
    });
    if (participants.some((p) => p.status === 'pending')) return;

    const offer = reservation.offer ?? null;
    const source: { confirmation_mode?: string | null; details?: any } | null =
      offer ?? (reservation.circuit as any) ?? null;
    const instant = source ? isInstantConfirmation(source) : false;
    const titre = offer?.title ?? reservation.circuit?.title ?? 'votre réservation';
    const listUrl = `${process.env.FRONTEND_URL}/dashboard/ecovoyageur/reservations/${reservationId}`;
    const organizer = await this.userRepo.findOne({ where: { id: reservation.organizer_id } });

    await this.reservationRepo.update(reservationId, {
      submitted_at: new Date(),
      ...(instant ? { status: 'confirmed' } : {}),
    } as any);

    if (instant) {
      // La place n'était pas retenue tant que le groupe hésitait : elle l'est
      // maintenant que la composition est arrêtée.
      if (offer) {
        const aJour = await this.findOneRaw(reservationId);
        await this.claimSpots(aJour, offer);
      }
      await this.notifService
        .create(reservation.organizer_id, 'reservation_confirmed', {
          reservation_id: reservationId,
          offer_id: reservation.offer_id,
          circuit_id: reservation.circuit_id,
          offer_title: titre,
          message: `Votre réservation pour « ${titre} » est confirmée.`,
        })
        .catch(() => {});
      return;
    }

    if (offer) await this.notifierCollaborateurs(reservation, offer);

    const auteurId = offer?.author_id ?? (reservation.circuit as any)?.provider_id ?? null;
    if (auteurId) {
      await this.notifService
        .create(auteurId, 'reservation_pending', {
          reservation_id: reservationId,
          offer_id: reservation.offer_id,
          circuit_id: reservation.circuit_id,
          offer_title: titre,
          message: `Nouvelle réservation en attente pour « ${titre} ».`,
        })
        .catch(() => {});
    }
    if (organizer?.email) {
      this.mailService.sendReservationPendingEmail(organizer.email, titre, listUrl).catch(() => {});
    }
  }

  /**
   * Un refus libère la place et retire son prix de l'addition.
   *
   * Sans cela, le groupe gardait un participant qui ne viendra pas : le
   * prestataire bloquait un siège pour personne, et l'organisateur restait
   * redevable d'une part qu'il n'avait jamais acceptée de payer.
   *
   * Seules les réservations encore en attente sont recalculées. Une fois
   * confirmée, la réservation est un engagement pris avec le prestataire : on
   * ne rejoue pas son prix après coup, la place reste réservée et payée.
   */
  private async libererPlaceApresRefus(reservationId: string): Promise<void> {
    const reservation = await this.findOneRaw(reservationId);
    if (reservation.status !== 'pending') return;

    const participants = await this.participantRepo.find({
      where: { reservation_id: reservationId },
    });
    const restants = participants.filter((p) => p.status !== 'declined');
    const partants = participants.filter((p) => p.status === 'declined');
    const nouveauNombre = 1 + restants.length;
    if (nouveauNombre >= reservation.participant_count) return;

    // Qui a refusé ne doit plus rien : garder sa part l'aurait laissée
    // s'afficher à côté de « Décliné ».
    // Zéro, et non `null` : une part absente est relue comme « part héritée »
    // pour les réservations d'avant ce champ, ce qui la ferait réapparaître.
    const aRemettreAZero = partants.filter((p) => Number(p.share_amount ?? -1) !== 0);
    if (aRemettreAZero.length) {
      for (const p of aRemettreAZero) p.share_amount = 0;
      await this.participantRepo.save(aRemettreAZero);
    }

    const unitPrice =
      reservation.price_per_person != null ? Number(reservation.price_per_person) : null;
    const nouveauTotal =
      unitPrice !== null ? Math.round(unitPrice * nouveauNombre * 100) / 100 : null;

    // Les parts sont rejouées selon le mode que l'organisateur avait choisi.
    const mode = reservation.payment_split ?? 'equal';
    let partOrganisateur: number | null = null;
    if (nouveauTotal !== null) {
      if (mode === 'organizer') {
        partOrganisateur = nouveauTotal;
        for (const p of restants) p.share_amount = 0;
      } else if (mode === 'custom') {
        // L'organisateur avait fixé le montant de chacun : ces montants-là
        // tiennent toujours. C'est sa propre part qui absorbe la différence.
        const sommeInvites = restants.reduce(
          (t, p) => t + (p.share_amount != null ? Number(p.share_amount) : 0),
          0,
        );
        partOrganisateur = Math.max(0, Math.round((nouveauTotal - sommeInvites) * 100) / 100);
      } else {
        const parts = partsEgales(nouveauTotal, nouveauNombre);
        partOrganisateur = parts[0];
        restants.forEach((p, i) => { p.share_amount = parts[i + 1]; });
      }
      if (restants.length) await this.participantRepo.save(restants);
    }

    const pourcentageAcompte =
      reservation.offer?.deposit_percentage ?? (reservation.circuit as any)?.deposit_percentage ?? null;
    const nouvelAcompte =
      nouveauTotal !== null && pourcentageAcompte
        ? Math.round(((nouveauTotal * Number(pourcentageAcompte)) / 100) * 100) / 100
        : null;

    await this.reservationRepo.update(reservationId, {
      participant_count: nouveauNombre,
      total_price: nouveauTotal,
      deposit_amount: nouvelAcompte,
      organizer_share: partOrganisateur,
    } as any);
  }

  /**
   * Prévient l'organisateur qu'un invité a répondu.
   *
   * Sans cela, il devait rouvrir la réservation pour découvrir qui avait
   * accepté — et pour un refus, rien ne l'alertait qu'une place se libérait.
   * Le décompte des réponses restantes lui évite de recompter à la main.
   */
  private async notifyOrganizerOfResponse(
    reservationId: string,
    participantId: string,
    statut: string,
  ): Promise<void> {
    try {
      const reservation = await this.findOneRaw(reservationId);
      if (!reservation.organizer_id || reservation.organizer_id === participantId) return;

      const traveler = await this.travelerRepo.findOne({ where: { user_id: participantId } });
      let nom = traveler?.full_name ?? null;
      if (!nom) {
        const user = await this.userRepo.findOne({ where: { id: participantId } });
        nom = user?.email ?? 'Un invité';
      }

      const titre = reservation.offer?.title ?? reservation.circuit?.title ?? 'votre réservation';
      const participants = await this.participantRepo.find({
        where: { reservation_id: reservationId },
      });
      const enAttente = participants.filter((p) => p.status === 'pending').length;

      await this.notifService.create(
        reservation.organizer_id,
        statut === 'accepted' ? 'reservation_accepted' : 'reservation_declined',
        {
          reservation_id: reservationId,
          offer_id: reservation.offer_id,
          circuit_id: reservation.circuit_id,
          offer_title: titre,
          participant_name: nom,
          pending_count: enAttente,
          // Relu après le recalcul : un refus a pu faire baisser l'addition.
          participant_count: reservation.participant_count,
          total_price: reservation.total_price != null ? Number(reservation.total_price) : null,
          message:
            statut === 'accepted'
              ? `${nom} a accepté votre invitation pour « ${titre} ».`
              : `${nom} a refusé votre invitation pour « ${titre} ».`,
        },
      );
    } catch {
      // Une notification qui échoue ne doit pas annuler une réponse déjà
      // enregistrée : le reste du flux vaut mieux que rien.
    }
  }

  /**
   * Modification d'une réservation par son organisateur.
   *
   * Tant que le prestataire n'a pas confirmé, rien n'est engagé : la date, la
   * formule, le groupe et la répartition du paiement restent négociables. Une
   * fois confirmée, la réservation est un accord — elle ne se modifie plus, on
   * l'annule.
   *
   * Les mêmes contrôles qu'à la création s'appliquent : disponibilité de la
   * date, capacité restante, invités réellement inscrits. Une modification ne
   * doit pas être une porte dérobée vers ce que la création refusait.
   */
  async updateReservation(
    userId: string,
    reservationId: string,
    dto: UpdateReservationDto,
  ): Promise<any> {
    const reservation = await this.findOneRaw(reservationId);
    if (reservation.organizer_id !== userId) {
      throw new ForbiddenException("Seul l'organisateur peut modifier la réservation.");
    }
    if (reservation.status !== 'pending') {
      throw new BadRequestException(
        reservation.status === 'confirmed'
          ? 'Cette réservation est confirmée : annulez-la pour en créer une autre.'
          : 'Cette réservation ne peut plus être modifiée.',
      );
    }

    const offer = reservation.offer ?? null;
    if (offer && offer.status !== 'approved') {
      throw new BadRequestException("Cette offre n'est plus disponible à la réservation.");
    }

    // ── Date ────────────────────────────────────────────────────────────────
    let dateStr = String(reservation.reservation_date).slice(0, 10);
    let sessionId = reservation.session_id;
    if (dto.session_id !== undefined) {
      const session = await this.sessionRepo.findOne({ where: { id: dto.session_id } });
      if (!session) throw new NotFoundException('Séance introuvable.');
      if (session.status !== 'scheduled' && session.status !== 'full') {
        throw new BadRequestException("Cette séance n'est plus disponible.");
      }
      sessionId = session.id;
      dateStr = String(session.date).slice(0, 10);
    } else if (dto.reservation_date) {
      dateStr = String(dto.reservation_date).slice(0, 10);
      sessionId = null;
    }
    if (offer) this.assertDateReservable(offer, dateStr);

    // ── Invités ─────────────────────────────────────────────────────────────
    const participants = await this.participantRepo.find({
      where: { reservation_id: reservationId },
    });
    let invitedIds = participants
      .filter((p) => p.user_id && p.status !== 'declined')
      .map((p) => p.user_id!);
    if (dto.invited_user_ids !== undefined) {
      invitedIds = [...new Set(dto.invited_user_ids)].filter((id) => id !== userId);
      for (const id of invitedIds) {
        const traveler = await this.travelerRepo.findOne({ where: { user_id: id } });
        if (!traveler) {
          throw new BadRequestException(
            'Les invitations de groupe sont réservées aux profils éco-voyageurs existants.',
          );
        }
      }
      if (reservation.reservation_type === 'group' && invitedIds.length === 0) {
        throw new BadRequestException(
          'Invitez au moins un éco-voyageur inscrit pour une réservation de groupe.',
        );
      }
    }

    // ── Formule et prix unitaire ────────────────────────────────────────────
    let chosenSubtypes = reservation.chosen_subtypes ?? null;
    let unitPrice =
      reservation.price_per_person != null ? Number(reservation.price_per_person) : null;
    if (dto.chosen_subtypes !== undefined) {
      if (offer) {
        chosenSubtypes = this.resolveChosenSubtypes(offer, { chosen_subtypes: dto.chosen_subtypes });
        const resolu = resolveBookingUnitPrice(offer, chosenSubtypes);
        if (resolu === null && (offer.offer_mode === 'variant' || offer.offer_mode === 'package')) {
          throw new BadRequestException('Formule invalide ou prix manquant pour cette option.');
        }
        unitPrice = resolu ?? (offer.price != null ? Number(offer.price) : null);
      } else if (reservation.circuit_id) {
        const resolu = await this.circuitBooking.resolveUnitPrice(
          reservation.circuit_id,
          dto.chosen_subtypes,
        );
        chosenSubtypes = resolu.keys;
        unitPrice = resolu.price;
      }
    }

    // ── Nombre de participants ──────────────────────────────────────────────
    const participantCount =
      reservation.reservation_type === 'group'
        ? 1 + invitedIds.length
        : (dto.participant_count ?? reservation.participant_count);
    if (participantCount < 1) {
      throw new BadRequestException('Au moins un participant est requis.');
    }

    const availability = await this.getAvailability({
      offer_id: reservation.offer_id ?? undefined,
      circuit_id: reservation.circuit_id ?? undefined,
      session_id: sessionId ?? undefined,
      date: dateStr,
    } as AvailabilityQueryDto);
    const maxAcceptable = this.maxAcceptableParticipants(availability);
    if (participantCount > maxAcceptable) {
      throw new BadRequestException(
        `Plus assez de places disponibles (${availability.spots_available} restante${availability.spots_available > 1 ? 's' : ''}).`,
      );
    }

    // ── Montants ────────────────────────────────────────────────────────────
    const totalPrice = unitPrice !== null ? Math.round(unitPrice * participantCount * 100) / 100 : null;
    const repartition = this.resoudreParts(
      {
        reservation_type: reservation.reservation_type,
        payment_split: dto.payment_split ?? reservation.payment_split ?? undefined,
        organizer_share: dto.organizer_share,
        custom_shares: dto.custom_shares,
      } as CreateReservationDto,
      totalPrice,
      invitedIds,
      [],
    );

    const pourcentageAcompte =
      offer?.deposit_percentage ?? (reservation.circuit as any)?.deposit_percentage ?? null;
    const depositAmount =
      totalPrice !== null && pourcentageAcompte
        ? Math.round(((totalPrice * Number(pourcentageAcompte)) / 100) * 100) / 100
        : null;

    // ── Écriture ────────────────────────────────────────────────────────────
    await this.reservationRepo.update(reservationId, {
      session_id: sessionId,
      reservation_date: new Date(`${dateStr}T12:00:00`),
      participant_count: participantCount,
      price_per_person: unitPrice,
      total_price: totalPrice,
      deposit_amount: depositAmount,
      chosen_subtypes: chosenSubtypes?.length ? chosenSubtypes : null,
      notes: dto.notes !== undefined ? (dto.notes || null) : reservation.notes,
      payment_split: reservation.reservation_type === 'group' ? repartition.mode : null,
      organizer_share: repartition.organisateur,
    } as any);

    await this.appliquerNouveauxInvites(reservationId, participants, invitedIds, repartition, offer);

    return this.enrichReservation(await this.findOneRaw(reservationId));
  }

  /**
   * Aligne la table des participants sur la nouvelle liste d'invités.
   *
   * Les personnes retirées sont supprimées, les nouvelles invitées et
   * notifiées, et les parts de tout le monde remises à jour — une modification
   * de date ou de formule change ce que chacun doit.
   */
  private async appliquerNouveauxInvites(
    reservationId: string,
    existants: ReservationParticipant[],
    invitedIds: string[],
    repartition: Repartition,
    offer: Offer | null,
  ): Promise<void> {
    const aRetirer = existants.filter((p) => p.user_id && !invitedIds.includes(p.user_id));
    if (aRetirer.length) await this.participantRepo.remove(aRetirer);

    const dejaLa = new Map(
      existants.filter((p) => p.user_id).map((p) => [p.user_id!, p]),
    );
    const aSauver: ReservationParticipant[] = [];
    const nouveaux: string[] = [];

    for (const id of invitedIds) {
      const existant = dejaLa.get(id);
      if (existant) {
        // Sa réponse est conservée ; seule sa part suit la nouvelle addition.
        existant.share_amount = repartition.invites[id] ?? null;
        aSauver.push(existant);
      } else {
        nouveaux.push(id);
        aSauver.push(
          this.participantRepo.create({
            reservation_id: reservationId,
            user_id: id,
            email: null,
            status: 'pending',
            share_amount: repartition.invites[id] ?? null,
          }),
        );
      }
    }
    if (aSauver.length) await this.participantRepo.save(aSauver);

    const titre = offer?.title ?? 'une expérience';
    for (const id of nouveaux) {
      await this.notifService
        .create(id, 'reservation_invite', {
          reservation_id: reservationId,
          offer_id: offer?.id ?? null,
          offer_title: titre,
          message: `Vous êtes invité(e) à rejoindre une réservation pour « ${titre} ».`,
          share_amount: repartition.invites[id] ?? null,
        })
        .catch(() => {});
    }
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

    const offer = reservation.offer_id
      ? await this.offerRepo.findOne({ where: { id: reservation.offer_id } })
      : null;
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
      relations: ['offer', 'circuit', 'session', 'participants'],
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

  /**
   * Une date est-elle ouverte à la réservation sur cette offre ?
   *
   * Extrait de `create` pour que la modification d'une réservation applique
   * exactement les mêmes règles : changer une date après coup ne doit pas
   * permettre ce que la création interdisait.
   */
  private assertDateReservable(offer: Offer, dateStr: string): void {
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
      !specificDates.includes(dateStr)
    ) {
      throw new BadRequestException(
        "Cette date n'est pas parmi les dates disponibles de l'offre.",
      );
    }

    // Récurrent : respecter les jours de la semaine (0=Lun … 6=Dim)
    if (dispo?.type === 'recurring' && Array.isArray(dispo.days_of_week) && dispo.days_of_week.length) {
      const js = new Date(`${dateStr}T12:00:00`).getDay(); // 0=Dim
      const agenda = js === 0 ? '6' : String(js - 1);
      const allowed = dispo.days_of_week.map(String);
      if (!allowed.includes(agenda)) {
        throw new BadRequestException(
          "Cette date ne correspond pas aux jours disponibles de l'offre.",
        );
      }
    }

    const date = new Date(`${dateStr}T12:00:00`);
    const startBound = offer.availability_start
      ? new Date(`${String(offer.availability_start).slice(0, 10)}T00:00:00`)
      : null;
    const endBound = offer.availability_end
      ? new Date(`${String(offer.availability_end).slice(0, 10)}T23:59:59`)
      : null;
    if (startBound && date < startBound) {
      throw new BadRequestException("Cette date est avant la période de disponibilité de l'offre.");
    }
    if (endBound && date > endBound) {
      throw new BadRequestException("Cette date est après la période de disponibilité de l'offre.");
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
    if (!reservation.offer_id) return;
    const offer = await this.offerRepo.findOne({ where: { id: reservation.offer_id } });
    if (!offer || !isInstantConfirmation(offer as any)) return;
    if (reservation.status !== 'pending') return;

    const participants = await this.participantRepo.find({ where: { reservation_id: reservationId } });
    if (participants.length && participants.every((p) => p.status === 'accepted')) {
      await this.reservationRepo.update(reservationId, { status: 'confirmed' });
    }
  }

  private async enrichReservation(reservation: Reservation): Promise<any> {
    const count = reservation.participant_count || 1;
    const total = reservation.total_price != null ? Number(reservation.total_price) : null;
    // Repli pour les réservations antérieures au choix de répartition : elles
    // étaient toutes à parts égales, sans que le montant soit enregistré.
    const partHeritee = total !== null ? Math.round((total / count) * 100) / 100 : null;
    const shareAmount =
      reservation.organizer_share != null ? Number(reservation.organizer_share) : partHeritee;

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
          // Sa part à lui : en répartition personnalisée, deux invités de la
          // même réservation ne doivent pas le même montant.
          share_amount: p.share_amount != null ? Number(p.share_amount) : partHeritee,
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

    const circuit = reservation.circuit;
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
    } else if (circuit?.id) {
      try {
        const dateStr = reservation.reservation_date
          ? String(reservation.reservation_date).slice(0, 10)
          : undefined;
        availability = await this.getAvailability({
          circuit_id: circuit.id,
          date: dateStr,
        });
        can_confirm =
          reservation.status === 'pending' &&
          reservation.participant_count <= this.maxAcceptableParticipants(availability);
      } catch {
        availability = null;
      }
    }

    if (!provider && circuit?.provider_id) {
      const guide = await this.guideRepo.findOne({ where: { user_id: circuit.provider_id } });
      const prov = await this.providerRepo.findOne({ where: { user_id: circuit.provider_id } });
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

    // Vrai tant qu'un invité n'a pas répondu : la réservation n'est pas encore
    // partie chez le prestataire, et l'écran du voyageur doit le dire.
    const awaiting_group =
      reservation.submitted_at == null
      && (reservation.participants ?? []).some((p) => p.status === 'pending');

    return {
      ...reservation,
      awaiting_group,
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
      circuit: circuit
        ? {
            ...circuit,
            capacity: circuit.capacity ?? null,
            max_group_size: circuit.max_group_size ?? null,
          }
        : circuit,
    };
  }

  /**
   * Traduit le choix de l'organisateur en montants, ou refuse la réservation.
   *
   * Le contrôle vit ici et pas seulement dans le formulaire : une répartition
   * personnalisée dont la somme ne fait pas le total laisserait une réservation
   * dont personne ne sait qui doit le reliquat.
   */
  private resoudreParts(
    dto: CreateReservationDto,
    totalPrice: number | null,
    invitedIds: string[],
    emailOnly: Array<{ userId: string | null; email: string }>,
  ): Repartition {
    const cles = [...invitedIds, ...emailOnly.map((e) => `email:${e.email}`)];
    // En solo, l'organisateur est seul : il règle la totalité.
    if (dto.reservation_type !== 'group') {
      return { mode: 'equal', organisateur: totalPrice ?? 0, invites: {} };
    }
    const saisie = {
      organisateur: dto.organizer_share ?? null,
      invites: Object.fromEntries(
        (dto.custom_shares ?? []).map((p) => [
          p.user_id ?? `email:${p.email}`,
          Number(p.amount),
        ]),
      ),
    };
    const resultat = resoudreRepartition(dto.payment_split, totalPrice, cles, saisie);
    if (!resultat.ok) throw new BadRequestException(resultat.message);
    return resultat.repartition;
  }

  private async notifyAfterCreate(
    reservation: Reservation,
    offer: Offer,
    organizerId: string,
    invitedIds: string[],
    emailOnly: Array<{ userId: string | null; email: string }>,
    isInstant: boolean,
    repartition: Repartition,
    /** Le groupe n'a pas fini de répondre : le prestataire n'est pas encore concerné. */
    attendLeGroupe = false,
  ): Promise<void> {
    const organizer = await this.userRepo.findOne({ where: { id: organizerId } });
    const listUrl = `${process.env.FRONTEND_URL}/dashboard/ecovoyageur/reservations/${reservation.id}`;

    if (isInstant && organizer?.email) {
      this.mailService
        .sendReservationConfirmedEmail(organizer.email, offer.title, {
          total: reservation.total_price,
          participants: reservation.participant_count,
          share: repartition.organisateur,
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
    } else if (!isInstant && !attendLeGroupe) {
      await this.notifierCollaborateurs(reservation, offer);
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
          // Le montant annoncé est celui de cet invité : en répartition
          // personnalisée, chacun doit une somme différente.
          share_amount: repartition.invites[uid] ?? null,
        })
        .catch(() => {});
      const user = await this.userRepo.findOne({ where: { id: uid } });
      if (user?.email) {
        this.mailService
          .sendReservationInviteEmail(user.email, offer.title, repartition.invites[uid] ?? null, listUrl)
          .catch(() => {});
      }
    }

    for (const ep of emailOnly) {
      this.mailService
        .sendReservationInviteEmail(
          ep.email,
          offer.title,
          repartition.invites[`email:${ep.email}`] ?? null,
          `${process.env.FRONTEND_URL}/auth/register?redirect=${encodeURIComponent(listUrl)}`,
        )
        .catch(() => {});
    }
  }
}
