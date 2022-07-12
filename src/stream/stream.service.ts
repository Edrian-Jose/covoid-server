import { ClientUser, DeviceRTData, Violation, Violator } from './stream.d';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnvifDevice, Probe, startProbe } from 'node-onvif-ts';
import { Camera, CameraDocument } from './camera.schema';
import { DeviceMeta, DevicesMeta } from './stream';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Server } from 'socket.io';
@Injectable()
export class StreamService {
  constructor(
    @InjectModel(Camera.name) private cameraModel: Model<CameraDocument>,
    @InjectQueue('stream') private streamQueue: Queue,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  public socket: Server;
  public users = new Map<string, ClientUser>();
  public clientsDevice = new Map<string, string>();
  public devices = new Map<string, OnvifDevice>();
  public realTimeData = new Map<string, DeviceRTData>();
  public devicesMeta = new Map<string, DeviceMeta>();

  async discover(): Promise<DevicesMeta> {
    const probes: Probe[] = await startProbe();
    for (const probe of probes) {
      const odevice = new OnvifDevice({
        xaddr: probe.xaddrs[0],
      });

      let camera = await this.cameraModel.findOne({ urn: probe.urn }).exec();
      const id = camera._id.toString();
      if (!camera) {
        camera = new this.cameraModel({
          urn: probe.urn,
          name: probe.name,
        });
        camera = await camera.save();
      }
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
      this.devices.set(id, odevice);

      const lastFrame =
        (await odevice.fetchSnapshot()).body.toString('base64') || 'none';

      if (!this.devicesMeta.has(id)) {
        const meta = {
          ...camera.toObject(),
          _id: camera._id.toString(),
          id,
          address: odevice.address,
          init: true,
          lastFrame,
          url: odevice.getUdpStreamUrl(),
        };
        this.devicesMeta.set(id, meta);
      }
    }
    return this.devicesMeta;
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
    this.realTimeData.delete(id);
    this.devicesMeta.delete(id);
    for (const [clientId, cameraId] of this.clientsDevice) {
      if (cameraId == id) {
        this.disconnect(cameraId, clientId);
      }
    }
  }

  async connect(id: string, clientId: string): Promise<DeviceRTData | null> {
    if (!this.devicesMeta.has(id)) return null;
    let data = this.realTimeData.has(id) ? this.realTimeData.get(id) : null;

    if (!data) {
      data = {
        id,
        connected: [clientId],
        violators: {
          fmd: [],
          sdd: [],
        },
      };
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
      if (!data.connected.includes(clientId)) {
        data.connected.push(clientId);
        if (this.clientsDevice.has(clientId)) {
          const oldDeviceId = this.clientsDevice.get(clientId);
          await this.disconnect(oldDeviceId, clientId);
        }
      }
    }
    this.clientsDevice.set(clientId, id);
    this.realTimeData.set(id, data);
    return this.realTimeData.get(id);
  }

  async disconnect(id: string, clientId: string): Promise<DeviceRTData | null> {
    // TODO: Add a guard decorator above
    const data = this.realTimeData.has(id) ? this.realTimeData.get(id) : null;
    if (!data) return null;
    if (data.connected.includes(clientId)) {
      const index = data.connected.indexOf(clientId, 0);
      if (index > -1) {
        data.connected.splice(index, 1);
      }
    }
    if (!data.connected.length) {
      if (this.realTimeData.has(id)) {
        this.realTimeData.delete(id);
      }

      if (this.schedulerRegistry.doesExist('interval', `stream:${id}`)) {
        this.schedulerRegistry.deleteInterval(`stream:${id}`);
      }
    } else {
      this.realTimeData.set(id, data);
    }
    this.clientsDevice.delete(clientId);
    return data;
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

  async setViolators(id: string, type: Violation, violators: Violator[]) {
    if (!this.realTimeData.has(id)) {
      return;
    }
    const data = this.realTimeData.get(id);
    const violatorProp = type == 'NoMask' ? 'fmd' : 'sdd';
    const violatorsRepo = data.violators[violatorProp];

    const oldCount = violatorsRepo.length;
    const newCount = violators.length;
    if (oldCount !== newCount) {
      // TODO: Trigger notification, saving data, storing data
    }
    data.violators[violatorProp] = violators;
    return this.realTimeData.get(id);
  }
}
