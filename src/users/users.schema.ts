import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  _id?: string;
  @Prop()
  name?: string;

  @Prop({ required: true })
  position?: string;

  @Prop({ required: true })
  email?: string;

  @Prop()
  password?: string;

  @Prop()
  registeredAt?: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
