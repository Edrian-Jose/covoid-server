import { ClientUser } from './stream.d';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  OnvifDevice,
  OnvifDeviceConfigs,
  Probe,
  startProbe,
} from 'node-onvif-ts';
import { Camera, CameraDocument } from './camera.schema';
import { DeviceMeta, DevicesMeta } from './stream';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Interval, SchedulerRegistry } from '@nestjs/schedule';
import { Server } from 'socket.io';
import { DataService } from 'src/data/data.service';
@Injectable()
export class StreamService {
  constructor(
    @InjectModel(Camera.name) private cameraModel: Model<CameraDocument>,
    @InjectQueue('stream') private streamQueue: Queue,
    private schedulerRegistry: SchedulerRegistry,
    private dataService: DataService,
  ) {}

  public socket: Server;
  public users = new Map<string, ClientUser>();
  public clientsDevice = new Map<string, string>();
  public devices = new Map<string, OnvifDevice>();
  public deviceWathers = new Map<string, string[]>();
  public devicesMeta = new Map<string, DeviceMeta>();
  private readonly logger = new Logger(StreamService.name);

  @Interval(60000)
  async rediscover() {
    await this.discover();
    this.logger.log(`${this.devices.size} DEVICES(S) ARE CONNNECTED`);
    this.logger.log(`${this.users.size} USER(S) ARE CONNNECTED`);
  }

