import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Circuit } from './entities/circuit.entity';
import { CircuitCollaboration } from './entities/circuit-collaboration.entity';
import { GuideAvailabilitySlot } from '../guide/entities/guide-availability.entity';
import { Guide } from '../guide/entities/guide.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Organization } from '../organization/entities/organization.entity';
import { CreateCircuitDto, UpdateCircuitDto } from './dto/circuit.dto';
import { NotificationService } from '../notifications/notification.service';
import {
  SlotLike,
  overlappingDays,
  dispoEqual,
  toSlotType,
  deriveEtapeAvailFromCircuitAvail,
} from '../shared/slot.utils';

type CircuitEtapeRaw = {
  id: string;
  jour: number;
  titre?: string;
  categorie?: string;
  heure_debut?: string | null;
  heure_fin?: string | null;
  [key: string]: any;
};

@Injectable()
export class CircuitService {
  constructor(
    @InjectRepository(Circuit)
    private readonly repo: Repository<Circuit>,
    @InjectRepository(CircuitCollaboration)
    private readonly collabRepo: Repository<CircuitCollaboration>,
    @InjectRepository(GuideAvailabilitySlot)
    private readonly availRepo: Repository<GuideAvailabilitySlot>,
    @InjectRepository(Guide)
    private readonly guideRepo: Repository<Guide>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly notifService: NotificationService,
  ) {}

  // ── Agenda ────────────────────────────────────────────────────────────────

  private collabAgendaLabel(circuitTitle: string, section: string, jour: number): string {
    return `[Collab] ${circuitTitle} — ${section} J${jour}`;
  }

  private getEtape(circuit: Circuit, etapeId: string | null): CircuitEtapeRaw | null {
    const etapes = (circuit.etapes ?? []) as CircuitEtapeRaw[];
    if (!etapeId) return null;
    return etapes.find((e) => e.id === etapeId) ?? null;
  }

  private async getInviterName(ownerId: string): Promise<string> {
    const g = await this.guideRepo.findOne({ where: { user_id: ownerId } });
    if (g?.full_name) return g.full_name;
    const p = await this.providerRepo.findOne({ where: { user_id: ownerId } as any });
    return (p as any)?.full_name ?? (p as any)?.name ?? 'Un organisateur';
  }

  // ── CRUD de base ──────────────────────────────────────────────────────────

  async create(providerId: string, dto: CreateCircuitDto, ownerType = 'provider'): Promise<Circuit> {
    const circuit = this.repo.create({
      provider_id: providerId,
      title: dto.title,
      description: dto.description ?? null,
      nb_jours: dto.nb_jours,
      cover_image: dto.cover_image ?? null,
      etapes: dto.etapes ?? [],
      availability: dto.availability ?? null,
      hebergement: dto.hebergement ?? null,
      tags: dto.tags ?? null,
      status: 'draft',
      owner_type: ownerType,
    });
    return this.repo.save(circuit);
  }

  async findByProvider(providerId: string): Promise<Circuit[]> {
    return this.repo.find({
      where: { provider_id: providerId },
      order: { created_at: 'DESC' },
    });
  }

  async findAllPublic(): Promise<any[]> {
    const circuits = await this.repo.find({
      where: { status: 'approved' },
      order: { created_at: 'DESC' },
    });

    if (circuits.length === 0) return [];

    // Charger toutes les collaborations en une seule requête (batch)
    const circuitIds = circuits.map((c) => c.id);
    const allCollabs = await this.collabRepo.find({
      where: { circuit_id: In(circuitIds) },
    });
    const collabsByCircuit: Record<string, typeof allCollabs> = {};
    allCollabs.forEach((col) => {
      if (!collabsByCircuit[col.circuit_id]) collabsByCircuit[col.circuit_id] = [];
      collabsByCircuit[col.circuit_id].push(col);
    });

    return Promise.all(
      circuits.map(async (circuit) => {
        // ── Enrichissement collab (comme findPublicDetail) ──────────────────
        const collabs = collabsByCircuit[circuit.id] ?? [];
        const statusMap: Record<string, string> = {};
        const contribMap: Record<string, any> = {};
        collabs.forEach((c) => {
          if (c.etape_id) {
            statusMap[c.etape_id] = c.status;
            if (c.contribution_data) contribMap[c.etape_id] = c.contribution_data;
          }
        });
        const etapes = ((circuit.etapes as any[]) ?? []).map((e: any) => ({
          ...e,
          collaborator_status: statusMap[e.id] ?? e.collaborator_status ?? undefined,
          collab_contribution: contribMap[e.id] ?? e.collab_contribution ?? undefined,
        }));
        const hebergCollab = collabs.find((c) => c.section === 'hebergement');
        const heberg = circuit.hebergement as any;
        const enrichedHeberg =
          hebergCollab && heberg?.etape
            ? {
                ...heberg,
                etape: {
                  ...heberg.etape,
                  collab_contribution: hebergCollab.contribution_data ?? heberg.etape?.collab_contribution ?? null,
                  collab_status: hebergCollab.status ?? null,
                },
              }
            : heberg;

        // ── Nom / photo de l'auteur ─────────────────────────────────────────
        let author_name: string | null = null;
        let author_photo: string | null = null;

        if (circuit.owner_type === 'guide') {
          const guide = await this.guideRepo.findOne({ where: { user_id: circuit.provider_id } });
          author_name = guide?.full_name ?? null;
          author_photo = guide?.photo ?? null;
        } else {
          const provider = await this.providerRepo.findOne({ where: { user_id: circuit.provider_id } as any });
          author_name = (provider as any)?.full_name ?? null;
          author_photo = (provider as any)?.photo ?? null;
        }

        return { ...circuit, etapes, hebergement: enrichedHeberg, author_name, author_photo };
      }),
    );
  }

  async findPublishedByUser(userId: string): Promise<Circuit[]> {
    return this.repo.find({
      where: { provider_id: userId, status: 'approved' },
      order: { created_at: 'DESC' },
    });
  }

