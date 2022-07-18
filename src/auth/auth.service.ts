import { User } from './../users/users.schema';
import { JwtService } from '@nestjs/jwt';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private userService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
    isAdmin = false,
  ): Promise<any> {
    const user: User = (await this.userService.find({ email }, false))[0];

    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      if (isAdmin && user.position !== 'admin') {
        return null;
      }
      return {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        position: user.position,
      };
    }
    return null;
  }

  async login(user: User) {
    if (user.password) delete user.password;
    return {
      token: this.jwtService.sign(user, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '7d',
      }),
      user,
    };
  }
}
