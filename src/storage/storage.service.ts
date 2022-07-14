import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import { Report } from 'src/data/report.schema';
import { Violation, ViolatorEntity } from 'src/stream/stream';
import * as moment from 'moment';
import { DataService } from 'src/data/data.service';

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
      throw error;
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
    const violators: ViolatorEntity[] = [];
    for (const _violator of violatorsData) {
      const violator = await this.getViolator(_violator._id);
      if (violator) {
        violators.push(violator);
      }
    }
    return violators;
  }

  async storeReport(report: Report, _violatorIds: string[]) {
    try {
      const dir = join(__dirname, `reports`);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      report['_violators'] = _violatorIds;
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