  async findPublicDetail(circuitId: string): Promise<any> {
    const circuit = await this.repo.findOne({ where: { id: circuitId, status: 'approved' } });
    if (!circuit) throw new NotFoundException('Circuit introuvable ou non publié.');
    const collabs = await this.collabRepo.find({ where: { circuit_id: circuitId } });
    const statusMap: Record<string, string> = {};
    const contribMap: Record<string, any> = {};
    collabs.forEach((c) => {
      if (c.etape_id) {
        statusMap[c.etape_id] = c.status;
        if (c.contribution_data) contribMap[c.etape_id] = c.contribution_data;
      }
    });
    const etapes = ((circuit.etapes as any[]) ?? []).map((e: any) => ({
      ...e,
      collaborator_status: statusMap[e.id] ?? undefined,
      collab_contribution: contribMap[e.id] ?? undefined,
    }));
    const hebergCollab = collabs.find((c) => c.section === 'hebergement');
    const heberg = circuit.hebergement as any;
    const enrichedHeberg = hebergCollab && heberg?.etape
      ? { ...heberg, etape: { ...heberg.etape, collab_contribution: hebergCollab.contribution_data ?? null, collab_status: hebergCollab.status ?? null } }
      : heberg;
    return { ...circuit, etapes, hebergement: enrichedHeberg };
  }

  async findOne(id: string): Promise<Circuit> {
    const circuit = await this.repo.findOne({ where: { id } });
    if (!circuit) throw new NotFoundException('Circuit introuvable.');
    return circuit;
  }

  /** Permet à un collaborateur invité (guide ou prestataire) de voir le circuit complet */
  async findForCollaborator(circuitId: string, userId: string): Promise<any> {
    const circuit = await this.repo.findOne({ where: { id: circuitId } });
    if (!circuit) throw new NotFoundException('Circuit introuvable.');
    const isOwner = circuit.provider_id === userId;
    if (!isOwner) {
      const collab = await this.collabRepo.findOne({ where: { circuit_id: circuitId, invited_user_id: userId } });
      if (!collab) throw new NotFoundException('Accès non autorisé à ce circuit.');
    }
    // Enrichir les étapes avec le statut et la contribution de chaque collaborateur
    const collabs = await this.collabRepo.find({ where: { circuit_id: circuitId } });
    const statusMap: Record<string, string> = {};
    const contribMap: Record<string, any> = {};
    collabs.forEach((c) => {
      if (c.etape_id) {
        statusMap[c.etape_id] = c.status;
        if (c.contribution_data) contribMap[c.etape_id] = c.contribution_data;
      }
    });
    const etapes = ((circuit.etapes as any[]) ?? []).map((e: any) => ({
      ...e,
      collaborator_status: statusMap[e.id] ?? undefined,
      collab_contribution: contribMap[e.id] ?? undefined,
    }));
    // Enrichir circuit.hebergement.etape avec la contribution du prestataire hébergement
    const hebergCollab = collabs.find((c) => c.section === 'hebergement');
    const heberg = circuit.hebergement as any;
    const enrichedHeberg = hebergCollab && heberg?.etape
      ? {
          ...heberg,
          etape: {
            ...heberg.etape,
            collab_contribution: hebergCollab.contribution_data ?? null,
            collab_status: hebergCollab.status ?? null,
          },
        }
      : heberg;
    return { ...circuit, etapes, hebergement: enrichedHeberg };
  }

