import { ViolatorEntity } from 'src/stream/stream';
import { StorageService } from './storage.service';
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GetViolatorsDto } from './dto/get-violators.dto';
import { MessageBody } from '@nestjs/websockets';
import { GetReportsDto } from './dto/get-reports.dto';

@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}
  @UseGuards(JwtAuthGuard)
  @Get('/violators/:id')
  async getViolator(@Param() { id }: { id: string }) {
    let violator: ViolatorEntity;
    try {
      violator = await this.storageService.getViolator(id);
    } catch (error) {
      throw new NotFoundException('Cannot find violator in the storage');
    }
    return violator;
  }

  @UseGuards(JwtAuthGuard)
  @Post('/violators')
  async getViolators(@MessageBody() body: GetViolatorsDto) {
    const { from, to, types, scoreRange, contactRange } = body;
    return await this.storageService.getViolators(
      from,
      to,
      types,
      scoreRange,
      contactRange,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/reports/:id')
  async getReport(@Param() { id }: { id: string }) {
    return await this.storageService.getReport(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/reports')
  async getReports(@MessageBody() body: GetReportsDto) {
    const { from, to, types, entitiesRange, violatorsRange } = body;
    return await this.storageService.getReports(
      from,
      to,
      types,
      entitiesRange,
      violatorsRange,
    );
  }
}
