import type { NotificationCategory } from '../types';

export interface CheckoutItemPayload {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CheckoutPayload {
  id: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  items: CheckoutItemPayload[];
  source: 'pwa';
}

export interface CheckoutResponse {
  id: string;
  status: 'queued' | 'processed';
  processedAt?: string;
}

export interface CampaignEventPayload {
  campaignId: string;
  event: 'deliver' | 'open' | 'click' | 'dismiss';
  notificationId?: string;
  category?: NotificationCategory;
  path?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface InstallEventPayload {
  event: 'prompt-shown' | 'accepted' | 'dismissed' | 'fallback';
  platform?: string;
  occurredAt: string;
  reason?: string;
}

export interface PermissionEventPayload {
  status: NotificationPermission;
  action: 'request' | 'change';
  occurredAt: string;
  source?: string;
}

export interface AdminLoginResponse {
  token: string;
  expiresIn: number;
}

