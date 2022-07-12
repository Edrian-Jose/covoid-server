import { User } from 'src/users/users.schema';
import { Camera } from './camera.schema';

export type Devices = Map<string, OnvifDevice>;

export interface DeviceFrames {
  [name: string]: {
    raw: string[];
    data: string[];
  };
}
export type DevicesMeta = Map<string, DeviceMeta>;

export interface ClientDevices {
  [name: string]: string[];
}

export interface ClientUser extends User {
  clientId: string;
}

export interface Violator {
  id: string;
  type: 'NoMask' | 'NoSD';
  image: string;
  score: number;
  contact?: string[];
}

export interface DeviceMeta extends Camera {
  address: string;
  init: boolean;
  lastFrame: string;
}

export interface DeviceRTData {
  id: string;
  connected: string[];
  violators: Violator[];
}
