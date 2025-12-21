import type { User, Center, TestSession, Submission, Notification, CenterAdmin } from '../../types';

class MockState {
  users: User[] = [
    { id: '1', login: 'superadmin', role: 'SUPER_ADMIN' },
    { id: '2', login: 'lsl_admin', role: 'CENTER_ADMIN', centerSlug: 'lsl' },
  ];

  centers: Center[] = [
    { id: '1', slug: 'lsl', name: 'LSL Education Center', logoUrl: 'https://via.placeholder.com/150' },
  ];

  sessions: TestSession[] = [];
  submissions: Submission[] = [];
  notifications: Notification[] = [];
  centerAdmins: CenterAdmin[] = [
    { id: '2', email: 'lsl_admin@example.com', centerId: '1', fullName: 'LSL Admin' },
  ];
  
  notificationCallbacks: ((n: Notification) => void)[] = [];

  addNotification(n: Notification) {
    this.notifications.unshift(n);
    this.notificationCallbacks.forEach(cb => cb(n));
  }

  onNotification(cb: (n: Notification) => void) {
    this.notificationCallbacks.push(cb);
    return () => {
      this.notificationCallbacks = this.notificationCallbacks.filter(c => c !== cb);
    };
  }
}

export const mockState = new MockState();

