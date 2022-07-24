import { DoneCallback, Job } from 'bull';
import { ViolatorEntity } from 'src/stream/stream';
import { DetectedFace } from './detector';
import * as BlazeFace from '@tensorflow-models/blazeface';
import * as cv from 'opencv4nodejs';
import * as tf from '@tensorflow/tfjs-node';
// import * as faceapi from '@vladmandic/face-api';
import mongoose from 'mongoose';

let faceModel: BlazeFace.BlazeFaceModel;
// let faceModel2 = false;
let maskedFaceModel: tf.LayersModel;
const capturers = new Map<string, cv.VideoCapture>();

export default async function (job: Job, cb: DoneCallback) {
  const detectedFaces = new Map<string, DetectedFace>();
  const violators = new Map<string, ViolatorEntity>();

  try {
    if (!faceModel) {
      tf.getBackend();
      faceModel = await BlazeFace.load();
    }
    // if (!faceModel2) {
    //   tf.getBackend();
    //   await faceapi.nets.ssdMobilenetv1.loadFromUri(
    //     `http://localhost:4000/models/weights`,
    //   );
    //   faceModel2 = true;
    // }
    if (!maskedFaceModel) {
      tf.getBackend();
      maskedFaceModel = await tf.loadLayersModel(
        `file://${__dirname}/models/mask/model.json`,
      );
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
      vcap.reset();
      const frame = vcap.read();
      buffer = cv.imencode('.jpg', frame);
    } else {
      cb(new Error('No image or stream url provided'), job.data);
    }

    const blankData = {
      request: job.data.request ?? false,
      faces: {},
      violators: {},
      time: job.data.time,
      id: job.data.id,
      image: buffer.toString('base64'),
    };

    const imgTensor = tf.tidy(() => tf.node.decodeImage(buffer, 3));
    const detections = await faceModel.estimateFaces(imgTensor as tf.Tensor3D);
    // const detections = await faceapi.detectAllFaces(
    //   imgTensor as unknown as faceapi.tf.Tensor4D,
    // );

    imgTensor.dispose();

    if (!detections.length) {
      cb(null, blankData);
    }

    const img = cv.imdecode(buffer);

    detections.forEach((detection) => {
      const id = new mongoose.Types.ObjectId().toString();
      const [topX, topY] = detection.topLeft as number[];
      const [botX, botY] = detection.bottomRight as number[];
      // const [topX, topY] = [
      //   detection.box.topLeft.x,
      //   detection.box.topLeft.y,
      // ] as number[];
      // const [botX, botY] = [
      //   detection.box.bottomRight.x,
      //   detection.box.bottomRight.y,
      // ] as number[];
      const pos1 = 0 <= topX && topX <= img.cols ? topX : 0;
      const pos2 =
        topY - topY * 0.3 >= 0 && topY - topY * 0.3 <= img.rows
          ? topY - topY * 0.3
          : topY >= 0 && topY <= img.rows
          ? topY
          : 0;
      const pos3 =
        0 <= botX && botX <= img.cols ? botX - pos1 : img.cols - pos1;
      const pos4 =
        botY - pos2 + (botY - pos2) * 0.3 + botY <= img.rows &&
        0 <= botY - pos2 + (botY - pos2) * 0.3 + botY
          ? botY - pos2 + (botY - pos2) * 0.3
          : botY >= 0 && botY <= img.rows
          ? botY - pos2
          : img.rows;
      const face = img.getRegion(new cv.Rect(pos1, pos2, pos3, pos4));

      //--dispose;
      const resizedFace = face.resize(224, 224);

      const buff = cv.imencode('.jpg', resizedFace);

      //--dispose
      const result = tf.tidy(() => {
        let tensor = tf.node.decodeImage(buff);

        const offset = tf.scalar(127.5);

        tensor = tensor.sub(offset).div(offset).expandDims();
        return maskedFaceModel.predict(tensor);
      }) as tf.Tensor;

      const [mask, withoutMask] = result.dataSync();
      const label = mask > withoutMask ? 'Mask' : 'No Mask';
      detectedFaces.set(id, {
        id,
        label,
        bbox: [
          topX / img.cols,
          (topY - topY * 0.3) / img.rows,
          (botX - topX) / img.cols,
          (botY - topY + (botY - topY) * 0.5) / img.rows,
        ],
      });
      if (withoutMask >= mask && withoutMask > 0.7) {
        const violatorImg = cv.imencode('.jpg', face).toString('base64');
        violators.set(id, {
          id,
          image: violatorImg,
          score: withoutMask,
          type: 'NoMask',
        });
      }

      face.release();
      resizedFace.release();
      result.dispose();
      cb(null, {
        request: job.data.request ?? false,
        faces: Object.fromEntries(detectedFaces.entries()),
        violators: Object.fromEntries(violators.entries()),
        time: job.data.time,
        id: job.data.id,
        image: blankData.image,
      });
    });
  } catch (error) {
    console.log(error);
    cb(error, job.data);
  }
  return;
}
