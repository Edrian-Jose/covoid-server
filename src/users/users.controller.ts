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
  Get,
  Delete,
  Param,
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
    return await this.userService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUsers(@Request() req) {
    if (req.user.position !== 'admin') {
      throw new UnauthorizedException('Not admin');
    }
    return await this.userService.find({});
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/:id')
  async deleteUsers(@Param() params, @Request() req) {
    if (req.user.position !== 'admin') {
      throw new UnauthorizedException('Not admin');
    }

    const user = await this.userService.delete(params.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
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
    const { email, name, position, _id } = await this.userService.update({
      ...body,
      registeredAt: Date.now(),
    });

    return await this.authService.login({ email, name, position, _id });
  }

  @UseGuards(JwtAuthGuard)
  @Put('/update')
  async updateUser(@Body() userBody: UpdateUserDto, @Request() req) {
    const user = await this.userService.findByEmail(req.user.email);
    if (!user) {
      throw new NotFoundException('User is not registered');
    }
    userBody._id ||= user._id;

    const { email, name, position, _id } = await this.userService.update(
      userBody,
    );

    return await this.authService.login({ email, name, position, _id });
  }
}
