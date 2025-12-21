import type { Notification } from '../types';

export interface NotificationService {
  getNotifications(): Promise<Notification[]>;
  onNotification(callback: (notification: Notification) => void): () => void;
}

