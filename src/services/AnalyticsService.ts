import type { CenterAnalytics } from '../types';
import type { GenerationActivityItem, TopTestAnalytics } from './supabase/SupabaseAnalyticsService';

export interface SuperAdminAnalyticsData {
  centers: CenterAnalytics[];
  topCenter: CenterAnalytics | null;
  topTest: TopTestAnalytics | null;
  activity: GenerationActivityItem[];
}

export interface AnalyticsService {
  getSuperAdminDashboardData(): Promise<SuperAdminAnalyticsData>;
}

