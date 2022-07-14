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
  BadRequestException,
  Put,
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
    const existingUser = await this.userService.findByEmail(body.email);
    if (existingUser) {
      throw new BadRequestException('Email already added');
    }
    const { email, position } = await this.userService.create(body);
    return await this.authService.login({ email, position });
  }

  @Post('/create')
  async createUser(@Body() body: UpdateUserDto) {
    const user = await this.userService.findByEmail(body.email);
    if (!user) {
      throw new NotFoundException(
        'Emails needs to be added by the admin first',
      );
    }

    if (user.registeredAt) {
      throw new BadRequestException(`${body.email} is already registered`);
    }
    body._id = user._id;
    const { email, name, position } = await this.userService.update({
      ...body,
      registeredAt: Date.now(),
    });

    return await this.authService.login({ email, name, position });
  }

  @UseGuards(JwtAuthGuard)
  @Put('/update')
  async updateUser(@Body() userBody: UpdateUserDto, @Request() req) {
    const user = await this.userService.findById(userBody._id);
    if (!user) {
      throw new NotFoundException('User is not registered');
    }

    if (req.user.email !== user.email) {
      throw new UnauthorizedException('You cannot change other users info');
    }

    const { email, name, position } = await this.userService.update(userBody);

    return await this.authService.login({ email, name, position });
  }
}
