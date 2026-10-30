export interface Device {
  id: string;
  name: string;
}

export interface LgDevice {
  deviceId: string;
  deviceInfo?: { deviceType?: string; alias?: string; modelName?: string };
}

export interface TemperatureBlock {
  unit?: string;
  currentTemperature?: number;
  targetTemperature?: number;
}

export interface AcState {
  operation?: { airConOperationMode?: string };
  airConJobMode?: { currentJobMode?: string };
  temperatureInUnits?: TemperatureBlock[] | TemperatureBlock;
  temperature?: TemperatureBlock;
  airFlow?: Record<string, string | number | undefined>;
  windDirection?: { rotateUpDown?: boolean };
}

export interface ProfileValue {
  value?: { r?: unknown; w?: unknown; min?: number; max?: number; step?: number };
}

export interface AcProfile {
  property?: Record<string, unknown>;
}

export type Period = "week" | "month" | "year";

export interface UsagePoint {
  key: string | null;
  kwh: number;
}

export interface Slot {
  key: string;
  label: string;
  long: string;
  future: boolean;
}

export interface Bar extends Slot {
  kwh: number;
}

export type Command = Record<string, unknown>;
