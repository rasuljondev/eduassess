import type { NotificationService } from '../NotificationService';
import type { Notification } from '../../types';
import { mockState } from './MockState';

export class MockNotificationService implements NotificationService {
  async getNotifications(): Promise<Notification[]> {
    return mockState.notifications;
  }

  onNotification(callback: (notification: Notification) => void): () => void {
    return mockState.onNotification(callback);
  }
}

