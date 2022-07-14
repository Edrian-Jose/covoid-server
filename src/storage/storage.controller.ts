import { ViolatorEntity } from 'src/stream/stream';
import { StorageService } from './storage.service';
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GetViolatorsDto } from './dto/get-violators.dto';
import * as moment from 'moment';
import { MessageBody } from '@nestjs/websockets';

@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}
  @UseGuards(JwtAuthGuard)
  @Get('/violators/:id')
  async getViolator(@Param() params: { id: string }) {
    let violator: ViolatorEntity;
    try {
      violator = await this.storageService.getViolator(params.id);
    } catch (error) {
      throw new NotFoundException('Cannot find violator in the storage');
    }
    return violator;
  }

  @UseGuards(JwtAuthGuard)
  @Get('/violators')
  async getViolators(@MessageBody() body: GetViolatorsDto) {
    const { from, to, types, scoreRange, contactRange } = body;
    return this.storageService.getViolators(
      from,
      to,
      types,
      scoreRange,
      contactRange,
    );
  }
}
