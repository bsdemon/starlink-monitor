import { apiGet } from "./client";

export type Device = {
  deviceId: string;
  location?: {
    lat: number;
    lon: number;
    h3CellId: number;
  } | null;
  info? :{
    subscription_id: string | null;
    kitSerialNumberId: string | null;
    dishSerialNumberId: string | null;
    routerId: string | null;
    nickname: string| null;
  }
  activeAlerts?: number[] | null;
  ipv4?: string | null;
  ipv6?: string | null;

};

type DevicesResponse = {
  devices: Device[];
};

export async function fetchDevices(): Promise<Device[]> {
  const payload = await apiGet<DevicesResponse>("/api/ut/devices");
  return payload.devices ?? [];
}