  async discover(): Promise<DevicesMeta> {
    const probes: Probe[] = await startProbe();
    for (const probe of probes) {
      let camera = await this.cameraModel.findOne({ urn: probe.urn }).exec();
      const id = camera._id.toString();
      if (!camera) {
        camera = new this.cameraModel({
          urn: probe.urn,
          name: probe.name,
        });
        camera = await camera.save();
      }
      const deviceConfig: OnvifDeviceConfigs = {
        xaddr: probe.xaddrs[0],
      };
      if (camera.needAuth) {
        const { login, password } = camera;
        if (login && password) {
          deviceConfig.user = login;
          deviceConfig.pass = password;
        }
      }
      const odevice = new OnvifDevice(deviceConfig);

      if (camera.needAuth) {
        const { login, password } = camera;
        if (login && password) {
          odevice.setAuth(login, password);
        }
      }

      if (this.devices.has(id)) {
        continue;
      }
      await odevice.init();
      let lastFrame = 'none';
      const url = odevice.getUdpStreamUrl();
      let hasError = false;

      try {
        lastFrame = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject('Took too long to respond');
          }, 5000);

          odevice
            .fetchSnapshot()
            .then((snap) => {
              clearTimeout(timeout);
              resolve(snap.body.toString('base64'));
            })
            .catch((error) => {
              reject(error);
            });
        });
      } catch (error) {
        hasError = true;
        this.logger.error(error);
      } finally {
        if (!hasError) {
          this.devices.set(id, odevice);
        }
      }

      if (!this.devicesMeta.has(id)) {
        const meta = {
          ...camera.toObject(),
          _id: camera._id.toString(),
          address: odevice.address,
          init: true,
          lastFrame,
          url,
          xaddr: probe.xaddrs[0],
        };
        this.devicesMeta.set(id, meta);
      }
      this.dataService.addMonitoringData(this.devicesMeta.get(id));
    }

    return this.devicesMeta;
  }

  async calibrate(
    id: string,
    focalLength: number,
    shoulderLength: number,
    threshold: number,
  ) {
    const camera = await this.cameraModel.findById(id).exec();
    if (!camera) return;
    camera.focalLength = focalLength;
    camera.shoulderLength = shoulderLength;
    camera.threshold = threshold;
    return await camera.save();
  }

  async auth(id: string, login: string, password: string) {
    if (!this.devicesMeta.has(id)) return;

    const camera = await this.cameraModel.findById(id).exec();
    if (!camera) return;
    camera.needAuth = true;
    camera.login = login;
    camera.password = password;

    if (this.devices.has(id)) {
      this.devices.get(id).setAuth(login, password);
    } else {
      this.devices.set(
        id,
        new OnvifDevice({
          xaddr: this.devicesMeta.get(id).xaddr,
        }),
      );
      this.devices.get(id).setAuth(login, password);
      this.devices.get(id).init();
      console.log(this.devices.get(id).getUdpStreamUrl());
    }

    return await camera.save();
  }

  async refresh() {
    for (const [id, device] of this.devices) {
      try {
        await device.fetchSnapshot();
      } catch (error) {
        this.remove(id);
      }
    }

    await this.discover();
  }

  async check(id: string) {
    try {
      const device = this.devices.get(id);
      return await device.fetchSnapshot();
    } catch (error) {
      return false;
    }
  }

  async remove(id: string) {
    this.devices.delete(id);
    this.deviceWathers.delete(id);
    this.devicesMeta.delete(id);
    for (const [clientId, cameraId] of this.clientsDevice) {
      if (cameraId == id) {
        this.disconnect(cameraId, clientId);
      }
    }
  }

  async connect(id: string, clientId: string): Promise<DeviceMeta | null> {
    if (!this.devices.has(id)) return null;
    let data = this.deviceWathers.has(id) ? this.deviceWathers.get(id) : null;

    if (!data) {
      data = [clientId];
      // Broadcast stream every 33ms(30fps) to the clients

      const interval = setInterval(async () => {
        const broadcasted = await this.broadcastStream(
          id,
          this.devices,
          this.socket,
        );
        if (!broadcasted) {
          if (this.devices.has(id)) {
            this.remove(id);
          }
          if (this.schedulerRegistry.doesExist('interval', `stream:${id}`)) {
            this.schedulerRegistry.deleteInterval(`stream:${id}`);
          }
          clearInterval(interval);
          this.socket.to(id).emit('stream:notif', {
            message: 'Camera has been disconnected to the server.',
            type: 'error',
          });
        }
      }, 33);
      this.schedulerRegistry.addInterval(`stream:${id}`, interval);
    } else {
      // If client is not on the list of connected clients
      if (!data.includes(clientId)) {
        data.push(clientId);
        if (this.clientsDevice.has(clientId)) {
          const oldDeviceId = this.clientsDevice.get(clientId);
          await this.disconnect(oldDeviceId, clientId);
        }
      }
    }
    this.clientsDevice.set(clientId, id);
    this.deviceWathers.set(id, data);
    return this.devicesMeta.get(id);
  }

  async disconnect(id: string, clientId: string): Promise<DeviceMeta | null> {
    const data = this.deviceWathers.has(id) ? this.deviceWathers.get(id) : null;
    if (!data) return null;
    if (data.includes(clientId)) {
      const index = data.indexOf(clientId, 0);
      if (index > -1) {
        data.splice(index, 1);
      }
    }
    if (!data.length) {
      if (this.deviceWathers.has(id)) {
        this.deviceWathers.delete(id);
      }

      if (this.schedulerRegistry.doesExist('interval', `stream:${id}`)) {
        this.schedulerRegistry.deleteInterval(`stream:${id}`);
      }
    } else {
      this.deviceWathers.set(id, data);
    }
    this.clientsDevice.delete(clientId);
    return this.devicesMeta.get(id);
  }

  async fetch(id: string): Promise<string | null> {
    if (!this.devices.has(id)) return null;
    const device = this.devices.get(id);
    try {
      const snapshot = await device.fetchSnapshot();
      return snapshot.body.toString('base64');
    } catch (error) {
      this.remove(id);
    }
    return null;
  }

  async getUrl(id: string): Promise<string | null> {
    if (this.devicesMeta.has(id)) {
      return this.devicesMeta.get(id).url;
    }
    if (!this.devices.has(id)) return null;
    const device = this.devices.get(id);
    try {
      await device.fetchSnapshot();
      return device.getUdpStreamUrl();
    } catch (error) {
      this.remove(id);
    }
    return null;
  }

  async broadcastStream(
    id: string,
    devices: Map<string, OnvifDevice>,
    server: Server,
  ) {
    if (!devices.has(id)) return null;
    const device = devices.get(id);
    try {
      const snapshot = await device.fetchSnapshot();
      const frame = snapshot.body.toString('base64');
      if (frame) {
        server.to(id).emit('stream:frame', frame);
      }
      return true;
    } catch (error) {
      return false;
    }
  }
}
