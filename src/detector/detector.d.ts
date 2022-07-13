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
