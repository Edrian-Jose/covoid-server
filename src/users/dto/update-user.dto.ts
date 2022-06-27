import { User } from './../users.schema';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsNumber,
} from 'class-validator';

export class UpdateUserDto implements User {
  @IsMongoId()
  @IsNotEmpty()
  _id: string;

  @IsString()
  name?: string;

  @IsString()
  position?: string;

  @IsEmail()
  email?: string;

  @IsString()
  password?: string;

  @IsNumber()
  registeredAt?: number;
}
