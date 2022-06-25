import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop()
  name?: string;

  @Prop({ required: true })
  position?: string;

  @Prop({ required: true })
  email?: string;

  @Prop()
  password?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
