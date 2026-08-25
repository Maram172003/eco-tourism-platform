import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Circuit } from '../circuit/entities/circuit.entity';
import { CircuitCollaboration } from '../circuit/entities/circuit-collaboration.entity';
import {
  addDaysYmd,
  buildBookableOptions,
  enrichCircuitWithBookingFields,
  resolveBookingUnitPrice,
  resolveChosenOptions,
  sortOptionKeys,
  type BookableOption,
} from '../circuit/circuit-pricing.util';
import { Reservation } from './entities/reservation.entity';
import { ReservationParticipant } from './entities/reservation-participant.entity';
import { CreateReservationDto } from './dto/reservation.dto';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { User } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notifications/notification.service';

const HELD_STATUSES = ['confirmed'];
const DUPLICATE_BLOCK_STATUSES = ['pending', 'confirmed'];

@Injectable()
export class ReservationCircuitService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(ReservationParticipant)
    private readonly participantRepo: Repository<ReservationParticipant>,
    @InjectRepository(Circuit)
    private readonly circuitRepo: Repository<Circuit>,
    @InjectRepository(CircuitCollaboration)
    private readonly collabRepo: Repository<CircuitCollaboration>,
    @InjectRepository(EcoTraveler)
    private readonly travelerRepo: Repository<EcoTraveler>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
    private readonly notifService: NotificationService,
  ) {}

  async loadBookableCircuit(circuitId: string): Promise<{
    circuit: Circuit;
    options: BookableOption[];
  }> {
    const circuit = await this.circuitRepo.findOne({ where: { id: circuitId } });
    if (!circuit) throw new NotFoundException('Circuit introuvable.');
    const collabs = await this.collabRepo.find({ where: { circuit_id: circuitId } });
    const enriched = enrichCircuitWithBookingFields(circuit, collabs);
    const options = enriched.bookable_options ?? [];
    if (!options.length) {
      throw new BadRequestException(
        'Ce circuit ne propose pas encore de formules réservables (prix manquants).',
      );
    }
    return { circuit: enriched, options };
  }

  async getAvailability(
    circuitId: string,
    date?: string,
  ): Promise<{
    spots_total: number | null;
    spots_taken: number;
    spots_available: number;
    max_group_size: number | null;
  }> {
    const { circuit } = await this.loadBookableCircuit(circuitId);
    const spotsTotal = circuit.capacity ?? circuit.max_group_size ?? null;
    const spotsTaken = await this.sumHeldSpots(circuitId, date ?? null);
    const spotsAvailable =
      spotsTotal === null ? 99 : Math.max(0, spotsTotal - spotsTaken);

    return {
      spots_total: spotsTotal,
      spots_taken: spotsTaken,
      spots_available: spotsAvailable,
      max_group_size: circuit.max_group_size ?? null,
    };
  }

  maxAcceptableParticipants(availability: {
    spots_available: number;
    max_group_size: number | null;
  }): number {
    const remaining = availability.spots_available;
    if (availability.max_group_size == null) return remaining;
    return Math.min(remaining, availability.max_group_size);
  }

  async create(organizerId: string, dto: CreateReservationDto): Promise<Reservation> {
    const { circuit, options } = await this.loadBookableCircuit(dto.circuit_id!);
    if (circuit.status !== 'approved') {
      throw new BadRequestException("Ce circuit n'est pas disponible à la réservation.");
    }

    const invitedIds = [...new Set(dto.invited_user_ids ?? [])].filter((id) => id !== organizerId);
    for (const userId of invitedIds) {
      const traveler = await this.travelerRepo.findOne({ where: { user_id: userId } });
      if (!traveler) {
        throw new BadRequestException(
          'Les invitations de groupe sont réservées aux profils éco-voyageurs existants.',
        );
      }
    }

    const reservationDateStr = dto.reservation_date
      ? String(dto.reservation_date).slice(0, 10)
      : null;
    if (!reservationDateStr) {
      throw new BadRequestException('Veuillez choisir une date de départ pour ce circuit.');
    }

    this.validateCircuitDate(circuit, reservationDateStr);

    let chosenKeys: string[];
    try {
      chosenKeys = resolveChosenOptions(circuit, options, dto);
    } catch (e: any) {
      if (e?.message === 'CHOICE_REQUIRED') {
        throw new BadRequestException('Veuillez choisir au moins une formule.');
      }
      if (e?.message === 'INVALID_OPTION') {
        throw new BadRequestException('Formule non disponible pour ce circuit.');
      }
      throw new BadRequestException('Formule invalide ou prix manquant.');
    }

    await this.assertNoDuplicate(organizerId, circuit.id, reservationDateStr, chosenKeys);

    const pricePerPerson = resolveBookingUnitPrice(options, chosenKeys);
    if (pricePerPerson === null) {
      throw new BadRequestException('Prix invalide pour la sélection.');
    }

    const availability = await this.getAvailability(circuit.id, reservationDateStr);
    const participantCount =
      dto.reservation_type === 'group' ? 1 + invitedIds.length : dto.participant_count;

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
        `Plus assez de places disponibles (${availability.spots_available} restante${availability.spots_available > 1 ? 's' : ''}).`,
      );
    }

    const totalPrice = pricePerPerson * participantCount;
    const shareAmount =
      participantCount > 0 ? Math.round((totalPrice / participantCount) * 100) / 100 : null;
    const depositAmount = circuit.deposit_percentage
      ? Math.round(((totalPrice * circuit.deposit_percentage) / 100) * 100) / 100
      : null;

    const isInstant = circuit.confirmation_mode === 'instant';
    const departureDate = addDaysYmd(reservationDateStr, Math.max(0, (circuit.nb_jours ?? 1) - 1));

    const reservation = this.reservationRepo.create({
      offer_id: null,
      circuit_id: circuit.id,
      session_id: null,
      organizer_id: organizerId,
      reservation_type: dto.reservation_type,
      status: isInstant ? 'confirmed' : 'pending',
      reservation_date: new Date(`${reservationDateStr}T12:00:00`),
      arrival_date: new Date(`${reservationDateStr}T12:00:00`),
      departure_date: new Date(`${departureDate}T12:00:00`),
      participant_count: participantCount,
      price_per_person: pricePerPerson,
      total_price: totalPrice,
      deposit_amount: depositAmount,
      deposit_paid: false,
      payment_status: 'unpaid',
      notes: dto.notes ?? null,
      chosen_subtypes: chosenKeys,
      reservation_details: {
        circuit_id: circuit.id,
        chosen_options: chosenKeys,
        price_snapshot: pricePerPerson,
        nb_jours: circuit.nb_jours,
        pricing_breakdown: Object.fromEntries(
          chosenKeys.map((k) => [k, options.find((o) => o.key === k)?.price_per_person ?? null]),
        ),
      },
    });

    const saved = await this.reservationRepo.save(reservation);

    if (isInstant) {
      await this.sweepPendingOverCapacity(circuit.id, reservationDateStr);
    }

    const participantRows: ReservationParticipant[] = invitedIds.map((userId) =>
      this.participantRepo.create({
        reservation_id: saved.id,
        user_id: userId,
        email: null,
        status: 'pending',
      }),
    );
    if (participantRows.length) await this.participantRepo.save(participantRows);

    await this.notifyAfterCreate(saved, circuit, organizerId, invitedIds, isInstant, shareAmount);

    if (isInstant) {
      await this.notifyCollaborators(saved, circuit, chosenKeys, options);
    }

    return saved;
  }

  async confirmReservation(
    authorId: string,
    reservation: Reservation,
    status: 'confirmed' | 'rejected',
    cancellationReason?: string,
  ): Promise<void> {
    const circuit = await this.circuitRepo.findOne({ where: { id: reservation.circuit_id! } });
    if (!circuit || circuit.provider_id !== authorId) {
      throw new ForbiddenException("Vous n'êtes pas l'organisateur de ce circuit.");
    }

    if (status === 'confirmed') {
      const dateStr = String(reservation.reservation_date).slice(0, 10);
      const availability = await this.getAvailability(circuit.id, dateStr);
      const maxAcceptable = this.maxAcceptableParticipants(availability);
      if (reservation.participant_count > maxAcceptable) {
        const reason = `Places insuffisantes : ${reservation.participant_count} participant(s) pour ${availability.spots_available} place(s) restante(s).`;
        await this.cancelForCapacity(reservation, circuit, reason);
        return;
      }
      reservation.status = 'confirmed';
      await this.reservationRepo.save(reservation);
      await this.sweepPendingOverCapacity(circuit.id, dateStr);

      const collabs = await this.collabRepo.find({ where: { circuit_id: circuit.id } });
      const enriched = enrichCircuitWithBookingFields(circuit, collabs);
      await this.notifyCollaborators(
        reservation,
        circuit,
        reservation.chosen_subtypes ?? [],
        enriched.bookable_options ?? [],
      );
    } else {
      reservation.status = 'rejected';
      if (cancellationReason) reservation.cancellation_reason = cancellationReason;
      await this.reservationRepo.save(reservation);
    }

    const organizer = await this.userRepo.findOne({ where: { id: reservation.organizer_id } });
    const message =
      status === 'confirmed'
        ? `Votre réservation pour le circuit « ${circuit.title} » a été confirmée.`
        : `Votre réservation pour le circuit « ${circuit.title} » a été refusée.`;

    if (organizer) {
      await this.notifService
        .create(organizer.id, status === 'confirmed' ? 'reservation_confirmed' : 'reservation_rejected', {
          reservation_id: reservation.id,
          circuit_id: circuit.id,
          offer_title: circuit.title,
          message,
        })
        .catch(() => {});
      if (organizer.email) {
        this.mailService
          .sendReservationStatusEmail(
            organizer.email,
            circuit.title,
            status === 'confirmed' ? 'confirmed' : 'rejected',
            cancellationReason,
          )
          .catch(() => {});
      }
    }
  }

  private validateCircuitDate(circuit: Circuit, dateStr: string): void {
    const dispo = circuit.availability as
      | {
          type?: string;
          dates?: string[];
          start_date?: string;
          end_date?: string;
          days_of_week?: string[];
        }
      | null
      | undefined;

    if (!dispo) {
      throw new BadRequestException('Aucune disponibilité définie sur ce circuit.');
    }

    const specificDates = (dispo.dates ?? []).map((d) => String(d).slice(0, 10)).filter(Boolean);
    if (
      (dispo.type === 'specific' || specificDates.length > 0) &&
      specificDates.length > 0 &&
      !specificDates.includes(dateStr)
    ) {
      throw new BadRequestException("Cette date n'est pas parmi les dates disponibles du circuit.");
    }

    if (dispo.type === 'recurring' && Array.isArray(dispo.days_of_week) && dispo.days_of_week.length) {
      const js = new Date(`${dateStr}T12:00:00`).getDay();
      const agenda = js === 0 ? '6' : String(js - 1);
      if (!dispo.days_of_week.map(String).includes(agenda)) {
        throw new BadRequestException("Cette date ne correspond pas aux jours disponibles du circuit.");
      }
    }

    const start = dispo.start_date ? String(dispo.start_date).slice(0, 10) : null;
    const end = dispo.end_date ? String(dispo.end_date).slice(0, 10) : null;
    if (start && dateStr < start) {
      throw new BadRequestException('Cette date est avant la période de disponibilité du circuit.');
    }
    if (end && dateStr > end) {
      throw new BadRequestException('Cette date est après la période de disponibilité du circuit.');
    }
  }

  private async sumHeldSpots(circuitId: string, date: string | null): Promise<number> {
    const qb = this.reservationRepo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.participant_count), 0)', 'sum')
      .where('r.circuit_id = :circuitId', { circuitId })
      .andWhere('r.status IN (:...statuses)', { statuses: HELD_STATUSES });

    if (date) {
      qb.andWhere('CAST(r.reservation_date AS date) = CAST(:date AS date)', {
        date: String(date).slice(0, 10),
      });
    }

    const raw = await qb.getRawOne();
    return Number(raw?.sum ?? 0);
  }

  private async assertNoDuplicate(
    organizerId: string,
    circuitId: string,
    dateStr: string,
    chosenKeys: string[],
  ): Promise<void> {
    const qb = this.reservationRepo
      .createQueryBuilder('r')
      .where('r.organizer_id = :organizerId', { organizerId })
      .andWhere('r.circuit_id = :circuitId', { circuitId })
      .andWhere('r.status IN (:...statuses)', { statuses: DUPLICATE_BLOCK_STATUSES })
      .andWhere('CAST(r.reservation_date AS date) = CAST(:date AS date)', {
        date: String(dateStr).slice(0, 10),
      });

    if (chosenKeys.length) {
      qb.andWhere('r.chosen_subtypes = :subtypesJson::jsonb', {
        subtypesJson: JSON.stringify(sortOptionKeys(chosenKeys)),
      });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new BadRequestException(
        'Vous avez déjà une réservation en cours pour cette sélection à cette date.',
      );
    }
  }

  private async cancelForCapacity(
    reservation: Reservation,
    circuit: Circuit,
    reason: string,
  ): Promise<void> {
    if (reservation.status !== 'pending') return;
    reservation.status = 'cancelled';
    reservation.cancellation_reason = reason;
    await this.reservationRepo.save(reservation);

    const organizer = await this.userRepo.findOne({ where: { id: reservation.organizer_id } });
    const message = `Votre réservation pour « ${circuit.title} » a été annulée. ${reason}`;
    if (organizer) {
      await this.notifService
        .create(organizer.id, 'reservation_cancelled', {
          reservation_id: reservation.id,
          circuit_id: circuit.id,
          offer_title: circuit.title,
          message,
          reason,
        })
        .catch(() => {});
    }
  }

  private async sweepPendingOverCapacity(circuitId: string, dateStr: string): Promise<void> {
    const pending = await this.reservationRepo.find({
      where: { circuit_id: circuitId, status: 'pending' },
    });
    const circuit = await this.circuitRepo.findOne({ where: { id: circuitId } });
    if (!circuit) return;

    for (const r of pending) {
      const rDate = String(r.reservation_date).slice(0, 10);
      if (rDate !== dateStr) continue;
      const availability = await this.getAvailability(circuitId, dateStr);
      const maxAcceptable = this.maxAcceptableParticipants(availability);
      if (r.participant_count > maxAcceptable) {
        const reason = `Annulée automatiquement : places insuffisantes (${availability.spots_available} restante(s)).`;
        await this.cancelForCapacity(r, circuit, reason);
      }
    }
  }

  private async notifyAfterCreate(
    reservation: Reservation,
    circuit: Circuit,
    organizerId: string,
    invitedIds: string[],
    isInstant: boolean,
    shareAmount: number | null,
  ): Promise<void> {
    const listUrl = `${process.env.FRONTEND_URL}/dashboard/ecovoyageur/reservations/${reservation.id}`;
    const organizer = await this.userRepo.findOne({ where: { id: organizerId } });

    if (isInstant && organizer?.email) {
      this.mailService
        .sendReservationConfirmedEmail(organizer.email, circuit.title, {
          total: reservation.total_price,
          participants: reservation.participant_count,
          share: shareAmount,
          url: listUrl,
        })
        .catch(() => {});
    } else if (!isInstant) {
      await this.notifService
        .create(circuit.provider_id, 'reservation_pending', {
          reservation_id: reservation.id,
          circuit_id: circuit.id,
          offer_title: circuit.title,
          message: `Nouvelle réservation en attente pour le circuit « ${circuit.title} ».`,
        })
        .catch(() => {});
      if (organizer?.email) {
        this.mailService.sendReservationPendingEmail(organizer.email, circuit.title, listUrl).catch(() => {});
      }
    }

    for (const uid of invitedIds) {
      await this.notifService
        .create(uid, 'reservation_invite', {
          reservation_id: reservation.id,
          circuit_id: circuit.id,
          offer_title: circuit.title,
          message: `Invitation au circuit « ${circuit.title} ».`,
          share_amount: shareAmount,
        })
        .catch(() => {});
    }
  }

  private async notifyCollaborators(
    reservation: Reservation,
    circuit: Circuit,
    chosenKeys: string[],
    options: BookableOption[],
  ): Promise<void> {
    const collabs = await this.collabRepo.find({
      where: { circuit_id: circuit.id, status: 'completed' },
    });
    if (!collabs.length) return;

    const selectedEtapeIds = new Set(
      chosenKeys
        .filter((k) => k.startsWith('etape:'))
        .map((k) => k.split(':')[1]),
    );
    const selectedHb = chosenKeys.some((k) => k.startsWith('hebergement:'));

    for (const c of collabs) {
      const relevant =
        (c.section === 'hebergement' && selectedHb) ||
        (c.etape_id && selectedEtapeIds.has(c.etape_id));
      if (!relevant || !c.invited_user_id) continue;

      await this.notifService
        .create(c.invited_user_id, 'circuit_reservation_confirmed', {
          reservation_id: reservation.id,
          circuit_id: circuit.id,
          circuit_title: circuit.title,
          message: `Réservation confirmée sur le circuit « ${circuit.title} » (${c.section}).`,
        })
        .catch(() => {});
    }
  }
}
