import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import { PopulatedReport, Report } from 'src/data/report.schema';
import { Violation, ViolatorEntity } from 'src/stream/stream';
import { DataService } from 'src/data/data.service';
import { Violator } from 'src/data/violator.schema';
import { Types } from 'mongoose';

@Injectable()
export class StorageService {
  constructor(
    @Inject(forwardRef(() => DataService)) private dataService: DataService,
  ) {}

  private logger = new Logger();
  async storeViolator(_id: string, violator: ViolatorEntity) {
    try {
      const dir = join(__dirname, `violators`);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      violator['_id'] = _id;
      fs.appendFileSync(join(dir, `${_id}.json`), JSON.stringify(violator), {
        flag: 'wx',
      });
    } catch (error) {
      this.logger.error(`StoringViolator - ${error}`);
    }
  }

  async getViolator(_id: string): Promise<ViolatorEntity | null> {
    try {
      const dir = join(__dirname, `violators`);
      const data = await fs.promises.readFile(join(dir, `${_id}.json`));
      return JSON.parse(data.toString());
    } catch (error) {
      return null;
    }
  }

  async getReport(_id: string): Promise<PopulatedReport | null> {
    try {
      const dir = join(__dirname, `reports`);
      const data = await fs.promises.readFile(join(dir, `${_id}.json`));
      const report: Report = JSON.parse(data.toString());
      return await this.populateReport(report);
    } catch (error) {
      return null;
    }
  }

  async getViolators(
    from: number,
    to: number,
    types: Violation[],
    scoreRange: [number, number],
    contactRange: [number, number],
  ) {
    const violatorsData = await this.dataService.getViolatorsData(
      from,
      to,
      types,
      scoreRange,
      contactRange,
    );
    return await this.transformViolator(violatorsData);
  }

  async getReports(
    from: number,
    to?: number,
    types?: Violation[],
    entitiesRange?: [number, number],
    violatorsRange?: [number, number],
  ) {
    const reportData = await this.dataService.getReportData(
      from,
      to,
      types,
      entitiesRange,
      violatorsRange,
    );
    return await Promise.all(
      reportData.map(async (report) => await this.populateReport(report)),
    );
  }

  async transformViolator(
    violators: Violator[] | ViolatorEntity[] | Types.ObjectId[] | string[],
  ) {
    const transformedViolators: ViolatorEntity[] = [];

    for (const _violator of violators) {
      const id = typeof _violator == 'object' ? _violator._id : _violator;
      const violator = await this.getViolator(id.toString());
      if (violator) {
        transformedViolators.push(violator);
      }
    }
    return transformedViolators;
  }

  async populateReport(report: Report) {
    const violators = [...report.violators] as Types.ObjectId[];
    const populatedReport: PopulatedReport = JSON.parse(JSON.stringify(report));
    populatedReport.violators = await this.transformViolator(violators);
    return populatedReport;
  }

  async storeReport(report: Report) {
    try {
      const dir = join(__dirname, `reports`);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(
        join(dir, `${report._id}.json`),
        JSON.stringify(report),
        {
          flag: 'wx',
        },
      );
    } catch (error) {
      this.logger.error(`StoringReport - ${error}`);
    }
  }
}
