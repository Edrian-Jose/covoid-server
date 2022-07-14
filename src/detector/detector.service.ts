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
    await this.sddQueue.clean(120000, 'wait');
    await this.sddQueue.clean(120000, 'wait');
    await this.sddQueue.clean(1000, 'failed');
    await this.fmdQueue.clean(1000, 'failed');
    await this.sddQueue.clean(7000, 'delayed');
    await this.fmdQueue.clean(7000, 'delayed');
    await this.sddQueue.clean(1000);
    await this.fmdQueue.clean(1000);
  }

  @Interval(500)
  async processSdd() {
    if (this.detectionState == 'UNKNOWN') {
      return;
    }
    if (this.jobs.sdd.length) {
      const jobId = this.jobs.sdd[0];
      const job = await this.sddQueue.getJob(jobId);
      if (!job) {
        this.jobs.sdd.shift();
        return;
      }
      const isCompleted = await job.isCompleted();
      if (isCompleted) {
        this.jobs.sdd.shift();
        if (job.returnvalue) {
          this.dataService.setViolatorsData(
            job.returnvalue.id,
            'NoSD',
            Object.values(job.returnvalue.violators),
            Object.keys(job.returnvalue.persons),
            job.returnvalue.meanDistance,
          );
        }
        job.remove();
      }
      if (await job.isFailed()) {
        this.jobs.sdd.shift();
        job.remove();
      }
      this.sddQueue.clean(1000, 'completed');
      const cleanedJobs = await this.sddQueue.clean(7000, 'wait');
      for (const cleanedJob of cleanedJobs) {
        const i = this.jobs.sdd.indexOf(cleanedJob.id);
        if (i > -1) {
          this.jobs.sdd.splice(i, 1);
        }
      }
    }
  }

  @Interval(1000)
  async detectSdd() {
    if (this.detectionState == 'UNKNOWN') {
      return;
    }

    for (const [id] of this.streamService.devices) {
      const meta = this.streamService.devicesMeta.get(id);
      const data = await this.streamService.fetch(id);
      if (!data) {
        continue;
      }
      const newJob = await this.sddQueue.add({
        id,
        time: new Date().getMilliseconds(),
        img: data,
        calibration: {
          focalLength: meta.focalLength,
          shoulderLength: meta.shoulderLength,
          threshold: meta.threshold,
        },
      });

      this.jobs.sdd.push(newJob.id);
    }
  }

  @Interval(500)
  async processFmd() {
    if (this.detectionState == 'UNKNOWN') {
      return;
    }

    if (this.jobs.fmd.length) {
      const jobId = this.jobs.fmd[0];
      const job = await this.fmdQueue.getJob(jobId);
      if (!job) {
        this.jobs.fmd.shift();
        return;
      }
      const isCompleted = await job.isCompleted();

      if (isCompleted) {
        this.jobs.fmd.shift();
        if (job.returnvalue) {
          this.dataService.setViolatorsData(
            job.returnvalue.id,
            'NoMask',
            Object.values(job.returnvalue.violators),
            Object.keys(job.returnvalue.faces),
          );
        }

        job.remove();
      }
      if (await job.isFailed()) {
        this.jobs.fmd.shift();
        job.remove();
      }

      this.fmdQueue.clean(1000, 'completed');
      const cleanedJobs = await this.fmdQueue.clean(7000, 'wait');
      for (const cleanedJob of cleanedJobs) {
        const i = this.jobs.fmd.indexOf(cleanedJob.id);
        if (i > -1) {
          this.jobs.fmd.splice(i, 1);
        }
      }
    }
  }

  @Interval(1000)
  async detectFmd() {
    if (this.detectionState == 'UNKNOWN') {
      return;
    }
    for (const [id] of this.streamService.devices) {
      const data = await this.streamService.fetch(id);
      if (!data) {
        continue;
      }
      const newJob = await this.fmdQueue.add({
        time: new Date().toLocaleTimeString(),
        img: data,
        id,
      });
      this.jobs.fmd.push(newJob.id);
    }
  }
}
