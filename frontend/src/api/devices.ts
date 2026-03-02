import { apiGet } from "./client";

export type Device = {
  deviceId: string;
  name?: string | null;
  location?: {
    lat: number;
    lon: number;
    h3CellId: number;
  } | null;
};

type DevicesResponse = {
  devices: Device[];
};

export async function fetchDevices(): Promise<Device[]> {
  const payload = await apiGet<DevicesResponse>("/api/ut/devices");
  return payload.devices ?? [];
}