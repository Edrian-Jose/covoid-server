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
  connections: string[];
}

export interface Violator {
  type: 'NoMask' | 'NoSD';
  image: string[];
  score: number;
}

export interface DeviceMeta extends Camera {
  address: string;
  connected: string[];
  init: boolean;
  lastFrame: string;
  violators: Violator[];
}
