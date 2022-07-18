import { Violation, ViolatorEntity } from 'src/stream/stream';

export type DetectionState = 'UNKNOWN' | 'READY' | 'IDLE' | 'ACTIVE';

export interface DetectedPerson {
  id: string;
  bbox: number[];
  contact: string[];
}
export interface DetectedFace {
  id: string;
  label: 'Mask' | 'No Mask';
  bbox: number[];
}

export interface DetectionData<T> {
  sdd: Array<T>;
  fmd: Array<T>;
}

export interface DetectionSingleResult {
  id: string;
  type: Violation;
  image: string;
  time: number;
  violators: {
    [id: string]: ViolatorEntity;
  };
  meanDistance?: number;
  faces?: {
    [id: string]: DetectedFace;
  };
  persons?: {
    [id: string]: DetectedPerson;
  };
}

export interface DetectionResultData {
  sdd?: DetectionSingleResult;
  fmd?: DetectionSingleResult;
  d?: DetectionSingleResult;
}
