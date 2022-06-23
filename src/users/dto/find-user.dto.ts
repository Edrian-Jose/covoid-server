import { User } from './../users.schema';
import { IsEmail, IsMongoId, IsOptional, IsString } from 'class-validator';

export class FindUserDto implements User {
  @IsMongoId()
  @IsOptional()
  _id?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
