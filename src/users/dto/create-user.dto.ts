import { User } from './../users.schema';

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto implements User {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
