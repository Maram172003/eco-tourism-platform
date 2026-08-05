import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TravelerPreferencesDocument = TravelerPreferences & Document;

@Schema({ collection: 'traveler_preferences', timestamps: true })
export class TravelerPreferences {
  // Référence vers PostgreSQL users.id
  @Prop({ required: true, unique: true, index: true })
  user_id!: string;

  @Prop({ type: [String], default: [] })
  interests!: string[]; // slugs taxonomie ex: ['randonnee_pedestre', 'poterie_ceramique']

  @Prop({ type: [String], default: [] })
  landscapes!: string[]; // ['montagne', 'forêt', 'désert']

  @Prop({
    type: [{ name: String, level: String }],
    default: [],
  })
  activities!: { name: string; level: string }[];

  @Prop({ type: [String], default: [] })
  objectives!: string[]; // ['réduire CO2', 'rencontrer des locaux']

  // true = mis à jour automatiquement par comportement IA
  @Prop({ default: false })
  updated_by_behavior!: boolean;
}

export const TravelerPreferencesSchema =
  SchemaFactory.createForClass(TravelerPreferences);