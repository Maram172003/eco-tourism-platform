import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ProviderActivity } from './entities/provider-activity.entity';
import { ActivityDetails, ActivityDetailsDocument } from './schemas/activity-details.schema';
import {
  CreateProviderActivityDto,
  CreateBulkActivitiesDto,
  UpdateProviderActivityDto,
} from './dto/provider-activity.dto';

@Injectable()
export class ProviderActivityService {
  constructor(
    @InjectRepository(ProviderActivity)
    private readonly pgRepo: Repository<ProviderActivity>,

    @InjectModel(ActivityDetails.name)
    private readonly mongoModel: Model<ActivityDetailsDocument>,
  ) {}

  // Créer une seule activité (PG + MongoDB)
  // Renvoie l'activité aplatie, au même format que findOne / findByProvider / update.
  async create(providerId: string, dto: CreateProviderActivityDto): Promise<any> {
    // 1. Sauver le core dans PostgreSQL
    const activity = this.pgRepo.create({
      provider_id: providerId,
      organization_id: dto.organization_id,
      level: dto.level,
      category: dto.category,
      subtypes: dto.subtypes ?? null,
      years_experience: dto.years_experience ?? null,
    });
    const saved = await this.pgRepo.save(activity);

    // 2. Sauver les données flexibles dans MongoDB
    const details = await this.mongoModel.create({
      activity_id: saved.id,
      organization_id: dto.organization_id,
      provider_id: providerId,
      level: dto.level,
      category: dto.category,
      fields: dto.fields ?? {},
      photos: dto.photos ?? {},
      certifications: dto.certifications ?? [],
    });

    return {
      ...saved,
      fields: details.fields ?? {},
      photos: details.photos ?? {},
      certifications: details.certifications ?? [],
    };
  }

  // Créer plusieurs activités en une fois (onboarding / edit profile) — remplace les existantes
  async createBulk(providerId: string, dto: CreateBulkActivitiesDto): Promise<any[]> {
    // Supprimer les activités existantes pour ce provider/org
    const existing = await this.pgRepo.find({ where: { provider_id: providerId, organization_id: dto.organization_id } });
    if (existing.length > 0) {
      const ids = existing.map((a) => a.id);
      await this.mongoModel.deleteMany({ activity_id: { $in: ids } });
      await this.pgRepo.remove(existing);
    }
    // Créer les nouvelles
    const results: any[] = [];
    for (const actDto of dto.activities) {
      const result = await this.create(providerId, { ...actDto, organization_id: dto.organization_id });
      results.push(result);
    }
    return results;
  }

  // Toutes les activités d'une organisation (PG + MongoDB fusionnés)
  async findByOrganization(organizationId: string): Promise<any[]> {
    const activities = await this.pgRepo.find({ where: { organization_id: organizationId } });
    const details = await this.mongoModel.find({ organization_id: organizationId });

    return activities.map((a) => {
      const d = details.find((d) => d.activity_id === a.id);
      return { ...a, fields: d?.fields ?? {}, photos: d?.photos ?? {}, certifications: d?.certifications ?? [] };
    });
  }

  // Toutes les activités d'un provider
  async findByProvider(providerId: string): Promise<any[]> {
    const activities = await this.pgRepo.find({ where: { provider_id: providerId } });
    const ids = activities.map((a) => a.id);
    const details = await this.mongoModel.find({ activity_id: { $in: ids } });

    return activities.map((a) => {
      const d = details.find((d) => d.activity_id === a.id);
      return { ...a, fields: d?.fields ?? {}, photos: d?.photos ?? {}, certifications: d?.certifications ?? [] };
    });
  }

  // Détail d'une activité
  async findOne(id: string): Promise<any> {
    const activity = await this.pgRepo.findOne({ where: { id } });
    if (!activity) throw new NotFoundException('Activité introuvable.');
    const details = await this.mongoModel.findOne({ activity_id: id });
    return { ...activity, fields: details?.fields ?? {}, photos: details?.photos ?? {}, certifications: details?.certifications ?? [] };
  }

  // Mettre à jour
  async update(id: string, providerId: string, dto: UpdateProviderActivityDto): Promise<any> {
    const activity = await this.pgRepo.findOne({ where: { id, provider_id: providerId } });
    if (!activity) throw new NotFoundException('Activité introuvable.');

    if (dto.subtypes !== undefined) activity.subtypes = dto.subtypes;
    if (dto.years_experience !== undefined) activity.years_experience = dto.years_experience;
    const saved = await this.pgRepo.save(activity);

    const details = await this.mongoModel.findOneAndUpdate(
      { activity_id: id },
      {
        ...(dto.fields !== undefined && { fields: dto.fields }),
        ...(dto.photos !== undefined && { photos: dto.photos }),
        ...(dto.certifications !== undefined && { certifications: dto.certifications }),
      },
      { new: true, upsert: true },
    );

    return { ...saved, fields: details?.fields ?? {}, photos: details?.photos ?? {}, certifications: details?.certifications ?? [] };
  }

  // Supprimer
  async remove(id: string, providerId: string): Promise<void> {
    const activity = await this.pgRepo.findOne({ where: { id, provider_id: providerId } });
    if (!activity) throw new NotFoundException('Activité introuvable.');
    await this.pgRepo.remove(activity);
    await this.mongoModel.deleteOne({ activity_id: id });
  }
}
