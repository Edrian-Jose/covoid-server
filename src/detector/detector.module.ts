import { Module } from '@nestjs/common';
import { DetectorService } from './detector.service';
import { DetectorGateway } from './detector.gateway';
import { BullModule } from '@nestjs/bull';
import { join } from 'path';
import { StreamModule } from 'src/stream/stream.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'sdd',
      processors: [join(__dirname, 'sdd.processor.js')],
    }),
    BullModule.registerQueue({
      name: 'fmd',
      processors: [join(__dirname, 'fmd.processor.js')],
    }),
    StreamModule,
  ],
  providers: [DetectorService, DetectorGateway],
})
export class DetectorModule {}
