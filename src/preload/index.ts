import { contextBridge } from 'electron';

const api = {
  platform: process.platform,
} as const;

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
