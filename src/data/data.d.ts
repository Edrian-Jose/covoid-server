import { FactorData } from './data.d';
export type FactorData = [number, number, number];

export interface AnalyticsData {
  cameraId: string;
  name: string;
  score: number;
  label: 'SAFE' | 'LOW RISK' | 'WARNING' | 'DANGER' | 'UNKNOWN';
  p2p: FactorData;
  factors: {
    _p2p: FactorData;
    sdv: FactorData;
    fmv: FactorData;
  };
}
