import {
  Controller,
  Inject,
  forwardRef,
  Body,
  Post,
  UseGuards,
  UnauthorizedException,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private userService: UsersService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('/add')
  async addUser(@Body() body: CreateUserDto, @Request() req) {
    if (req.user.position !== 'admin') {
      throw new UnauthorizedException('Not admin');
    }
    const { email, position } = await this.userService.create(body);
    return await this.authService.login({ email, position });
  }

  @Post('/update')
  async createUser(@Body() userBody: UpdateUserDto) {
    const user = await this.userService.findById(userBody._id);
    if (!user) {
      throw new NotFoundException('User is not registered');
    }

    const { email, name, position } = await this.userService.update(userBody);

    return await this.authService.login({ email, name, position });
  }
}
