import type { MergeableChanges, MergeableContent } from 'tinybase';

export const SYNC_PROTOCOL_VERSION = 1;

export interface PairRequest {
  deviceName: string;
  userAgent?: string;
}

export interface PairStatusResponse {
  status: 'pending' | 'approved' | 'denied';
  requestId: string;
  token?: string;
}

export interface SnapshotResponse {
  protocolVersion: number;
  content: MergeableContent;
  serverTime: string;
}

export interface SyncPushRequest {
  protocolVersion: number;
  clientId: string;
  changes: MergeableChanges | MergeableContent;
}

export interface SyncPushResponse {
  protocolVersion: number;
  content: MergeableContent;
  serverTime: string;
}
