import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GuideSkillsDocument = GuideSkills & Document;

@Schema({ collection: 'guide_skills', timestamps: true })
export class GuideSkills {
  @Prop({ required: true, index: true })
  user_id!: string;

  @Prop({ type: [String], default: [] })
  activities!: string[];

  @Prop({ type: [String], default: [] })
  landscapes!: string[];

  @Prop({
    type: [{ label: String, proof: String }],
    default: [],
  })
  certifications!: { label: string; proof: string }[];

  @Prop({ type: { name: String, proof: String }, default: null })
  assurance!: { name: string; proof: string } | null;

  @Prop({ type: Boolean, default: false })
  updated_by_behavior!: boolean;
}

export const GuideSkillsSchema = SchemaFactory.createForClass(GuideSkills);
