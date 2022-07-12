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
