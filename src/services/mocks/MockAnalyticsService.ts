import type { AnalyticsService } from '../AnalyticsService';
import type { CenterAnalytics } from '../../types';
import { mockState } from './MockState';

export class MockAnalyticsService implements AnalyticsService {
  async getSuperAdminDashboardData(): Promise<CenterAnalytics[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Generate last 7 days dates
    const last7Days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push(date);
    }

    return mockState.centers.map(center => {
      const centerSessions = mockState.sessions.filter(s => s.centerSlug === center.slug);
      const generatedToday = centerSessions.filter(s => s.startAt.startsWith(todayStr)).length;
      const generatedTotal = centerSessions.length;

      // Calculate daily history for last 7 days
      const dailyHistory = last7Days.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        return centerSessions.filter(s => s.startAt.startsWith(dateStr)).length;
      });

      // Calculate cumulative total history (running total)
      const totalHistory = last7Days.map((date, index) => {
        const dateStr = date.toISOString().split('T')[0];
        // Count all sessions created up to and including this date
        return centerSessions.filter(s => {
          const sessionDate = s.startAt.split('T')[0];
          return sessionDate <= dateStr;
        }).length;
      });

      return {
        centerSlug: center.slug,
        centerName: center.name,
        generatedToday,
        generatedTotal,
        dailyHistory,
        totalHistory
      };
    });
  }
}

