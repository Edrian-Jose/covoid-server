import { Report, ReportDocument } from './report.schema';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Violation, ViolatorEntity } from 'src/stream/stream';
import { Violator, ViolatorDocument } from './violator.schema';
import { DetectionData } from 'src/detector/detector';
import { createEmptyDetectionData } from 'src/detector/detector.provider';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class DataService {
  constructor(
    @InjectModel(Violator.name) private violatorModel: Model<ViolatorDocument>,
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    private storageService: StorageService,
  ) {}

  private violatorsData = new Map<string, DetectionData<ViolatorEntity>>();

  async addViolatorsData(id: string) {
    if (!this.violatorsData.has(id)) {
      this.violatorsData.set(id, createEmptyDetectionData<ViolatorEntity>());
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
}
