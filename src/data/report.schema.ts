import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Camera } from 'src/stream/camera.schema';
import { Violation } from 'src/stream/stream';
import { Violator } from './violator.schema';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  _id?: string;

  @Prop({ required: true, type: String })
  cameraId: Camera['_id'];

  @Prop({ required: true, type: String })
  type: Violation;

  @Prop({ required: true, type: [String] })
  entities: string[];

  @Prop({ required: true, type: [String] })
  violators: Violator['entityId'][];

  @Prop()
  meanDistance?: number;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
