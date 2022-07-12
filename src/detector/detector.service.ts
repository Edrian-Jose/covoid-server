import { Injectable, Logger } from '@nestjs/common';
import Bull, { Queue } from 'bull';
import * as CocoSsd from '@tensorflow-models/coco-ssd';
import * as BlazeFace from '@tensorflow-models/blazeface';
import * as tf from '@tensorflow/tfjs-node';
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
  private cocoModel: CocoSsd.ObjectDetection;
  private blazeModel: BlazeFace.BlazeFaceModel;
  private maskModel: tf.LayersModel;
  private detectionState: DetectionState = 'UNKNOWN';

  constructor(
    @InjectQueue('sdd') private sddQueue: Queue,
    private streamService: StreamService,
  ) {}

  async loadModels() {
    try {
      this.blazeModel = await BlazeFace.load();
      this.maskModel = await tf.loadLayersModel(
        `file://${__dirname}/models/mask/model.json`,
      );
      this.cocoModel = await CocoSsd.load();
      this.logger.log('Models are loaded successfully');
      this.detectionState = 'READY';
      return true;
    } catch (error) {
      this.logger.error(`Models load failed: ${error.message}`);
      this.detectionState = 'UNKNOWN';
      return error;
    }
  }

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
    const newJob = await this.sddQueue.add({
      time: new Date().getMilliseconds(),
      img: Array.from(this.streamService.devicesMeta.values())[0].lastFrame,
    });
    this.jobs.sdd.push(newJob.id);
  }
}
