import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Camera } from 'src/stream/camera.schema';
import { Violation, ViolatorEntity } from 'src/stream/stream';
import { Violator } from './violator.schema';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  _id?: Types.ObjectId;

  @Prop({ required: true, type: String })
  cameraId: Camera['_id'];

  @Prop({ required: true, type: String })
  type: Violation;

  @Prop({ required: true, type: [String] })
  entities: string[];

  @Prop({ required: true, type: [{ type: Types.ObjectId, ref: 'Violator' }] })
  violators: Violator['_id'][] | ViolatorEntity[];

  @Prop({ default: 0, required: true })
  entitiesCount: number;

  @Prop({ default: 0, required: true })
  violatorsCount: number;

  @Prop()
  meanDistance?: number;
}

export class PopulatedReport extends Report {
  violators: ViolatorEntity[];
}
export const ReportSchema = SchemaFactory.createForClass(Report);
