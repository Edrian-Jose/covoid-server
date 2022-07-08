import { Module } from '@nestjs/common';
import { DetectorService } from './detector.service';

@Module({
  providers: [DetectorService]
})
export class DetectorModule {}
