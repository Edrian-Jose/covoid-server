import { Report, ReportDocument } from './report.schema';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeviceMeta, Violation, ViolatorEntity } from 'src/stream/stream';
import { Violator, ViolatorDocument } from './violator.schema';
import { DetectionData } from 'src/detector/detector';
import { createEmptyDetectionData } from 'src/detector/detector.provider';
import { StorageService } from 'src/storage/storage.service';
import { CountData, FactorData } from './data';
import { Count, CountDocument } from './count.schema';
import { Cron } from '@nestjs/schedule';
import { Server } from 'socket.io';

@Injectable()
export class DataService {
  constructor(
    @InjectModel(Violator.name) private violatorModel: Model<ViolatorDocument>,
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(Count.name) private countModel: Model<CountDocument>,
    private storageService: StorageService,
  ) {}

  public violatorsData = new Map<string, DetectionData<ViolatorEntity>>();
  public countData = new Map<string, CountData>();
  public meanCountData = new Map<string, CountData>();
  public server: Server;

  @Cron('*/10 * * * *')
  async saveCountData() {
    this.server.emit('auto:data:mean', await this.getManyMeanCountData([]));
    for (const [id, count] of this.meanCountData) {
      const _count = new this.countModel(count);
      await _count.save();
      this.meanCountData.delete(id);
    }
  }

  async addMonitoringData(meta: DeviceMeta) {
    const id = meta._id;
    if (!this.violatorsData.has(id)) {
      this.violatorsData.set(id, createEmptyDetectionData<ViolatorEntity>());
    }
    if (!this.countData.has(id)) {
      const threshold = meta.threshold || 1;
      this.countData.set(id, {
        cameraId: meta._id,
        label: 'UNKNOWN',
        name: meta.name,
        p2p: [threshold, threshold, 1],
        score: 0,
        factors: {
          _p2p: [0, threshold, 0],
          fmv: [0, 0, 0],
          sdv: [0, 0, 0],
        },
      });
    }

    return this.violatorsData.get(id);
  }
  async setViolatorsData(
    id: string,
    type: Violation,
    violators: ViolatorEntity[],
    entities: string[],
    meanDistance?: number,
  ) {
    if (!this.violatorsData.has(id)) return;

    //
    const data = this.violatorsData.get(id);
    const violatorProp = type == 'NoMask' ? 'fmd' : 'sdd';
    const oldCount = data[violatorProp].length;
    const newCount = violators.length;
    data[violatorProp] = violators;

    if (oldCount == newCount) return;
    this.server.emit('auto:data:violator', this.violatorsData.get(id));
    this.setCountData(id, type, violators, entities, meanDistance);
    const violatorsIds: string[] = [];
    const _violatorsIds: string[] = [];
    for (const violator of violators) {
      const _violator = new this.violatorModel({
        entityId: violator.id,
        type: violator.type,
        score: violator.score,
        contact: violator.contact,
      });
      violatorsIds.push(_violator.entityId);
      _violatorsIds.push(_violator._id);
      _violator.save();
      this.storageService.storeViolator(_violator._id, violator);
    }
    const report: Report = {
      cameraId: id,
      entities,
      type,
      violators: violatorsIds,
    };
    if (meanDistance) {
      report.meanDistance = meanDistance;
    }

    const _report = new this.reportModel(report);
    report._id = _report._id;
    _report.save();
    this.storageService.storeReport(report, _violatorsIds);
  }

  async setCountData(
    id: string,
    type: Violation,
    violators: ViolatorEntity[],
    entities: string[],
    meanDistance?: number,
  ) {
    if (!this.countData.has(id)) return;
    const data = this.countData.get(id);
    const prop = type == 'NoMask' ? 'fmv' : 'sdv';
    data.factors[prop] = [
      violators.length,
      entities.length,
      Math.round((violators.length / entities.length + Number.EPSILON) * 100) /
        100 || 0,
    ];
    if (meanDistance) {
      data.p2p[0] = meanDistance;
      data.factors._p2p[0] = data.factors._p2p[1] - meanDistance;
      data.factors._p2p[2] =
        Math.round(
          (data.factors._p2p[0] / data.factors._p2p[1] + Number.EPSILON) * 100,
        ) / 100 || 0;
    }

    const score =
      (data.factors._p2p[2] + data.factors.sdv[2] + data.factors.fmv[2]) / 3;
    data.score = Math.round((score + Number.EPSILON) * 100) / 100 || 0;
    data.label =
      data.score > 0.5
        ? 'DANGER'
        : data.score > 0.3
        ? 'WARNING'
        : data.score > 10
        ? 'LOW RISK'
        : 'SAFE';
    this.countData.set(id, data);
    this.server.emit('auto:data:count', this.countData.get(id));
    this.setMeanCountData(id);
    return data;
  }

  async setMeanCountData(id: string) {
    if (!this.countData.has(id)) return;

    const count: CountData = JSON.parse(JSON.stringify(this.countData.get(id)));
    if (!this.meanCountData.has(id)) {
      this.meanCountData.set(id, count);
    } else {
      const meanCount: CountData = JSON.parse(
        JSON.stringify(this.meanCountData.get(id)),
      );
      for (const factor in meanCount.factors) {
        if (Object.prototype.hasOwnProperty.call(meanCount.factors, factor)) {
          const x: FactorData = meanCount.factors[factor];
          const y: FactorData = count.factors[factor];

          for (let i = 0; i < x.length; i++) {
            const ix = x[i];
            const iy = y[i];
            const mean = (ix + iy) / 2;
            meanCount.factors[factor][i] = mean;
          }
        }
      }
      meanCount.p2p[0] = (meanCount.p2p[0] + count.p2p[0]) / 2;
      meanCount.p2p[2] = (meanCount.p2p[2] + count.p2p[2]) / 2;
      meanCount.score = (meanCount.score + count.score) / 2;
      this.meanCountData.set(id, meanCount);
    }
    this.server.emit('auto:data:mean', this.countData.get(id));
    return this.meanCountData.get(id);
  }

  async getManyMeanCountData(ids: string[]): Promise<CountData | undefined> {
    const meanCount = ids.length
      ? new Map<string, CountData>()
      : this.meanCountData;

    let mean: CountData | undefined = undefined;

    if (ids.length) {
      this.meanCountData.forEach((count, id) => {
        if (ids.includes(id)) meanCount.set(id, count);
      });
    }

    meanCount.forEach((count) => {
      if (!mean) {
        mean = count;
        return;
      }
      for (const factor in count.factors) {
        if (Object.prototype.hasOwnProperty.call(count.factors, factor)) {
          const x: FactorData = count.factors[factor];

          for (let i = 0; i < x.length; i++) {
            mean.factors[factor][i] += x[i];
          }
        }
      }

      mean.p2p[0] += count.p2p[0];
      mean.p2p[1] += count.p2p[0];
      mean.p2p[2] += count.p2p[2];
      mean.score += count.score;
    });

    if (!mean) return;
    for (const factor in mean.factors) {
      if (Object.prototype.hasOwnProperty.call(mean.factors, factor)) {
        const x: FactorData = mean.factors[factor];

        for (let i = 0; i < x.length; i++) {
          mean.factors[factor][i] /= meanCount.size;
        }
      }
    }

    mean.p2p[0] /= meanCount.size;
    mean.p2p[1] /= meanCount.size;
    mean.p2p[2] /= meanCount.size;
    mean.score /= meanCount.size;
    mean.cameraId = 'N/A';
    return mean;
  }
}
