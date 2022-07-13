import { Injectable, Logger } from '@nestjs/common';
import { JobId, Queue } from 'bull';
import { Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { DataService } from 'src/data/data.service';
import { StreamService } from 'src/stream/stream.service';
import { DetectionData, DetectionState } from './detector';
import { createEmptyDetectionData } from './detector.provider';

@Injectable()
export class DetectorService {
  public jobs: DetectionData<JobId> = createEmptyDetectionData<JobId>();

  private readonly logger = new Logger(DetectorService.name);
  private detectionState: DetectionState = 'IDLE';

  constructor(
    @InjectQueue('sdd') private sddQueue: Queue,
    @InjectQueue('fmd') private fmdQueue: Queue,
    private streamService: StreamService,
    private dataService: DataService,
  ) {}

  async cleanQueues() {
    await this.sddQueue.empty();
    await this.fmdQueue.empty();
  }
  // @Interval(1000)
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
        this.dataService.setViolatorsData(
          job.returnvalue.id,
          'NoSD',
          Object.values(job.returnvalue.violators),
          Object.keys(job.returnvalue.persons),
          job.returnvalue.meanDistance,
        );
      }
    }

    for (const [id, meta] of this.streamService.devicesMeta) {
      const data = await this.streamService.getUrl(id);
      if (!data) {
        continue;
      }
      const newJob = await this.sddQueue.add({
        id,
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

  @Interval(2000)
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
        this.dataService.setViolatorsData(
          job.returnvalue.id,
          'NoMask',
          Object.values(job.returnvalue.violators),
          Object.keys(job.returnvalue.faces),
        );
        job.remove();
      }
      if (await job.isFailed()) {
        this.jobs.fmd.shift();
        job.remove();
        this.logger.error(job.failedReason);
      }
    }
    for (const [id] of this.streamService.devicesMeta) {
      const data = await this.streamService.getUrl(id);
      if (!data) {
        continue;
      }
      const newJob = await this.fmdQueue.add({
        time: new Date().toLocaleTimeString(),
        url: data,
        id,
      });
      this.jobs.fmd.push(newJob.id);
    }
  }
}
