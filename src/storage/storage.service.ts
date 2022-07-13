import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import { Report } from 'src/data/report.schema';
import { ViolatorEntity } from 'src/stream/stream';

@Injectable()
export class StorageService {
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
