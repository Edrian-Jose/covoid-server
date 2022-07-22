import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DetectionData } from 'src/detector/detector';
import { CountData, FactorData, CountRiskLabel } from './data';

export type CountDocument = Count & Document;

@Schema({ timestamps: true })
export class Count implements CountData {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  score: number;

  @Prop({ required: true, type: Number })
  label: CountRiskLabel;

  @Prop({ required: true, type: [Number] })
  p2p: FactorData;

  @Prop({
    required: true,
    type: { _p2p: [Number], sdv: [Number], fmv: [Number] },
  })
  factors: { _p2p: FactorData; sdv: FactorData; fmv: FactorData };

  @Prop({ required: true })
  cameraId: string;

  @Prop()
  notifMessage?: string;

  @Prop({
    type: { fmd: Array<string>, sdd: Array<string> },
  })
  violators?: DetectionData<string>;
}

export const CountSchema = SchemaFactory.createForClass(Count);
