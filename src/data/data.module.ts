import { StorageModule } from './../storage/storage.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DataService } from './data.service';
import { Report, ReportSchema } from './report.schema';
import { Violator, ViolatorSchema } from './violator.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Violator.name, schema: ViolatorSchema },
    ]),
    MongooseModule.forFeature([{ name: Report.name, schema: ReportSchema }]),
    StorageModule,
  ],
  providers: [DataService],
  exports: [DataService],
})
export class DataModule {}
