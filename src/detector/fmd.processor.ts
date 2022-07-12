import { DoneCallback, Job } from 'bull';

export default function (job: Job, cb: DoneCallback) {
  cb(null, job.id);
}
