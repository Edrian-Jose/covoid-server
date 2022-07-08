import { ClientUser } from './stream.d';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnvifDevice, Probe, startProbe } from 'node-onvif-ts';
import { Camera, CameraDocument } from './camera.schema';
import { DeviceMeta, Violator, DevicesMeta } from './stream';

@Injectable()
export class StreamService {
  constructor(
    @InjectModel(Camera.name) private cameraModel: Model<CameraDocument>,
  ) {}
  public users = new Map<string, ClientUser>();
  public devices = new Map<string, OnvifDevice>();
  public devicesMeta = new Map<string, DeviceMeta>();

  async discover(): Promise<DevicesMeta> {
    const probes: Probe[] = await startProbe();
    for (const probe of probes) {
      const odevice = new OnvifDevice({
        xaddr: probe.xaddrs[0],
      });

      let camera = await this.cameraModel.findOne({ urn: probe.urn }).exec();
      if (!camera) {
        camera = new this.cameraModel({
          urn: probe.urn,
          name: probe.name,
        });
        camera = await camera.save();
      }
      console.log(camera);
      if (camera.needAuth) {
        const { login, password } = camera;
        if (login && password) {
          odevice.setAuth(login, password);
        }
      }
      await odevice.init();
      this.devices.set(camera._id, odevice);
      const lastFrame =
        (await odevice.fetchSnapshot()).body.toString('base64') || 'none';

      if (!this.devicesMeta.has(camera._id)) {
        const meta = {
          ...camera.toObject(),
          address: odevice.address,
          connected: [],
          init: true,
          lastFrame,
          violators: new Array<Violator>(),
        };
        this.devicesMeta.set(camera._id, meta);
      }
    }
    return this.devicesMeta;
  }
}
