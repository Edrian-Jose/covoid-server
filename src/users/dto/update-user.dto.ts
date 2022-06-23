import { User } from './../users.schema';
import { IsEmail, IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class UpdateUserDto implements User {
  @IsMongoId()
  @IsNotEmpty()
  _id: string;

  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsString()
  @IsNotEmpty()
  position?: string;

  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  password?: string;
}
