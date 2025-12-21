import type { AnalyticsService } from '../AnalyticsService';
import type { CenterAnalytics } from '../../types';
import { supabase } from '../../lib/supabase';

export interface TopTestAnalytics {
  testName: string;
  generatedToday: number;
  generatedTotal: number;
  dailyHistory: number[];
  totalHistory: number[];
}

export interface GenerationActivityItem {
  timestamp: string; // ISO (minute bucket)
  centerSlug: string;
  centerName: string;
  testName: string;
  count: number;
}

export interface SuperAdminAnalyticsData {
  centers: CenterAnalytics[];
  topCenter: CenterAnalytics | null;
  topTest: TopTestAnalytics | null;
  activity: GenerationActivityItem[];
}

type DayKey = string; // YYYY-MM-DD

function last7DayKeys(): DayKey[] {
  const keys: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Format as YYYY-MM-DD in local time to match database date_trunc result
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    keys.push(`${year}-${month}-${day}`);
  }
  return keys;
}

function toCumulative(daily: number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const v of daily) {
    acc += v;
    out.push(acc);
  }
  return out;
}

export class SupabaseAnalyticsService implements AnalyticsService {
  async getSuperAdminDashboardData(): Promise<SuperAdminAnalyticsData> {
    const days = last7DayKeys();

    // 1) Center totals/today from existing view in mig.sql
    const { data: centerStats, error: statsErr } = await supabase
      .from('center_generation_stats')
      .select('slug, name, generated_today, generated_total');
    if (statsErr) throw new Error(statsErr.message);

    // 1b) Center taken/expired totals/today from views in mig_analytics.sql + mig_usage_events.sql
    const { data: centerTakenStats, error: takenStatsErr } = await supabase
      .from('center_taken_stats')
      .select('slug, taken_today, taken_total');
    if (takenStatsErr) throw new Error(takenStatsErr.message);

    const { data: centerExpiredStats, error: expStatsErr } = await supabase
      .from('center_expired_stats')
      .select('slug, expired_today, expired_total');
    if (expStatsErr) throw new Error(expStatsErr.message);

    const takenBySlug = new Map<string, { today: number; total: number }>();
    for (const r of centerTakenStats ?? []) {
      // We use 'login' events now to define 'Taken/Used'
      takenBySlug.set((r as any).slug, {
        today: Number((r as any).taken_today ?? 0),
        total: Number((r as any).taken_total ?? 0),
      });
    }

    const expiredBySlug = new Map<string, { today: number; total: number }>();
    for (const r of centerExpiredStats ?? []) {
      expiredBySlug.set((r as any).slug, {
        today: Number((r as any).expired_today ?? 0),
        total: Number((r as any).expired_total ?? 0),
      });
    }

    // 2) Center daily last 7 days (view from mig_analytics.sql)
    const { data: centerDaily, error: dailyErr } = await supabase
      .from('center_generation_daily_last7')
      .select('center_slug, center_name, day, generated_count');
    if (dailyErr) throw new Error(dailyErr.message);

    const centerDailyMap = new Map<string, Map<DayKey, number>>();
    for (const row of centerDaily ?? []) {
      const slug = (row as any).center_slug as string;
      const day = (row as any).day as string;
      const cnt = Number((row as any).generated_count ?? 0);
      if (!centerDailyMap.has(slug)) centerDailyMap.set(slug, new Map());
      centerDailyMap.get(slug)!.set(day, cnt);
    }

    // 2b) Taken daily last 7 days
    const { data: centerTakenDaily, error: takenDailyErr } = await supabase
      .from('center_taken_daily_last7')
      .select('center_slug, day, taken_count');
    if (takenDailyErr) throw new Error(takenDailyErr.message);

    const centerTakenDailyMap = new Map<string, Map<DayKey, number>>();
    for (const row of centerTakenDaily ?? []) {
      const slug = (row as any).center_slug as string;
      const day = (row as any).day as string;
      const cnt = Number((row as any).taken_count ?? 0);
      if (!centerTakenDailyMap.has(slug)) centerTakenDailyMap.set(slug, new Map());
      centerTakenDailyMap.get(slug)!.set(day, cnt);
    }

    // 2c) Expired daily last 7 days
    const { data: centerExpiredDaily, error: expDailyErr } = await supabase
      .from('center_expired_daily_last7')
      .select('center_slug, day, expired_count');
    if (expDailyErr) throw new Error(expDailyErr.message);

    const centerExpiredDailyMap = new Map<string, Map<DayKey, number>>();
    for (const row of centerExpiredDaily ?? []) {
      const slug = (row as any).center_slug as string;
      const day = (row as any).day as string;
      const cnt = Number((row as any).expired_count ?? 0);
      if (!centerExpiredDailyMap.has(slug)) centerExpiredDailyMap.set(slug, new Map());
      centerExpiredDailyMap.get(slug)!.set(day, cnt);
    }

    const centers: CenterAnalytics[] =
      (centerStats ?? []).map((row: any) => {
        const slug = row.slug as string;
        const dailyHistory = days.map((k) => centerDailyMap.get(slug)?.get(k) ?? 0);
        const generatedToday = Number(row.generated_today ?? 0);
        const generatedTotal = Number(row.generated_total ?? 0);
        const totalHistory = toCumulative(dailyHistory).map((x) => {
          // Align cumulative curve to all-time total:
          // We don't know historical counts before 7 days from this view alone,
          // so shift the last point to match generatedTotal.
          return x;
        });

        // Shift cumulative series so last point equals generatedTotal
        const last = totalHistory[totalHistory.length - 1] ?? 0;
        const shift = generatedTotal - last;
        const shiftedTotalHistory = totalHistory.map((v) => Math.max(0, v + shift));

        const takenDailyHistory = days.map((k) => centerTakenDailyMap.get(slug)?.get(k) ?? 0);
        const takenTotalHistory = toCumulative(takenDailyHistory);
        const taken = takenBySlug.get(slug) ?? { today: 0, total: 0 };
        const takenLast = takenTotalHistory[takenTotalHistory.length - 1] ?? 0;
        const takenShift = taken.total - takenLast;
        const shiftedTakenTotalHistory = takenTotalHistory.map((v) => Math.max(0, v + takenShift));

        const notUsedDailyHistory = days.map((k) => centerExpiredDailyMap.get(slug)?.get(k) ?? 0);
        const notUsedTotalHistory = toCumulative(notUsedDailyHistory);
        const expired = expiredBySlug.get(slug) ?? { today: 0, total: 0 };
        const expLast = notUsedTotalHistory[notUsedTotalHistory.length - 1] ?? 0;
        const expShift = expired.total - expLast;
        const shiftedNotUsedTotalHistory = notUsedTotalHistory.map((v) => Math.max(0, v + expShift));

        return {
          centerSlug: slug,
          centerName: row.name as string,
          generatedToday,
          generatedTotal,
          dailyHistory,
          totalHistory: shiftedTotalHistory,
          takenToday: taken.today,
          takenTotal: taken.total,
          notUsedToday: expired.today,
          notUsedTotal: expired.total,
          takenDailyHistory,
          takenTotalHistory: shiftedTakenTotalHistory,
          notUsedDailyHistory,
          notUsedTotalHistory: shiftedNotUsedTotalHistory,
        };
      }) ?? [];

    // Pick top center by today, then total
    const topCenter =
      centers
        .slice()
        .sort((a, b) => b.generatedToday - a.generatedToday || b.generatedTotal - a.generatedTotal)[0] ?? null;

    // 3) Test name stats (view from mig_analytics.sql)
    const { data: testStats, error: testStatsErr } = await supabase
      .from('testname_generation_stats')
      .select('test_name, generated_today, generated_total');
    if (testStatsErr) throw new Error(testStatsErr.message);

    const { data: testTakenStats, error: testTakenStatsErr } = await supabase
      .from('testname_taken_stats')
      .select('test_name, taken_today, taken_total');
    if (testTakenStatsErr) throw new Error(testTakenStatsErr.message);

    const { data: testExpiredStats, error: testExpiredStatsErr } = await supabase
      .from('testname_expired_stats')
      .select('test_name, expired_today, expired_total');
    if (testExpiredStatsErr) throw new Error(testExpiredStatsErr.message);

    // 4) Test name daily last 7 days
    const { data: testDaily, error: testDailyErr } = await supabase
      .from('testname_generation_daily_last7')
      .select('test_name, day, generated_count');
    if (testDailyErr) throw new Error(testDailyErr.message);

    const testDailyMap = new Map<string, Map<DayKey, number>>();
    for (const row of testDaily ?? []) {
      const name = (row as any).test_name as string;
      const day = (row as any).day as string;
      const cnt = Number((row as any).generated_count ?? 0);
      if (!testDailyMap.has(name)) testDailyMap.set(name, new Map());
      testDailyMap.get(name)!.set(day, cnt);
    }

    const tests: TopTestAnalytics[] =
      (testStats ?? []).map((row: any) => {
        const name = row.test_name as string;
        const dailyHistory = days.map((k) => testDailyMap.get(name)?.get(k) ?? 0);
        const generatedToday = Number(row.generated_today ?? 0);
        const generatedTotal = Number(row.generated_total ?? 0);
        const totalHistory = toCumulative(dailyHistory);
        const last = totalHistory[totalHistory.length - 1] ?? 0;
        const shift = generatedTotal - last;
        const shiftedTotalHistory = totalHistory.map((v) => Math.max(0, v + shift));
        return {
          testName: name,
          generatedToday,
          generatedTotal,
          dailyHistory,
          totalHistory: shiftedTotalHistory,
        };
      }) ?? [];

    const topTest =
      tests
        .slice()
        .sort((a, b) => b.generatedToday - a.generatedToday || b.generatedTotal - a.generatedTotal)[0] ?? null;

    // 5) Recent activity feed (grouped by minute)
    const { data: activityRows, error: activityErr } = await supabase
      .from('generation_activity_recent')
      .select('minute_bucket, center_slug, center_name, test_name, generated_count')
      .limit(50);
    if (activityErr) throw new Error(activityErr.message);

    const activity: GenerationActivityItem[] = (activityRows ?? []).map((row: any) => ({
      timestamp: new Date(row.minute_bucket).toISOString(),
      centerSlug: row.center_slug,
      centerName: row.center_name,
      testName: row.test_name,
      count: Number(row.generated_count ?? 0),
    }));

    return {
      centers,
      topCenter,
      topTest,
      activity,
    };
  }
}


