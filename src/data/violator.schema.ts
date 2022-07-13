import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Violation } from 'src/stream/stream';

export type ViolatorDocument = Violator & Document;

@Schema()
export class Violator {
  _id?: string;

  @Prop({ required: true })
  entityId: string;

  @Prop({ required: true, type: String })
  type: Violation;

  @Prop({ required: true })
  score: number;

  @Prop([String])
  contact?: Violator['entityId'][];
}

export const ViolatorSchema = SchemaFactory.createForClass(Violator);
