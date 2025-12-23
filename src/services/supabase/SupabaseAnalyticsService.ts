import type { AnalyticsService } from '../AnalyticsService';
import type { CenterAnalytics } from '../../types';
import { supabase } from '../../lib/supabase';

export interface TopTestAnalytics {
  testName: string; // exam_type
  generatedToday: number; // requests today
  generatedTotal: number; // requests (last 7 days)
  dailyHistory: number[];
  totalHistory: number[];
}

export interface GenerationActivityItem {
  timestamp: string; // ISO
  centerSlug: string;
  centerName: string;
  testName: string; // exam_type
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
    const todayKey = days[days.length - 1];

    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    // Centers
    const { data: centersList, error: centersErr } = await supabase
      .from('centers')
      .select('id, slug, name');
    if (centersErr) throw new Error(centersErr.message);

    const centerIdToMeta = new Map<string, { slug: string; name: string }>();
    for (const c of centersList ?? []) {
      centerIdToMeta.set((c as any).id, { slug: (c as any).slug, name: (c as any).name });
    }

    // Requests last 7 days
    const { data: reqRows, error: reqErr } = await supabase
      .from('exam_requests')
      .select('center_id, exam_type, requested_at')
      .gte('requested_at', since.toISOString());
    if (reqErr) throw new Error(reqErr.message);

    // Attempts last 7 days
    const { data: attRows, error: attErr } = await supabase
      .from('exam_attempts')
      .select('center_id, exam_type, status, started_at, expires_at, created_at')
      .gte('created_at', since.toISOString());
    if (attErr) throw new Error(attErr.message);

    // Per-center maps
    const reqDailyByCenter = new Map<string, Map<DayKey, number>>();
    const startedDailyByCenter = new Map<string, Map<DayKey, number>>();
    const expiredDailyByCenter = new Map<string, Map<DayKey, number>>();
    const startedTotalByCenter = new Map<string, number>();
    const expiredTotalByCenter = new Map<string, number>();

    for (const r of reqRows ?? []) {
      const centerId = (r as any).center_id as string;
      const dayKey = new Date((r as any).requested_at).toISOString().slice(0, 10);
      if (!reqDailyByCenter.has(centerId)) reqDailyByCenter.set(centerId, new Map());
      reqDailyByCenter.get(centerId)!.set(dayKey, (reqDailyByCenter.get(centerId)!.get(dayKey) ?? 0) + 1);
    }

    for (const a of attRows ?? []) {
      const centerId = (a as any).center_id as string;
      const status = String((a as any).status);
      const startedAt = (a as any).started_at ? new Date((a as any).started_at) : null;
      const expiresAt = (a as any).expires_at ? new Date((a as any).expires_at) : null;

      if (startedAt) {
        const dayKey = startedAt.toISOString().slice(0, 10);
        if (!startedDailyByCenter.has(centerId)) startedDailyByCenter.set(centerId, new Map());
        startedDailyByCenter.get(centerId)!.set(dayKey, (startedDailyByCenter.get(centerId)!.get(dayKey) ?? 0) + 1);
        startedTotalByCenter.set(centerId, (startedTotalByCenter.get(centerId) ?? 0) + 1);
      }

      if (status === 'expired') {
        const dayKey = (expiresAt ?? new Date()).toISOString().slice(0, 10);
        if (!expiredDailyByCenter.has(centerId)) expiredDailyByCenter.set(centerId, new Map());
        expiredDailyByCenter.get(centerId)!.set(dayKey, (expiredDailyByCenter.get(centerId)!.get(dayKey) ?? 0) + 1);
        expiredTotalByCenter.set(centerId, (expiredTotalByCenter.get(centerId) ?? 0) + 1);
      }
    }

    const centers: CenterAnalytics[] = (centersList ?? []).map((c: any) => {
      const centerId = c.id as string;

      const dailyHistory = days.map((k) => reqDailyByCenter.get(centerId)?.get(k) ?? 0);
      const totalHistory = toCumulative(dailyHistory);
      const generatedToday = reqDailyByCenter.get(centerId)?.get(todayKey) ?? 0;
      const generatedTotal = dailyHistory.reduce((a, b) => a + b, 0); // last 7 days total

      const takenDailyHistory = days.map((k) => startedDailyByCenter.get(centerId)?.get(k) ?? 0);
      const takenTotalHistory = toCumulative(takenDailyHistory);
      const takenToday = startedDailyByCenter.get(centerId)?.get(todayKey) ?? 0;
      const takenTotal = startedTotalByCenter.get(centerId) ?? 0;

      const notUsedDailyHistory = days.map((k) => expiredDailyByCenter.get(centerId)?.get(k) ?? 0);
      const notUsedTotalHistory = toCumulative(notUsedDailyHistory);
      const notUsedToday = expiredDailyByCenter.get(centerId)?.get(todayKey) ?? 0;
      const notUsedTotal = expiredTotalByCenter.get(centerId) ?? 0;

      return {
        centerSlug: c.slug as string,
        centerName: c.name as string,
        generatedToday,
        generatedTotal,
        dailyHistory,
        totalHistory,
        takenToday,
        takenTotal,
        notUsedToday,
        notUsedTotal,
        takenDailyHistory,
        takenTotalHistory,
        notUsedDailyHistory,
        notUsedTotalHistory,
      };
    });

    const topCenter =
      centers
        .slice()
        .sort((a, b) => b.generatedToday - a.generatedToday || b.generatedTotal - a.generatedTotal)[0] ?? null;

    // Top exam_type (last 7 days)
    const dailyByExam = new Map<string, Map<DayKey, number>>();
    for (const r of reqRows ?? []) {
      const examType = String((r as any).exam_type);
      const dayKey = new Date((r as any).requested_at).toISOString().slice(0, 10);
      if (!dailyByExam.has(examType)) dailyByExam.set(examType, new Map());
      dailyByExam.get(examType)!.set(dayKey, (dailyByExam.get(examType)!.get(dayKey) ?? 0) + 1);
    }

    const tests: TopTestAnalytics[] = Array.from(dailyByExam.entries()).map(([examType, m]) => {
      const dailyHistory = days.map((k) => m.get(k) ?? 0);
      return {
        testName: examType,
        generatedToday: m.get(todayKey) ?? 0,
        generatedTotal: dailyHistory.reduce((a, b) => a + b, 0),
        dailyHistory,
        totalHistory: toCumulative(dailyHistory),
      };
    });

    const topTest =
      tests.slice().sort((a, b) => b.generatedToday - a.generatedToday || b.generatedTotal - a.generatedTotal)[0] ??
      null;

    // Activity feed: last 50 exam requests
    const { data: recentReq, error: recentReqErr } = await supabase
      .from('exam_requests')
      .select('center_id, exam_type, requested_at')
      .order('requested_at', { ascending: false })
      .limit(50);
    if (recentReqErr) throw new Error(recentReqErr.message);

    const activity: GenerationActivityItem[] = (recentReq ?? []).map((row: any) => {
      const meta = centerIdToMeta.get(row.center_id) ?? { slug: 'unknown', name: 'Unknown' };
      return {
        timestamp: new Date(row.requested_at).toISOString(),
        centerSlug: meta.slug,
        centerName: meta.name,
        testName: String(row.exam_type),
        count: 1,
      };
    });

    return {
      centers,
      topCenter,
      topTest,
      activity,
    };
  }
}


