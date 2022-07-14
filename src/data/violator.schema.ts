import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Violation } from 'src/stream/stream';

export type ViolatorDocument = Violator & Document;

@Schema({ timestamps: true })
export class Violator {
  _id?: Types.ObjectId;

  @Prop({ required: true })
  entityId: string;

  @Prop({ required: true, type: String })
  type: Violation;

  @Prop({ required: true })
  score: number;

  @Prop([String])
  contact?: Violator['entityId'][];

  @Prop({ default: 0, required: true })
  contactSize: number;
}

export const ViolatorSchema = SchemaFactory.createForClass(Violator);
