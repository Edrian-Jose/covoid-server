import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CountData, FactorData } from './data';

export type CountDocument = Count & Document;

@Schema({ timestamps: true })
export class Count implements CountData {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  score: number;

  @Prop({ required: true })
  label: 'SAFE' | 'LOW RISK' | 'WARNING' | 'DANGER' | 'UNKNOWN';

  @Prop({ required: true, type: [Number] })
  p2p: FactorData;

  @Prop({
    required: true,
    type: { _p2p: [Number], sdv: [Number], fmv: [Number] },
  })
  factors: { _p2p: FactorData; sdv: FactorData; fmv: FactorData };

  @Prop({ required: true })
  cameraId: string;
}

export const CountSchema = SchemaFactory.createForClass(Count);