  async update(id: string, providerId: string, dto: UpdateCircuitDto): Promise<Circuit> {
    const circuit = await this.findOne(id);
    if (circuit.provider_id !== providerId) throw new ForbiddenException();
    if (circuit.status === 'approved') {
      throw new BadRequestException('Ce circuit est publié et ne peut plus être modifié. Supprimez-le si nécessaire.');
    }

    const oldTitle = circuit.title;
    const oldAvail = circuit.availability as SlotLike | null;
    const oldEtapes = (circuit.etapes as any[]) ?? [];
    const newAvail = (dto.availability as SlotLike | undefined) ?? null;
    const titleChanged = dto.title !== undefined && dto.title !== oldTitle;
    const availChanged = dto.availability !== undefined && !dispoEqual(oldAvail ?? undefined, newAvail ?? undefined);
    const etapeTimesChanged = dto.etapes !== undefined && (dto.etapes as any[]).some((newE: any) => {
      const oldE = oldEtapes.find((e: any) => e.id === newE.id);
      return oldE && (oldE.heure_debut !== newE.heure_debut || oldE.heure_fin !== newE.heure_fin);
    });

    Object.assign(circuit, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.nb_jours !== undefined && { nb_jours: dto.nb_jours }),
      ...(dto.cover_image !== undefined && { cover_image: dto.cover_image }),
      ...(dto.etapes !== undefined && { etapes: dto.etapes }),
      ...(dto.availability !== undefined && { availability: dto.availability }),
      ...(dto.hebergement !== undefined && { hebergement: dto.hebergement }),
      ...(dto.tags !== undefined && { tags: dto.tags ?? null }),
    });
    const saved = await this.repo.save(circuit);

    const circuitAvail = saved.availability as SlotLike | null;
    if ((availChanged || titleChanged || etapeTimesChanged) && circuitAvail?.type) {
      await this.syncCircuitCollabSlots(saved, oldTitle, availChanged || etapeTimesChanged, titleChanged);
    }

    // Re-vérifier si le circuit est prêt à publier (rattrape les kicks/déclinaisons passés)
    await this.checkAndMarkReadyToPublish(saved.id).catch(() => {});

    return saved;
  }

  async remove(id: string, providerId: string): Promise<void> {
    const circuit = await this.findOne(id);
    if (circuit.provider_id !== providerId) throw new ForbiddenException();

    const collabs = await this.collabRepo.find({ where: { circuit_id: id } });

    await Promise.all(
      collabs.map(async (c) => {
        // Notifier le collaborateur
        await this.notifService.create(c.invited_user_id, 'circuit_deleted', {
          circuit_id: id,
          collab_id: c.id,
          circuit_title: circuit.title,
          section: c.section,
          message: `Le circuit « ${circuit.title} » auquel vous collaboriez a été supprimé par son propriétaire.`,
        });
        // Nettoyer le créneau agenda (préfixe — l'étape peut avoir été retirée avant la suppression)
        const removeLabelPrefix = `[Collab] ${circuit.title} — ${c.section} J`;
        const allRemoveSlots = await this.availRepo.find({ where: { guide_id: c.invited_user_id } });
        const removeSlots = allRemoveSlots.filter((s) => (s as any).label?.startsWith(removeLabelPrefix));
        if (removeSlots.length) await this.availRepo.remove(removeSlots);
        // Marquer declined + circuit_deleted
        await this.collabRepo.update(
          { id: c.id },
          { status: 'declined', contribution_data: { ...((c.contribution_data ?? {}) as object), circuit_deleted: true, circuit_title: circuit.title } } as any,
        );
      }),
    );

    await this.repo.remove(circuit);
  }

  // ── Synchronisation des créneaux agenda lors d'un changement de dispo ────

  private async syncCircuitCollabSlots(
    circuit: Circuit,
    oldTitle: string,
    availChanged: boolean,
    titleChanged: boolean,
  ): Promise<void> {
    const collabs = await this.collabRepo.find({ where: { circuit_id: circuit.id } });
    const activeCollabs = collabs.filter((c) => c.status !== 'declined');

    for (const c of activeCollabs) {
      const etape = this.getEtape(circuit, c.etape_id);
      const jour = etape?.jour ?? -1;

      const oldLabel = this.collabAgendaLabel(oldTitle, c.section, jour);
      const newLabel = this.collabAgendaLabel(circuit.title, c.section, jour);
      const hasDoneSlot = ['accepted', 'completed'].includes(c.status);

      const derivedSlot = etape
        ? deriveEtapeAvailFromCircuitAvail(circuit.availability as SlotLike, { jour, heure_debut: etape.heure_debut, heure_fin: etape.heure_fin }, circuit.nb_jours)
        : (circuit.availability as SlotLike | null);

      if (!derivedSlot?.type) continue;

      const allSlots = await this.availRepo.find({ where: { guide_id: c.invited_user_id } });
      const oldSlots = allSlots.filter((s) => (s as any).label === oldLabel);
      const otherSlots = allSlots.filter((s) => (s as any).label !== oldLabel);

      if (availChanged) {
        let conflictInfo: { label: string; days: string[] } | null = null;
        for (const slot of otherSlots) {
          const days = overlappingDays(derivedSlot, slot as SlotLike);
          if (days.length > 0) {
            conflictInfo = { label: (slot as any).label ?? slot.type, days };
            break;
          }
        }

        if (hasDoneSlot) {
          if (oldSlots.length) await this.availRepo.remove(oldSlots);
          await this.availRepo.save(this.availRepo.create({
            guide_id: c.invited_user_id,
            type: toSlotType(derivedSlot.type),
            dates: derivedSlot.dates ?? null,
            start_date: derivedSlot.start_date ?? null,
            end_date: derivedSlot.end_date ?? null,
            days_of_week: derivedSlot.days_of_week ?? null,
            label: newLabel,
            time_slots: derivedSlot.time_slots ?? null,
          }));
        }

        if (conflictInfo) {
          await this.notifService.replaceForCircuit(c.invited_user_id, 'circuit_schedule_conflict', circuit.id, {
            circuit_id: circuit.id,
            circuit_title: circuit.title,
            section: c.section,
            conflicting_slot: conflictInfo.label,
            conflict_days: conflictInfo.days,
            message: `Les horaires du circuit « ${circuit.title} » ont changé et créent un conflit (${conflictInfo.label}).`,
          });
        } else if (hasDoneSlot) {
          await this.notifService.deleteForCircuit(c.invited_user_id, 'circuit_schedule_conflict', circuit.id).catch(() => {});
          await this.notifService.create(c.invited_user_id, 'circuit_schedule_changed', {
            circuit_id: circuit.id,
            circuit_title: circuit.title,
            section: c.section,
            message: `Les horaires du circuit « ${circuit.title} » ont été mis à jour. Votre agenda a été synchronisé.`,
          });
        }
      } else if (titleChanged && hasDoneSlot) {
        // Seul le titre a changé → renommer le créneau
        if (oldSlots.length) {
          const s = oldSlots[0] as any;
          await this.availRepo.remove(oldSlots);
          await this.availRepo.save(this.availRepo.create({
            guide_id: c.invited_user_id,
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

  // ── Collaboration ─────────────────────────────────────────────────────────

  async inviteCircuitCollaborator(
    ownerId: string,
    circuitId: string,
    dto: {
      etape_id: string | null;
      invited_user_id: string;
      invited_user_type: string;
      invited_user_name: string;
      section: string;
      message?: string;
    },
  ): Promise<CircuitCollaboration> {
    const circuit = await this.repo.findOne({ where: { id: circuitId } });
    if (!circuit || circuit.provider_id !== ownerId) throw new NotFoundException('Circuit introuvable ou non autorisé');
    if (circuit.status === 'approved') {
      throw new BadRequestException('Ce circuit est publié. Les collaborations ne peuvent plus être modifiées.');
    }

    // Éviter les doublons actifs — permettre réinvitation après refus
    const existing = await this.collabRepo.findOne({
      where: {
        circuit_id: circuitId,
        ...(dto.etape_id !== null ? { etape_id: dto.etape_id } : {}),
        invited_user_id: dto.invited_user_id,
        section: dto.section,
      },
    });
    if (existing) {
      if (existing.status !== 'declined') return existing;
      existing.status = 'pending';
      existing.message = dto.message ?? null;
      existing.contribution_data = null;
      await this.collabRepo.save(existing);
    }

    const collab = existing ?? await this.collabRepo.save(this.collabRepo.create({
      circuit_id: circuitId,
      etape_id: dto.etape_id,
      owner_id: ownerId,
      invited_user_id: dto.invited_user_id,
      invited_user_type: dto.invited_user_type,
      invited_user_name: dto.invited_user_name,
      section: dto.section,
      message: dto.message ?? null,
      status: 'pending',
    }));

    // Un nouveau collaborateur en attente invalide le statut "prêt à publier"
    if (circuit.status === 'attente_publication') {
      await this.repo.update({ id: circuitId }, { status: 'draft' } as any);
    }

    const inviterName = await this.getInviterName(ownerId);
    await this.notifService.create(dto.invited_user_id, 'collaboration_invite', {
      circuit_id: circuitId,
      circuit_title: circuit.title,
      inviter_name: inviterName,
      section: dto.section,
      message: dto.message ?? null,
      collab_id: collab.id,
    });

    return collab;
  }

  async getCircuitCollaborations(ownerId: string, circuitId: string): Promise<CircuitCollaboration[]> {
    const circuit = await this.repo.findOne({ where: { id: circuitId } });
    if (!circuit || circuit.provider_id !== ownerId) throw new NotFoundException('Circuit introuvable ou non autorisé');
    const all = await this.collabRepo.find({ where: { circuit_id: circuitId } });
    return all.filter((c) => !(c.status === 'declined' && (c.contribution_data as any)?.kicked === true));
  }

  async checkCircuitCollabConflicts(
    ownerId: string,
    circuitId: string,
    availability: SlotLike,
    draftEtapes?: any[],
  ): Promise<{ userId: string; userName: string; section: string; conflictSlot: string; conflictDays: string[] }[]> {
    const circuit = await this.repo.findOne({ where: { id: circuitId } });
    if (!circuit || circuit.provider_id !== ownerId) throw new NotFoundException('Circuit introuvable');

    const collabs = await this.collabRepo.find({ where: { circuit_id: circuitId } });
    const activeCollabs = collabs.filter((c) => c.status !== 'declined');

    const result: { userId: string; userName: string; section: string; conflictSlot: string; conflictDays: string[] }[] = [];

    for (const c of activeCollabs) {
      const etapeFromDb = this.getEtape(circuit, c.etape_id);
      const etape = draftEtapes ? (draftEtapes.find((e: any) => e.id === c.etape_id) ?? etapeFromDb) : etapeFromDb;
      const jour = etape?.jour ?? -1;
      const derivedSlot = etape
        ? deriveEtapeAvailFromCircuitAvail(availability, { jour, heure_debut: etape.heure_debut, heure_fin: etape.heure_fin }, circuit.nb_jours)
        : availability;
      if (!derivedSlot) continue;

      const label = this.collabAgendaLabel(circuit.title, c.section, jour);
      const allSlots = await this.availRepo.find({ where: { guide_id: c.invited_user_id } });
      const otherSlots = allSlots.filter((s) => (s as any).label !== label);

      for (const slot of otherSlots) {
        const days = overlappingDays(derivedSlot, slot as SlotLike);
        if (days.length > 0) {
          result.push({
            userId: c.invited_user_id,
            userName: c.invited_user_name,
            section: c.section,
            conflictSlot: (slot as any).label ?? slot.type,
            conflictDays: days,
          });
          break;
        }
      }
    }

    return result;
  }

  async publishCircuit(ownerId: string, circuitId: string): Promise<void> {
    const circuit = await this.repo.findOne({ where: { id: circuitId } });
    if (!circuit || circuit.provider_id !== ownerId) throw new NotFoundException('Circuit introuvable ou non autorisé');
    if (circuit.status !== 'attente_publication') {
      throw new BadRequestException('Le circuit n\'est pas en attente de publication');
    }
    await this.repo.update({ id: circuitId }, { status: 'approved' } as any);
  }

  /** Synchronise le statut du circuit selon l'état des collaborations actives.
   *  - Tous completed → attente_publication
   *  - Au moins un non-completed → draft (rétrogradation si nécessaire)
   *  Appelé après toute transition de statut collab et après chaque update circuit. */
  private async checkAndMarkReadyToPublish(circuitId: string): Promise<void> {
    const circuit = await this.repo.findOne({ where: { id: circuitId } });
    if (!circuit || circuit.status === 'approved') return;
    const allCollabs = await this.collabRepo.find({ where: { circuit_id: circuitId } });
    const activeCollabs = allCollabs.filter((c) => c.status !== 'declined');
    const allCompleted = activeCollabs.length > 0 && activeCollabs.every((c) => c.status === 'completed');
    if (allCompleted && circuit.status !== 'attente_publication') {
      await this.repo.update({ id: circuitId }, { status: 'attente_publication' } as any);
    } else if (!allCompleted && circuit.status === 'attente_publication') {
      // Rétrogradation : un collaborateur n'a plus complété → revenir en brouillon
      await this.repo.update({ id: circuitId }, { status: 'draft' } as any);
    }
  }

  // ── Respond / Withdraw / Kick (appelés depuis guide.service.ts) ───────────

  async respondToCircuitCollab(
    userId: string,
    collabId: string,
    status: 'accepted' | 'declined',
  ): Promise<CircuitCollaboration> {
    const collab = await this.collabRepo.findOne({ where: { id: collabId, invited_user_id: userId } });
    if (!collab) throw new NotFoundException('Invitation circuit introuvable');

    const circuit = await this.repo.findOne({ where: { id: collab.circuit_id } });
    const circuitTitle = circuit?.title ?? 'un circuit';

    if (status === 'accepted' && circuit) {
      const etape = this.getEtape(circuit, collab.etape_id);
      const jour = etape?.jour ?? -1;
      const derivedSlot = etape
        ? deriveEtapeAvailFromCircuitAvail(circuit.availability as SlotLike, { jour, heure_debut: etape.heure_debut, heure_fin: etape.heure_fin }, circuit.nb_jours)
        : (circuit.availability as SlotLike | null);

      if (derivedSlot?.type) {
        const existingSlots = await this.availRepo.find({ where: { guide_id: userId } });
        for (const existing of existingSlots) {
          const days = overlappingDays(derivedSlot, existing as SlotLike);
          if (days.length > 0) {
            throw new ConflictException({
              message: 'Conflit d\'agenda détecté',
              conflictingSlot: { label: (existing as any).label ?? existing.type, days },
            });
          }
        }
        await this.availRepo.save(this.availRepo.create({
          guide_id: userId,
          type: toSlotType(derivedSlot.type),
          dates: derivedSlot.dates ?? null,
          start_date: derivedSlot.start_date ?? null,
          end_date: derivedSlot.end_date ?? null,
          days_of_week: derivedSlot.days_of_week ?? null,
          label: this.collabAgendaLabel(circuit.title, collab.section, jour),
          time_slots: derivedSlot.time_slots ?? null,
        }));
      }
    }

    collab.status = status;
    const saved = await this.collabRepo.save(collab);

    const type = status === 'accepted' ? 'collab_accepted' : 'collab_declined';
    const msg = status === 'accepted'
      ? `${collab.invited_user_name} a accepté votre invitation pour la section ${collab.section} du circuit « ${circuitTitle} ».`
      : `${collab.invited_user_name} a refusé votre invitation pour la section ${collab.section} du circuit « ${circuitTitle} ».`;

    await this.notifService.create(collab.owner_id, type, {
      collab_id: collab.id,
      circuit_id: collab.circuit_id,
      circuit_title: circuitTitle,
      section: collab.section,
      invited_user_name: collab.invited_user_name,
      message: msg,
    });

    // Si refus : re-vérifier si les collabs restants sont tous complétés
    if (status === 'declined') {
      await this.checkAndMarkReadyToPublish(collab.circuit_id);
    }

    return saved;
  }

  async saveCircuitContribution(
    userId: string,
    collabId: string,
    data: Record<string, any>,
  ): Promise<CircuitCollaboration> {
    const collab = await this.collabRepo.findOne({ where: { id: collabId, invited_user_id: userId } });
    if (!collab) throw new NotFoundException('Invitation circuit introuvable');
    if (!['accepted', 'completed'].includes(collab.status)) {
      throw new BadRequestException('Vous devez accepter l\'invitation avant de contribuer');
    }

    const circuit = await this.repo.findOne({ where: { id: collab.circuit_id } });
    if (circuit?.status === 'approved') {
      throw new BadRequestException('Ce circuit est publié. Votre contribution ne peut plus être modifiée.');
    }

    collab.contribution_data = data;
    collab.status = 'completed';
    const saved = await this.collabRepo.save(collab);

    // Persister collab_contribution + collab_lat/lng dans le JSONB du circuit
    // pour que TOUS les participants voient les données sans re-fetch spécial
    if (circuit && collab.etape_id) {
      if (collab.section === 'hebergement' && collab.etape_id === 'hebergement') {
        // L'hébergement est stocké dans circuit.hebergement.etape, pas dans circuit.etapes
        const heberg = circuit.hebergement as any;
        if (heberg?.inclus && heberg?.etape) {
          const updatedHeberg = {
            ...heberg,
            etape: {
              ...heberg.etape,
              collab_contribution: data,
              ...(data.collab_lat ? { collab_lat: parseFloat(String(data.collab_lat)) } : {}),
              ...(data.collab_lng ? { collab_lng: parseFloat(String(data.collab_lng)) } : {}),
              ...(data.collab_destination ? { collab_destination: String(data.collab_destination) } : {}),
            },
          };
          await this.repo.update({ id: collab.circuit_id }, { hebergement: updatedHeberg } as any);
        }
      } else {
        const updatedEtapes = ((circuit.etapes as any[]) ?? []).map((e: any) => {
          if (e.id !== collab.etape_id) return e;
          return {
            ...e,
            collab_contribution: data,
            ...(data.collab_lat ? { collab_lat: parseFloat(String(data.collab_lat)) } : {}),
            ...(data.collab_lng ? { collab_lng: parseFloat(String(data.collab_lng)) } : {}),
            ...(data.collab_destination ? { collab_destination: String(data.collab_destination) } : {}),
          };
        });
        await this.repo.update({ id: collab.circuit_id }, { etapes: updatedEtapes } as any);
      }
    }

    // Si tous les collabs actifs ont terminé → attente_publication
    await this.checkAndMarkReadyToPublish(collab.circuit_id);

    return saved;
  }

  async withdrawCircuitContribution(userId: string, collabId: string): Promise<void> {
    const collab = await this.collabRepo.findOne({ where: { id: collabId, invited_user_id: userId } });
    if (!collab) throw new NotFoundException('Invitation circuit introuvable');
    if (!['accepted', 'completed'].includes(collab.status)) {
      throw new BadRequestException('Impossible de quitter cette collaboration');
    }

    const circuit = await this.repo.findOne({ where: { id: collab.circuit_id } });
    if (circuit?.status === 'approved') {
      throw new BadRequestException('Ce circuit est déjà publié. Vous ne pouvez plus quitter la collaboration.');
    }

    collab.contribution_data = { guide_quit: true, circuit_title: circuit?.title ?? '' } as any;
    collab.status = 'declined';
    await this.collabRepo.save(collab);

    // Effacer collab_contribution du JSONB circuit
    if (circuit && collab.etape_id) {
      if (collab.section === 'hebergement' && collab.etape_id === 'hebergement') {
        const heberg = circuit.hebergement as any;
        if (heberg?.inclus && heberg?.etape) {
          await this.repo.update({ id: collab.circuit_id }, {
            hebergement: { ...heberg, etape: { ...heberg.etape, collab_contribution: null } },
          } as any);
        }
      } else {
        const clearedEtapes = ((circuit.etapes as any[]) ?? []).map((e: any) => {
          if (e.id !== collab.etape_id) return e;
          const { collab_contribution, ...rest } = e;
          return rest;
        });
        await this.repo.update({ id: collab.circuit_id }, { etapes: clearedEtapes } as any);
      }
    }

    // Re-vérifier si les collabs restants sont tous complétés
    await this.checkAndMarkReadyToPublish(collab.circuit_id).catch(() => {});

    // Nettoyer le créneau agenda (cherche par préfixe — l'étape peut ne plus exister dans le circuit)
    const quitLabelPrefix = `[Collab] ${circuit?.title ?? ''} — ${collab.section} J`;
    const allQuitSlots = await this.availRepo.find({ where: { guide_id: userId } });
    const quitSlots = allQuitSlots.filter((s) => (s as any).label?.startsWith(quitLabelPrefix));
    if (quitSlots.length) await this.availRepo.remove(quitSlots);

    // Nettoyer les notifs de conflit
    await this.notifService.deleteForCircuit(userId, 'circuit_schedule_conflict', collab.circuit_id).catch(() => {});
    await this.notifService.deleteForCircuit(userId, 'circuit_schedule_changed', collab.circuit_id).catch(() => {});

    // Repasser en draft si le circuit était en attente
    if (circuit && ['attente_publication'].includes(circuit.status)) {
      await this.repo.update({ id: collab.circuit_id }, { status: 'draft' } as any);
    }

    await this.notifService.create(collab.owner_id, 'collab_quit', {
      collab_id: collab.id,
      circuit_id: collab.circuit_id,
      circuit_title: circuit?.title ?? 'un circuit',
      section: collab.section,
      invited_user_name: collab.invited_user_name,
      message: `${collab.invited_user_name} a quitté la collaboration pour la section ${collab.section} du circuit « ${circuit?.title ?? 'un circuit'} ».`,
    });
  }

  async kickCircuitCollaborator(ownerId: string, collabId: string): Promise<void> {
    const collab = await this.collabRepo.findOne({ where: { id: collabId } });
    if (!collab) throw new NotFoundException('Invitation circuit introuvable');

    const circuit = await this.repo.findOne({ where: { id: collab.circuit_id } });
    if (!circuit || circuit.provider_id !== ownerId) throw new NotFoundException('Circuit introuvable ou accès non autorisé');
    if (circuit.status === 'approved') {
      throw new BadRequestException('Ce circuit est publié. Les collaborations ne peuvent plus être modifiées.');
    }

    const kickedUserId = collab.invited_user_id;

    // Chercher par préfixe (l'étape peut déjà avoir été retirée du circuit avant le kick)
    const labelPrefix = `[Collab] ${circuit.title} — ${collab.section} J`;
    const allKickedSlots = await this.availRepo.find({ where: { guide_id: kickedUserId } });
    const slots = allKickedSlots.filter((s) => (s as any).label?.startsWith(labelPrefix));
    if (slots.length) await this.availRepo.remove(slots);

    // Nettoyer les notifs
    await this.notifService.deleteForCircuit(kickedUserId, 'circuit_schedule_conflict', circuit.id).catch(() => {});
    await this.notifService.deleteForCircuit(kickedUserId, 'circuit_schedule_changed', circuit.id).catch(() => {});

    // Repasser en draft si le circuit était en attente
    if (['attente_publication'].includes(circuit.status)) {
      await this.repo.update({ id: circuit.id }, { status: 'draft' } as any);
    }

    await this.collabRepo.update(
      { id: collabId },
      { status: 'declined', contribution_data: { ...((collab.contribution_data ?? {}) as object), kicked: true, circuit_title: circuit.title } } as any,
    );

    // Effacer collab_contribution du JSONB circuit
    if (collab.etape_id) {
      if (collab.section === 'hebergement' && collab.etape_id === 'hebergement') {
        const heberg = circuit.hebergement as any;
        if (heberg?.inclus && heberg?.etape) {
          await this.repo.update({ id: circuit.id }, {
            hebergement: { ...heberg, etape: { ...heberg.etape, collab_contribution: null } },
          } as any);
        }
      } else {
        const clearedEtapes = ((circuit.etapes as any[]) ?? []).map((e: any) => {
          if (e.id !== collab.etape_id) return e;
          const { collab_contribution, ...rest } = e;
          return rest;
        });
        await this.repo.update({ id: circuit.id }, { etapes: clearedEtapes } as any);
      }
    }

    // Re-vérifier si les collabs restants sont tous complétés
    await this.checkAndMarkReadyToPublish(circuit.id).catch(() => {});

    await this.notifService.create(kickedUserId, 'collab_kicked', {
      collab_id: collabId,
      circuit_id: circuit.id,
      circuit_title: circuit.title,
      section: collab.section,
      message: `Vous avez été retiré de la collaboration pour la section « ${collab.section} » du circuit « ${circuit.title} » par son propriétaire.`,
    });
  }

  /** Appelé par le prestataire lors de la modification de l'horaire d'une étape collab.
   *  Met à jour le créneau agenda du guide et envoie les notifications appropriées.
   *  Retourne { hasConflict: boolean } pour informer le prestataire. */
  async syncEtapeSchedule(
    ownerId: string,
    collabId: string,
    newHeureDebut: string,
    newHeureFin: string,
  ): Promise<{ hasConflict: boolean }> {
    const collab = await this.collabRepo.findOne({ where: { id: collabId } });
    if (!collab) throw new NotFoundException('Invitation circuit introuvable');

    const circuit = await this.repo.findOne({ where: { id: collab.circuit_id } });
    if (!circuit || circuit.provider_id !== ownerId) throw new NotFoundException('Circuit introuvable ou accès non autorisé');

    const etape = this.getEtape(circuit, collab.etape_id);
    if (!etape) return { hasConflict: false };

    const jour = etape.jour;
    const newDerivedSlot = deriveEtapeAvailFromCircuitAvail(
      circuit.availability as SlotLike,
      { jour, heure_debut: newHeureDebut, heure_fin: newHeureFin },
      circuit.nb_jours,
    );

    if (!newDerivedSlot?.type) return { hasConflict: false };

    const label = this.collabAgendaLabel(circuit.title, collab.section, jour);
    const guideId = collab.invited_user_id;
    const hasDoneSlot = ['accepted', 'completed'].includes(collab.status);

    const allGuideSlots = await this.availRepo.find({ where: { guide_id: guideId } });
    const otherSlots = allGuideSlots.filter((s) => (s as any).label !== label);

    let hasConflict = false;
    let conflictInfo: { label: string; days: string[] } | null = null;
    for (const slot of otherSlots) {
      const days = overlappingDays(newDerivedSlot, slot as SlotLike);
      if (days.length > 0) {
        hasConflict = true;
        conflictInfo = { label: (slot as any).label ?? slot.type, days };
        break;
      }
    }

    // Mettre à jour le créneau agenda si le guide a accepté
    if (hasDoneSlot) {
      const existingSlots = allGuideSlots.filter((s) => (s as any).label === label);
      if (existingSlots.length) await this.availRepo.remove(existingSlots);
      await this.availRepo.save(this.availRepo.create({
        guide_id: guideId,
        type: toSlotType(newDerivedSlot.type),
        dates: newDerivedSlot.dates ?? null,
        start_date: newDerivedSlot.start_date ?? null,
        end_date: newDerivedSlot.end_date ?? null,
        days_of_week: newDerivedSlot.days_of_week ?? null,
        label,
        time_slots: newDerivedSlot.time_slots ?? null,
      }));
    }

    // Notifications
    if (conflictInfo) {
      // Conflit détecté → remplacer l'éventuelle notif "changed" par une notif "conflict"
      await this.notifService.deleteForCircuit(guideId, 'circuit_schedule_changed', circuit.id);
      await this.notifService.replaceForCircuit(guideId, 'circuit_schedule_conflict', circuit.id, {
        circuit_id: circuit.id,
        circuit_title: circuit.title,
        collab_id: collabId,
        section: collab.section,
        conflict_slot: conflictInfo.label,
        conflict_days: conflictInfo.days,
        message: `L'horaire de votre section « ${collab.section} » dans le circuit « ${circuit.title} » a été modifié et crée un conflit avec votre créneau « ${conflictInfo.label} » (${conflictInfo.days.slice(0, 2).join(', ')}…).`,
      });
    } else {
      // Pas de conflit → supprimer toute notification de conflit stale
      await this.notifService.deleteForCircuit(guideId, 'circuit_schedule_conflict', circuit.id);
      if (hasDoneSlot) {
        await this.notifService.replaceForCircuit(guideId, 'circuit_schedule_changed', circuit.id, {
          circuit_id: circuit.id,
          circuit_title: circuit.title,
          collab_id: collabId,
          section: collab.section,
          new_heure_debut: newHeureDebut,
          new_heure_fin: newHeureFin,
          message: `L'horaire de votre section « ${collab.section} » dans le circuit « ${circuit.title} » a été modifié : ${newHeureDebut}–${newHeureFin}.`,
        });
      }
    }

    return { hasConflict };
  }

  /**
   * Vérifie si les étapes "self" d'un guide (qu'il guide lui-même) entrent en conflit
   * avec ses créneaux agenda personnels (hors créneaux [Collab] et [Offre]).
   */
  async validateGuideEtapes(
    guideId: string,
    availability: SlotLike,
    nbJours: number,
    etapes: Array<{ jour: number; heure_debut: string; heure_fin: string }>,
  ): Promise<{ conflicts: Array<{ jour: number; conflictSlot: string; conflictDays: string[] }> }> {
    const allGuideSlots = await this.availRepo.find({ where: { guide_id: guideId } });
    // Garder uniquement les créneaux personnels (pas les créneaux de collaboration ou d'offre)
    const personalSlots = allGuideSlots.filter(
      (s) => !((s as any).label?.startsWith('[Collab]') || (s as any).label?.startsWith('[Offre]')),
    );

    const conflicts: Array<{ jour: number; conflictSlot: string; conflictDays: string[] }> = [];

    for (const etape of etapes) {
      const derivedSlot = deriveEtapeAvailFromCircuitAvail(
        availability,
        { jour: etape.jour, heure_debut: etape.heure_debut, heure_fin: etape.heure_fin },
        nbJours,
      );
      if (!derivedSlot?.type) continue;

      for (const ps of personalSlots) {
        const days = overlappingDays(derivedSlot, ps as SlotLike);
        if (days.length > 0) {
          conflicts.push({
            jour: etape.jour,
            conflictSlot: (ps as any).label ?? ps.type,
            conflictDays: days,
          });
          break;
        }
      }
    }

    return { conflicts };
  }

  /** Re-évalue toutes les notifications circuit_schedule_conflict du guide.
   *  Si le conflit ne subsiste plus (le créneau personnel ne chevauche plus l'étape),
   *  la notification est supprimée automatiquement.
   *  Appelé après chaque modification de dispo personnelle du guide. */
  async syncCircuitConflictNotifications(guideId: string): Promise<void> {
    const collabs = await this.collabRepo.find({ where: { invited_user_id: guideId } });
    const activeCollabs = collabs.filter((c) => c.status !== 'declined');
    if (!activeCollabs.length) return;

    const allGuideSlots = await this.availRepo.find({ where: { guide_id: guideId } });
    const personalSlots = allGuideSlots.filter(
      (s) => !((s as any).label?.startsWith('[Collab]') || (s as any).label?.startsWith('[Offre]')),
    );

    for (const collab of activeCollabs) {
      const circuit = await this.repo.findOne({ where: { id: collab.circuit_id } });
      if (!circuit) {
        await this.notifService.deleteForCircuit(guideId, 'circuit_schedule_conflict', collab.circuit_id).catch(() => {});
        continue;
      }
      const etape = this.getEtape(circuit, collab.etape_id);
      if (!etape) continue;

      const derivedSlot = deriveEtapeAvailFromCircuitAvail(
        circuit.availability as SlotLike,
        { jour: etape.jour, heure_debut: etape.heure_debut ?? null, heure_fin: etape.heure_fin ?? null },
        circuit.nb_jours,
      );
      if (!derivedSlot?.type) {
        await this.notifService.deleteForCircuit(guideId, 'circuit_schedule_conflict', circuit.id).catch(() => {});
        continue;
      }

      let hasConflict = false;
      for (const ps of personalSlots) {
        if (overlappingDays(derivedSlot, ps as SlotLike).length > 0) {
          hasConflict = true;
          break;
        }
      }
      if (!hasConflict) {
        await this.notifService.deleteForCircuit(guideId, 'circuit_schedule_conflict', circuit.id).catch(() => {});
      }
    }
  }

  async dismissCircuitCollab(userId: string, collabId: string): Promise<void> {
    let collab = await this.collabRepo.findOne({ where: { id: collabId, invited_user_id: userId } });
    let isOwner = false;
    if (!collab) {
      collab = await this.collabRepo.findOne({ where: { id: collabId } });
      if (!collab) throw new NotFoundException('Invitation circuit introuvable');
      const circuit = await this.repo.findOne({ where: { id: collab.circuit_id, provider_id: userId } });
      if (!circuit) throw new NotFoundException('Accès non autorisé');
      isOwner = true;
    }

    const circuit = await this.repo.findOne({ where: { id: collab.circuit_id } });
    // Bloquer seulement les collabs actives sur un circuit publié — les declined peuvent toujours être supprimées
    if (circuit?.status === 'approved' && ['accepted', 'completed'].includes(collab.status)) {
      throw new BadRequestException('Ce circuit est publié. Les collaborations actives ne peuvent plus être modifiées.');
    }

    if (['accepted', 'completed'].includes(collab.status)) {
      const etape = circuit ? this.getEtape(circuit, collab.etape_id) : null;
      const label = this.collabAgendaLabel(circuit?.title ?? '', collab.section, etape?.jour ?? -1);
      const slots = await this.availRepo.find({ where: { guide_id: collab.invited_user_id, label } });
      if (slots.length) await this.availRepo.remove(slots);

      if (circuit && ['attente_publication'].includes(circuit.status)) {
        await this.repo.update({ id: circuit.id }, { status: 'draft' } as any);
      }
    }

    if (!isOwner && !['pending', 'declined'].includes(collab.status)) {
      throw new BadRequestException('Utilisez /withdraw pour quitter une collaboration acceptée');
    }

    await this.collabRepo.delete({ id: collabId });
  }

  async findMyCircuitCollaborations(userId: string) {
    const collabs = await this.collabRepo.find({
      where: { invited_user_id: userId },
      order: { created_at: 'DESC' } as any,
    });

    return Promise.all(
      collabs.map(async (c) => {
        const circuit = await this.repo.findOne({ where: { id: c.circuit_id } });
        const contribData = (c.contribution_data ?? {}) as Record<string, any>;
        const isDeleted = contribData.circuit_deleted === true;
        const isKicked = contribData.kicked === true;
        const isGuideQuit = contribData.guide_quit === true;
        let circuitStatus: string;
        if (isDeleted) circuitStatus = 'circuit_deleted';
        else if (isKicked) circuitStatus = 'collab_kicked';
        else if (isGuideQuit) circuitStatus = 'collab_quit';
        else circuitStatus = circuit?.status ?? 'draft';

        // Retrouver l'étape spécifique pour afficher ses détails au collaborateur
        const etapes: any[] = (circuit?.etapes as any[]) ?? [];
        const etape = c.etape_id
          ? etapes.find((e: any) => e.id === c.etape_id) ?? null
          : null;

        // Résumé des 3 premières étapes pour la card de collab
        const etapesPreview = etapes.slice(0, 3).map((e: any) => ({
          jour: e.jour ?? null,
          titre: e.titre || null,
          destination: e.destination || null,
          categorie: e.categorie ?? null,
          subtypes: Array.isArray(e.subtypes) ? e.subtypes : [],
          etape_mode: e.etape_mode ?? null,
          expertises: Array.isArray(e.fields?.expertises) ? e.fields.expertises : [],
          heure_debut: e.heure_debut ?? null,
          heure_fin: e.heure_fin ?? null,
        }));

        // Catégories uniques du circuit pour afficher les badges
        const circuitCategories: string[] = [...new Set(
          etapes.map((e: any) => e.categorie).filter(Boolean)
        )] as string[];

        return {
          ...c,
          source_type: 'circuit' as const,
          circuit_title: circuit?.title ?? contribData.circuit_title ?? 'Circuit supprimé',
          circuit_cover: circuit?.cover_image ?? null,
          circuit_status: circuitStatus,
          circuit_nb_jours: circuit?.nb_jours ?? null,
          circuit_description: circuit?.description ?? null,
          circuit_nb_etapes: etapes.length,
          circuit_etapes_preview: etapesPreview,
          circuit_categories: circuitCategories,
          owner_id: c.owner_id,
          circuit_owner_type: circuit?.owner_type ?? null,
          // Détails de l'étape concernée
          etape_jour: etape?.jour ?? null,
          etape_destination: etape?.destination ?? null,
          etape_titre: etape?.titre ?? null,
          etape_heure_debut: etape?.heure_debut ?? null,
          etape_heure_fin: etape?.heure_fin ?? null,
          etape_subtypes: etape?.subtypes ?? [],
          etape_description_courte: etape?.description_courte ?? null,
        };
      }),
    );
  }

  async getCircuitCollabStatus(userId: string, collabId: string) {
    const collab = await this.collabRepo.findOne({ where: { id: collabId, invited_user_id: userId } });
    if (!collab) throw new NotFoundException('Invitation circuit introuvable');
    return {
      status: collab.status,
      section: collab.section,
      contribution_data: collab.contribution_data ?? null,
    };
  }

  async getCircuitCollabBySlotLabel(userId: string, slotLabel: string): Promise<CircuitCollaboration | null> {
    const match = slotLabel.match(/^\[Collab\]\s+(.+?)\s+—\s+(\S+)\s+J(-?\d+)$/);
    if (!match) return null;
    const circuitTitle = match[1].trim();
    const section = match[2].trim();

    const collabs = await this.collabRepo.find({ where: { invited_user_id: userId, section } });
    const active = collabs.filter((c) => ['accepted', 'completed'].includes(c.status));
    for (const c of active) {
      const circuit = await this.repo.findOne({ where: { id: c.circuit_id } });
      if (circuit?.title === circuitTitle) return c;
    }
    if (active.length === 1) return active[0];
    return null;
  }

  async findFollowingsCircuits(followingIds: string[]): Promise<any[]> {
    if (followingIds.length === 0) return [];

    const directCircuits = await this.repo.find({
      where: { provider_id: In(followingIds), status: 'approved' },
      order: { created_at: 'DESC' },
    });

    const collabs = await this.collabRepo.find({
      where: { invited_user_id: In(followingIds), status: 'accepted' },
    });
    const collabCircuitIds = [...new Set(collabs.map((c) => c.circuit_id))];

    let collabCircuits: Circuit[] = [];
    if (collabCircuitIds.length > 0) {
      collabCircuits = await this.repo.find({
        where: { id: In(collabCircuitIds), status: 'approved' },
        order: { created_at: 'DESC' },
      });
    }

    const seen = new Set<string>();
    const all: Circuit[] = [];
    for (const circuit of [...directCircuits, ...collabCircuits]) {
      if (!seen.has(circuit.id)) { seen.add(circuit.id); all.push(circuit); }
    }

    return Promise.all(
      all.map(async (circuit) => {
        let author_name: string | null = null;
        let author_photo: string | null = null;
        let org_name: string | null = null;
        let org_logo: string | null = null;

        if (circuit.owner_type === 'guide') {
          const guide = await this.guideRepo.findOne({ where: { user_id: circuit.provider_id } });
          author_name = guide?.full_name ?? null;
          author_photo = guide?.photo ?? null;
        } else {
          const provider = await this.providerRepo.findOne({ where: { user_id: circuit.provider_id } as any });
          author_name = (provider as any)?.full_name ?? null;
          author_photo = (provider as any)?.photo ?? null;
          const org = await this.orgRepo.findOne({ where: { provider_id: circuit.provider_id } as any });
          org_name = (org as any)?.name ?? null;
          org_logo = (org as any)?.logo ?? null;
        }

        return { ...circuit, author_name, author_photo, org_name, org_logo };
      }),
    );
  }

  async findAllApprovedForRecommendations(): Promise<any[]> {
    const circuits = await this.repo.find({
      where: { status: 'approved' },
      order: { created_at: 'DESC' },
    });
    if (circuits.length === 0) return [];

    const guideIds = [...new Set(circuits.filter(c => c.owner_type === 'guide').map(c => c.provider_id))];
    const providerIds = [...new Set(circuits.filter(c => c.owner_type !== 'guide').map(c => c.provider_id))];

    const [guides, providers] = await Promise.all([
      guideIds.length ? this.guideRepo.find({ where: { user_id: In(guideIds) } }) : Promise.resolve([]),
      providerIds.length ? this.providerRepo.find({ where: { user_id: In(providerIds) } as any }) : Promise.resolve([]),
    ]);

    const guideMap = new Map(guides.map(g => [g.user_id, g]));
    const providerMap = new Map(providers.map((p: any) => [p.user_id, p]));

    const providerOnlyIds = [...new Set(providerIds)];
    const orgs = providerOnlyIds.length
      ? await this.orgRepo.find({ where: { provider_id: In(providerOnlyIds) } as any })
      : [];
    const orgByProvider = new Map(orgs.map((o: any) => [o.provider_id, o]));

    return circuits.map(circuit => {
      let author_name: string | null = null;
      let author_photo: string | null = null;
      let org_name: string | null = null;
      let org_logo: string | null = null;

      if (circuit.owner_type === 'guide') {
        const g = guideMap.get(circuit.provider_id);
        author_name = g?.full_name ?? null;
        author_photo = g?.photo ?? null;
      } else {
        const p = providerMap.get(circuit.provider_id);
        author_name = (p as any)?.full_name ?? null;
        author_photo = (p as any)?.photo ?? null;
        const org = orgByProvider.get(circuit.provider_id);
        org_name = (org as any)?.name ?? null;
        org_logo = (org as any)?.logo ?? null;
      }

      return { ...circuit, author_name, author_photo, org_name, org_logo };
    });
  }
}
