import { get, put, del } from "./client";

export interface SettingValue {
  key: string;
  value: string | null;
  isSet?: boolean;
}

export async function getSetting(key: string): Promise<SettingValue> {
  return get<SettingValue>(`/settings/${key}`);
}

export async function setSetting(key: string, value: string): Promise<void> {
  await put(`/settings/${key}`, { value });
}

export async function deleteSetting(key: string): Promise<void> {
  await del(`/settings/${key}`);
}
