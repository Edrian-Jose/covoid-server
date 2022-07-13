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

export type Violation = 'NoMask' | 'NoSD';
export type EntityType = 'Person' | 'Face';

export interface ViolatorEntity {
  id: string;
  type: Violation;
  image: string;
  score: number;
  contact?: string[];
}

export interface DeviceMeta extends Camera {
  address: string;
  init: boolean;
  lastFrame: string;
  url: string;
}

export interface DeviceRTData {
  id: string;
  connected: string[];
  violators: {
    fmd: ViolatorEntity[];
    sdd: ViolatorEntity[];
  };
}
