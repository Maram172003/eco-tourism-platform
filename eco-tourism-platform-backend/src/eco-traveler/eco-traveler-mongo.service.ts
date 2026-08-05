import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TravelerPreferences,
  TravelerPreferencesDocument,
} from './schemas/traveler-preferences.schema';
import {
  TravelerEngagement,
  TravelerEngagementDocument,
} from './schemas/traveler-engagement.schema';

@Injectable()
export class EcoTravelerMongoService {
  constructor(
    @InjectModel(TravelerPreferences.name)
    private readonly preferencesModel: Model<TravelerPreferencesDocument>,

    @InjectModel(TravelerEngagement.name)
    private readonly engagementModel: Model<TravelerEngagementDocument>,
  ) {}

  // ─── Preferences ──────────────────────────────────────────────────────────

  async getPreferences(userId: string) {
    return await this.preferencesModel.findOne({ user_id: userId });
  }

  async upsertPreferences(userId: string, data: Partial<TravelerPreferences>) {
    return await this.preferencesModel.findOneAndUpdate(
      { user_id: userId },
      { $set: data },
      { upsert: true, new: true },
    );
  }

  async syncPreferencesFromProfile(
    userId: string,
    profile: {
      interests?: string[] | null;
      landscapes?: string[] | null;
      motivations?: string[] | null;
      sustainability_goals?: string[] | null;
    },
  ) {
    const update: Partial<TravelerPreferences> = {};

    if (profile.interests)            update.interests  = profile.interests;
    if (profile.landscapes)           update.landscapes = profile.landscapes;
    if (profile.sustainability_goals) update.objectives = profile.sustainability_goals;

    return await this.upsertPreferences(userId, update);
  }

  // ─── Engagement ───────────────────────────────────────────────────────────

  async getEngagement(userId: string) {
    return await this.engagementModel.findOne({ user_id: userId });
  }

  async initEngagement(userId: string) {
    const existing = await this.engagementModel.findOne({ user_id: userId });

    if (existing) return existing;

    return await this.engagementModel.create({
      user_id: userId,
      durability_score: 0,
      badges: [],
      feedback_given: 0,
      plans_shared: 0,
      reservations_made: 0,
    });
  }

  async updateScore(userId: string, score: number) {
    return await this.engagementModel.findOneAndUpdate(
      { user_id: userId },
      { $set: { durability_score: score } },
      { upsert: true, new: true },
    );
  }

  async hasBadge(userId: string, label: string): Promise<boolean> {
    const doc = await this.engagementModel.findOne({
      user_id: userId,
      'badges.label': label,
    });
    return !!doc;
  }

  async addBadge(userId: string, label: string) {
    // Vérifier si le badge existe déjà pour éviter les doublons
    const existing = await this.engagementModel.findOne({
      user_id: userId,
      'badges.label': label,
    });

    if (existing) return existing;

    return await this.engagementModel.findOneAndUpdate(
      { user_id: userId },
      { $push: { badges: { label, obtained_at: new Date() } } },
      { upsert: true, new: true },
    );
  }

  async incrementStat(
    userId: string,
    field: 'feedback_given' | 'plans_shared' | 'reservations_made',
  ) {
    return await this.engagementModel.findOneAndUpdate(
      { user_id: userId },
      { $inc: { [field]: 1 } },
      { upsert: true, new: true },
    );
  }
}