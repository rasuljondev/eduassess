import type { AnalyticsService, SuperAdminAnalyticsData } from '../AnalyticsService';

export class MockAnalyticsService implements AnalyticsService {
  async getSuperAdminDashboardData(): Promise<SuperAdminAnalyticsData> {
    return {
      centers: [],
      topCenter: null,
      topTest: null,
      activity: [],
    };
  }
}


