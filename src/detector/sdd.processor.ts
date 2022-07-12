import { Job, DoneCallback } from 'bull';
import * as tf from '@tensorflow/tfjs-node';
import * as CocoSsd from '@tensorflow-models/coco-ssd';
import * as cv from 'opencv4nodejs';

let model: CocoSsd.ObjectDetection;

export interface DetectedPersons {
  [name: string]: {
    id: string;
    bbox: number[];
    contact: string[];
  };
}
interface Violator {
  id: string;
  img: string;
  type: 'No Mask' | 'No Social Distance';
  contact?: string[];
}

interface Violators {
  [name: string]: Violator;
}
export default async function (job: Job, cb: DoneCallback) {
  const detectedPersons: DetectedPersons = {};
  const violators: Violators = {};
  try {
    if (!model) {
      tf.getBackend();
      model = await CocoSsd.load();
    }
  } catch (error) {
    console.log(error);
  }

  try {
    const buffer = Buffer.from(job.data.img, 'base64');
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
    const ids = Object.keys(detectedPersons);
    if (job.data.calibration) {
      const { focalLength, shoulderLength, threshold } = job.data.calibration;
      for (let i = 0; i < ids.length; i++) {
        const iKey = ids[i];
        const iPerson = detectedPersons[iKey];
        const [iPX, iPY, iPW, iPH] = iPerson.bbox;
        const iY = (focalLength * shoulderLength) / iPW;
        const iX = iPX + iPW / 2;

        for (let j = i + 1; j < ids.length; j++) {
          const jKey = ids[j];
          const jPerson = detectedPersons[jKey];
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
              detectedPersons[jKey].contact.push(iKey);
              if (!violators[jKey]) {
                violators[jKey] = {
                  id: jKey,
                  img: cv
                    .imencode(
                      '.jpg',
                      img.getRegion(new cv.Rect(jPX, jPY, jPW, jPH)),
                    )
                    .toString('base64'),
                  type: 'No Social Distance',
                  contact: [iKey],
                };
              } else {
                violators[jKey].contact.push(iKey);
              }
            }
            if (!iPerson.contact.includes(jKey)) {
              detectedPersons[iKey].contact.push(jKey);
              if (!violators[iKey]) {
                violators[iKey] = {
                  id: iKey,
                  img: cv
                    .imencode(
                      '.jpg',
                      img.getRegion(new cv.Rect(iPX, iPY, iPW, iPH)),
                    )
                    .toString('base64'),
                  type: 'No Social Distance',
                  contact: [jKey],
                };
              } else {
                violators[iKey].contact.push(jKey);
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
}
