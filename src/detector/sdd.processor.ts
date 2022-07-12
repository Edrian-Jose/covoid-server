import { Violator } from './../stream/stream.d';
import { Job, DoneCallback } from 'bull';
import * as tf from '@tensorflow/tfjs-node';
import * as CocoSsd from '@tensorflow-models/coco-ssd';
import * as cv from 'opencv4nodejs';
import { DetectedPerson } from './detector';

let model: CocoSsd.ObjectDetection;
const capturers = new Map<string, cv.VideoCapture>();

export default async function (job: Job, cb: DoneCallback) {
  const detectedPersons = new Map<string, DetectedPerson>();
  const violators = new Map<string, Violator>();
  try {
    if (!model) {
      tf.getBackend();
      model = await CocoSsd.load();
    }
  } catch (error) {
    console.log(error);
  }

  try {
    let buffer: Buffer;

    if (job.data.img) {
      buffer = Buffer.from(job.data.img, 'base64');
    } else if (job.data.url) {
      if (!capturers.has(job.data.url)) {
        capturers.set(job.data.url, new cv.VideoCapture(job.data.url));
      }
      const vcap = capturers.get(job.data.url);
      const frame = vcap.read();
      buffer = cv.imencode('.jpg', frame);
    } else {
      cb(new Error('No image or stream url provided'), null);
    }

    const imgTensor = tf.tidy(() => tf.node.decodeImage(buffer, 3));
    const detections = await model.detect(imgTensor as tf.Tensor3D);
    imgTensor.dispose();
    if (!detections.length) {
      cb(null, null);
    }

    detections.forEach((detection, i) => {
      if (detection.class === 'person' && detection.score > 0.5) {
        const id = i.toString();
        detectedPersons[id] = {
          id,
          bbox: detection.bbox,
          contact: [],
        };
      }
    });
    const img = cv.imdecode(buffer);
    const ids = Array.from(detectedPersons.keys());
    if (job.data.calibration) {
      const { focalLength, shoulderLength, threshold } = job.data.calibration;
      for (let i = 0; i < ids.length; i++) {
        const iKey = ids[i];
        const iPerson = detectedPersons.get(iKey);
        const [iPX, iPY, iPW, iPH] = iPerson.bbox;
        const iY = (focalLength * shoulderLength) / iPW;
        const iX = iPX + iPW / 2;

        for (let j = i + 1; j < ids.length; j++) {
          const jKey = ids[j];
          const jPerson = detectedPersons.get(jKey);
          const [jPX, jPY, jPW, jPH] = jPerson.bbox;
          const jX = jPX + jPW / 2;
          const jY = (focalLength * shoulderLength) / jPW;
          const ijY = Math.abs(jY - iY);
          const ijX = Math.abs(jX - iX);
          const ijW = (iPW + jPW) / 2;
          const ppm = ijW / shoulderLength;
          const ijXm = ijX / ppm;
          const ijD = Math.sqrt(Math.pow(ijXm, 2) + Math.pow(ijY, 2));
          if (ijD < threshold) {
            if (!jPerson.contact.includes(iKey)) {
              detectedPersons.get(jKey).contact.push(iKey);
              if (!violators.has(jKey)) {
                violators.set(jKey, {
                  id: jKey,
                  image: cv
                    .imencode(
                      '.jpg',
                      img.getRegion(new cv.Rect(jPX, jPY, jPW, jPH)),
                    )
                    .toString('base64'),
                  type: 'NoSD',
                  contact: [iKey],
                  score: (threshold - ijD) / threshold,
                });
              } else {
                violators.get(jKey).contact.push(iKey);
              }
            }
            if (!iPerson.contact.includes(jKey)) {
              detectedPersons.get(iKey).contact.push(jKey);
              if (!violators.get(iKey)) {
                violators.set(iKey, {
                  id: iKey,
                  image: cv
                    .imencode(
                      '.jpg',
                      img.getRegion(new cv.Rect(iPX, iPY, iPW, iPH)),
                    )
                    .toString('base64'),
                  type: 'NoSD',
                  contact: [jKey],
                  score: (threshold - ijD) / threshold,
                });
              } else {
                violators.get(iKey).contact.push(jKey);
              }
            }
          }
        }
      }
    }

    cb(null, { persons: detectedPersons, violators });
  } catch (error) {
    console.group(error);
    cb(error, null);
  }
  // STARTUP: 3s, DETECT: 200-250ms
}