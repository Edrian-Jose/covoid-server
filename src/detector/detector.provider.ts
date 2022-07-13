import { DetectionData } from './detector';

export function createEmptyDetectionData<T>(): DetectionData<T> {
  return { sdd: new Array<T>(), fmd: new Array<T>() };
}
