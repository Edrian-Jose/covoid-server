import { User } from './../users/users.schema';
import { JwtService } from '@nestjs/jwt';
import {
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
    isAdmin = false,
  ): Promise<any> {
    const user: User = await this.userService.find({ email })[0];
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      if (isAdmin && user.position !== 'admin') {
        return null;
      }
      return {
        email: user.email,
        password: user.name,
        position: user.position,
      };
    }
    return null;
  }

  async login(user: any) {
    return {
      token: this.jwtService.sign(user),
      user,
    };
  }
}
