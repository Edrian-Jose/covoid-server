import { ClientUser, DeviceRTData } from './stream.d';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnvifDevice, Probe, startProbe } from 'node-onvif-ts';
import { Camera, CameraDocument } from './camera.schema';
import { DeviceMeta, DevicesMeta } from './stream';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { SchedulerRegistry } from '@nestjs/schedule';
import { WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@Injectable()
export class StreamService {
  constructor(
    @InjectModel(Camera.name) private cameraModel: Model<CameraDocument>,
    @InjectQueue('stream') private streamQueue: Queue,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  @WebSocketServer() server: Server;

  public users = new Map<string, ClientUser>();
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
      await odevice.init();
      this.devices.set(camera._id, odevice);
      const lastFrame =
        (await odevice.fetchSnapshot()).body.toString('base64') || 'none';

      if (!this.devicesMeta.has(camera._id)) {
        const meta = {
          ...camera.toObject(),
          address: odevice.address,
          init: true,
          lastFrame,
        };
        this.devicesMeta.set(camera._id, meta);
      }
    }
    return this.devicesMeta;
  }

  async connect(id: string, clientId: string): Promise<DeviceRTData | null> {
    // TODO: Add a guard decorator above
    if (!this.devicesMeta.has(id)) return null;
    let data = this.realTimeData.has(id) ? this.realTimeData.get(id) : null;

    if (!data) {
      data = {
        id,
        connected: [clientId],
        violators: [],
      };
      // Broadcast stream every 33ms(30fps) to the clients
      const interval = setInterval(this.broadcastStream, 33);
      this.schedulerRegistry.addInterval(`stream:${id}`, interval);
    } else {
      // If client is not on the list of connected clients
      if (!data.connected.includes(clientId)) {
        data.connected.push(clientId);
      }
    }
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
      this.schedulerRegistry.deleteInterval(`stream:${id}`);
    }
    this.realTimeData.set(id, data);
    return data;
  }

  async fetch(id: string): Promise<string | null> {
    if (!this.devices.has(id)) return null;
    const device = this.devices.get(id);
    const snapshot = await device.fetchSnapshot();
    return snapshot.body.toString('base64');
  }

  async broadcastStream(id: string) {
    const frame = await this.fetch(id);
    if (frame) {
      this.server.to(id).emit('streamFrame', frame);
    }
  }
}
