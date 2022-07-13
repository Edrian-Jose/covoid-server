import { Report, ReportDocument } from './report.schema';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeviceMeta, Violation, ViolatorEntity } from 'src/stream/stream';
import { Violator, ViolatorDocument } from './violator.schema';
import { DetectionData } from 'src/detector/detector';
import { createEmptyDetectionData } from 'src/detector/detector.provider';
import { StorageService } from 'src/storage/storage.service';
import { AnalyticsData } from './data';
import * as moment from 'moment';

@Injectable()
export class DataService {
  constructor(
    @InjectModel(Violator.name) private violatorModel: Model<ViolatorDocument>,
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    private storageService: StorageService,
  ) {}

  private violatorsData = new Map<string, DetectionData<ViolatorEntity>>();
  private analyticsData = new Map<string, AnalyticsData>();

  async addMonitoringData(meta: DeviceMeta) {
    const id = meta._id;
    if (!this.violatorsData.has(id)) {
      this.violatorsData.set(id, createEmptyDetectionData<ViolatorEntity>());
    }
    if (!this.analyticsData.has(id)) {
      const threshold = meta.threshold || 1;
      this.analyticsData.set(id, {
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
    this.setAnalyticsData(id, type, violators, entities, meanDistance);
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
      reportedAt: moment().valueOf(),
    };
    if (meanDistance) {
      report.meanDistance = meanDistance;
    }

    const _report = new this.reportModel(report);
    report._id = _report._id;
    _report.save();
    this.storageService.storeReport(report, _violatorsIds);
  }

  async setAnalyticsData(
    id: string,
    type: Violation,
    violators: ViolatorEntity[],
    entities: string[],
    meanDistance?: number,
  ) {
    if (!this.analyticsData.has(id)) return;

    const data = this.analyticsData.get(id);
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
    this.analyticsData.set(id, data);
    console.log(data);
    return data;
  }
}
