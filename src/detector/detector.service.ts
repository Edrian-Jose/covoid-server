import { Injectable } from '@nestjs/common';
import Bull from 'bull';

@Injectable()
export class DetectorService {
  public jobs: Bull.JobId[] = [];
}
