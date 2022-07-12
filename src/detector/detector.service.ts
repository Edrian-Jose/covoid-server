import { Injectable, Logger } from '@nestjs/common';
import Bull, { Queue } from 'bull';
import { Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { StreamService } from 'src/stream/stream.service';

export type DetectionState = 'UNKNOWN' | 'READY' | 'IDLE' | 'ACTIVE';

export interface Jobs {
  sdd: Bull.JobId[];
  fmd: Bull.JobId[];
}
@Injectable()
export class DetectorService {
  public jobs: Jobs = {
    sdd: [],
    fmd: [],
  };

  private readonly logger = new Logger(DetectorService.name);

  private detectionState: DetectionState = 'IDLE';

  constructor(
    @InjectQueue('sdd') private sddQueue: Queue,
    @InjectQueue('fmd') private fmdQueue: Queue,
    private streamService: StreamService,
  ) {}

  @Interval(1000)
  async detectSdd() {
    if (this.detectionState == 'UNKNOWN') {
      return;
    }
    if (this.jobs.sdd.length) {
      const jobId = this.jobs.sdd[0];
      const job = await this.sddQueue.getJob(jobId);
      if (!job) {
        return;
      }
      const isCompleted = await job.isCompleted();
      if (isCompleted) {
        this.jobs.sdd.shift();
        this.logger.log(job.returnvalue);
      }
    }

    for (const [id, meta] of this.streamService.devicesMeta) {
      const data = await this.streamService.getUrl(id);
      if (!data) {
        continue;
      }
      const newJob = await this.sddQueue.add({
        time: new Date().getMilliseconds(),
        url: data,
        calibration: {
          focalLength: meta.focalLength,
          shoulderLength: meta.shoulderLength,
          threshold: meta.threshold,
        },
      });

      this.jobs.sdd.push(newJob.id);
    }
  }

  // @Interval(1000)
  async detectFmd() {
    if (this.detectionState == 'UNKNOWN') {
      return;
    }

    if (this.jobs.fmd.length) {
      const jobId = this.jobs.fmd[0];
      const job = await this.fmdQueue.getJob(jobId);
      if (!job) {
        return;
      }
      const isCompleted = await job.isCompleted();
      if (isCompleted) {
        this.jobs.fmd.shift();
        this.logger.log(job.returnvalue);
      }

      for (const [id, meta] of this.streamService.devicesMeta) {
        const frameImg = await this.streamService.fetch(id);
        if (!frameImg) {
          continue;
        }
        const newJob = await this.sddQueue.add({
          time: new Date().getMilliseconds(),
          img: frameImg,
          calibration: {
            focalLength: meta.focalLength,
            shoulderLength: meta.shoulderLength,
            threshold: meta.threshold,
          },
        });
        this.jobs.sdd.push(newJob.id);
      }
    }
  }
}
