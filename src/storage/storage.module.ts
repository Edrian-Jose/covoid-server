import { DataModule } from 'src/data/data.module';
import { forwardRef, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Violator, ViolatorSchema } from 'src/data/violator.schema';

@Module({
  imports: [forwardRef(() => DataModule)],
  providers: [StorageService],
  exports: [StorageService],
  controllers: [StorageController],
})
export class StorageModule {}
