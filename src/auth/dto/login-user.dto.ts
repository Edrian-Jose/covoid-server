import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { User } from 'src/users/users.schema';

export class LoginUserDto implements User {
  @IsString()
  @IsNotEmpty()
  password?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
