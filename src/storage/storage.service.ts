import { Violator, ViolatorDocument } from 'src/data/violator.schema';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import { join } from 'path';
import { Report } from 'src/data/report.schema';
import { Violation, ViolatorEntity } from 'src/stream/stream';
import { Model } from 'mongoose';
import * as moment from 'moment';

@Injectable()
export class StorageService {
  constructor(
    @InjectModel(Violator.name) private violatorModel: Model<ViolatorDocument>,
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
    to: number = moment().valueOf(),
    types: Violation[] = ['NoMask', 'NoSD'],
    scoreRange: [number, number] = [0, 1],
    contactRange: [number, number] = [0, 100],
  ) {
    return await this.violatorModel
      .find({
        created_at: {
          $gte: moment(from),
          $lte: moment(to),
        },
        type: { $in: types },
        score: {
          $gte: scoreRange[0],
          $lte: scoreRange[1],
        },
        contactSize: {
          $gte: contactRange[0],
          $lte: contactRange[1],
        },
      })
      .sort('-createdAt')
      .exec();
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
