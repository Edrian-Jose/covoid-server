import { StorageModule } from './../storage/storage.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DataService } from './data.service';
import { Report, ReportSchema } from './report.schema';
import { Violator, ViolatorSchema } from './violator.schema';
import { Count, CountSchema } from './count.schema';
import { DataGateway } from './data.gateway';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Violator.name, schema: ViolatorSchema },
    ]),
    MongooseModule.forFeature([{ name: Report.name, schema: ReportSchema }]),
    MongooseModule.forFeature([{ name: Count.name, schema: CountSchema }]),
    StorageModule,
    AuthModule,
  ],
  providers: [DataService, DataGateway],
  exports: [DataService],
})
export class DataModule {}
