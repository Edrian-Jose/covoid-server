import { User } from 'src/users/users.schema';

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
  type: 'NoMask' | 'NoSD';
  image: string[];
  score: number;
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
