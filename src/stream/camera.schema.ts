import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CameraDocument = Camera & Document;

@Schema()
export class Camera {
  _id?: string;

  @Prop({ required: true })
  urn?: string;

  @Prop()
  name?: string;

  @Prop()
  login?: string;

  @Prop()
  password?: string;

  @Prop()
  focalLength?: number;

  @Prop()
  shoulderLength?: number;

  @Prop()
  threshold?: number;

  @Prop()
  needAuth?: boolean;
}

export const CameraSchema = SchemaFactory.createForClass(Camera);
