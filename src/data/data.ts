export type FactorData = [number, number, number];

export enum CountRiskLabel {
  UNKNOWN,
  SAFE,
  LOW,
  MODERATE,
  HIGH,
  DANGER,
}
export interface CountData {
  cameraId: string;
  name: string;
  score: number;
  label: CountRiskLabel;
  p2p: FactorData;
  factors: {
    _p2p: FactorData;
    sdv: FactorData;
    fmv: FactorData;
  };
}
