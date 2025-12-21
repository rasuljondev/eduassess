import { create } from 'zustand';
import type { Notification } from '../types';
import { notificationService } from '../services';

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  fetchNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (notification) => 
    set((state) => ({ notifications: [notification, ...state.notifications] })),
  fetchNotifications: async () => {
    const notifications = await notificationService.getNotifications();
    set({ notifications });
  },
}));

// Setup listener
notificationService.onNotification((n) => {
  useNotificationStore.getState().addNotification(n);
});

