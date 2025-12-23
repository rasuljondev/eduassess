import React, { useEffect, useState, useMemo } from 'react';
import { analyticsService } from '../../services';
import type { CenterAnalytics } from '../../types';
import type { SuperAdminAnalyticsData } from '../../services/AnalyticsService';
import { 
  Building2, 
  Users, 
  GraduationCap,
  Calendar,
  School,
  Trophy,
  Activity,
  CheckSquare,
  XCircle
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<SuperAdminAnalyticsData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const res = await analyticsService.getSuperAdminDashboardData();
    setData(res);
  };

  const analytics: CenterAnalytics[] = data?.centers ?? [];

  const summaryStats = useMemo(() => {
    const totalCenters = analytics.length;
    const totalGenerated = analytics.reduce((sum, center) => sum + center.generatedTotal, 0);
    const dailyGenerated = analytics.reduce((sum, center) => sum + center.generatedToday, 0);
    
    const totalTaken = analytics.reduce((sum, center) => sum + (center.takenTotal || 0), 0);
    const dailyTaken = analytics.reduce((sum, center) => sum + (center.takenToday || 0), 0);
    
    // ADJUSTED LOGIC: Not Used = Generated - Taken
    const totalNotUsed = Math.max(0, totalGenerated - totalTaken);
    const dailyNotUsed = Math.max(0, dailyGenerated - dailyTaken);
    
    return {
      totalCenters,
      totalGenerated,
      dailyGenerated,
      totalTaken,
      dailyTaken,
      totalNotUsed,
      dailyNotUsed
    };
  }, [analytics]);

  // Generate dates for last 7 days
  const dates = useMemo(() => {
    const datesArray = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      datesArray.push(date);
    }
    return datesArray;
  }, []);

  // Sum up history from all centers
  const sumHistory = (key: keyof CenterAnalytics) => {
    return analytics
      .map(c => (c[key] as number[]) || [])
      .reduce((acc, history) => {
        return acc.map((val, i) => val + (history[i] || 0));
      }, Array(7).fill(0));
  };

  const totalGeneratedHistory = useMemo(() => sumHistory('totalHistory'), [analytics]);
  const dailyGeneratedHistory = useMemo(() => sumHistory('dailyHistory'), [analytics]);
  const totalTakenHistory = useMemo(() => sumHistory('takenTotalHistory'), [analytics]);
  const dailyTakenHistory = useMemo(() => sumHistory('takenDailyHistory'), [analytics]);
  
  // ADJUSTED LOGIC: Not Used History = Generated History - Taken History
  const totalNotUsedHistory = useMemo(() => 
    totalGeneratedHistory.map((gen, i) => Math.max(0, gen - (totalTakenHistory[i] || 0))), 
    [totalGeneratedHistory, totalTakenHistory]
  );
  const dailyNotUsedHistory = useMemo(() => 
    dailyGeneratedHistory.map((gen, i) => Math.max(0, gen - (dailyTakenHistory[i] || 0))), 
    [dailyGeneratedHistory, dailyTakenHistory]
  );

  const totalCentersHistory = useMemo(() => {
    return dates.map((_, dayIndex) => {
      return analytics.filter(center => (center.dailyHistory?.[dayIndex] || 0) > 0).length;
    });
  }, [analytics, dates]);

  // Colorful icon configurations for centers
  const centerIcons = [
    { icon: GraduationCap, color: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
    { icon: School, color: 'from-purple-500 to-pink-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20', iconColor: 'text-purple-600 dark:text-purple-400' },
    { icon: Building2, color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600 dark:text-green-400' },
    { icon: GraduationCap, color: 'from-orange-500 to-red-500', bgColor: 'bg-orange-50 dark:bg-orange-900/20', iconColor: 'text-orange-600 dark:text-orange-400' },
    { icon: School, color: 'from-indigo-500 to-blue-500', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', iconColor: 'text-indigo-600 dark:text-indigo-400' },
    { icon: Building2, color: 'from-teal-500 to-cyan-500', bgColor: 'bg-teal-50 dark:bg-teal-900/20', iconColor: 'text-teal-600 dark:text-teal-400' },
  ];

  const getCenterIcon = (index: number) => {
    return centerIcons[index % centerIcons.length];
  };

  const getColorFromGradient = (gradient: string): string => {
    if (gradient.includes('blue')) return '#3b82f6';
    if (gradient.includes('purple')) return '#a855f7';
    if (gradient.includes('green')) return '#10b981';
    if (gradient.includes('orange')) return '#f97316';
    if (gradient.includes('indigo')) return '#6366f1';
    if (gradient.includes('teal')) return '#14b8a6';
    return '#3b82f6'; // default
  };

  const topCenter = data?.topCenter ?? null;
  const topTest = data?.topTest ?? null;
  const activity = data?.activity ?? [];

  // Bar Chart Component (7 columns for 7 days)
  const BarChart: React.FC<{
    data: number[];
    dates: Date[];
    color: string;
    height?: number;
    width?: number;
  }> = ({ data, dates, color, height = 80, width = 200 }) => {
    const padding = 4;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2 - 20; // space for labels
    const barCount = 7;
    const barWidth = (chartWidth / barCount) * 0.6;
    const barSpacing = (chartWidth - barWidth * barCount) / (barCount - 1 || 1);
    
    const displayData = data.slice(-7);
    while (displayData.length < 7) displayData.unshift(0);
    const max = Math.max(...displayData, 1);
    
    const getWeekday = (date: Date) => {
      return date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
    };
    
    return (
      <div className="relative" style={{ width, height }}>
        <svg width={width} height={height} className="overflow-visible">
          {displayData.map((value, i) => {
            const barHeight = (value / max) * chartHeight;
            const x = padding + i * (barWidth + barSpacing);
            const y = padding + chartHeight - barHeight;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  rx="2"
                  className="transition-opacity hover:opacity-80"
                />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + padding + 14}
                  textAnchor="middle"
                  className="text-[10px] fill-gray-400 dark:fill-gray-500 font-bold"
                >
                  {dates[i] ? getWeekday(dates[i]) : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Platform Summary - Top row 3 cards (Totals) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Requests */}
        <div className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20 p-6 rounded-2xl border border-purple-100 dark:border-purple-800 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 ml-4">
              <BarChart data={totalGeneratedHistory} dates={dates} color="#a855f7" height={85} />
            </div>
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-1">{summaryStats.totalGenerated.toLocaleString()}</p>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Exam Requests</h3>
          </div>
        </div>

        {/* Total Started */}
        <div className="bg-gradient-to-br from-white to-emerald-50 dark:from-gray-800 dark:to-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 ml-4">
              <BarChart data={totalTakenHistory} dates={dates} color="#10b981" height={85} />
            </div>
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-1">{summaryStats.totalTaken.toLocaleString()}</p>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Started</h3>
          </div>
        </div>

        {/* Total Expired */}
        <div className="bg-gradient-to-br from-white to-rose-50 dark:from-gray-800 dark:to-rose-900/20 p-6 rounded-2xl border border-rose-100 dark:border-rose-800 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500 to-red-500 shadow-lg">
              <XCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 ml-4">
              <BarChart data={totalNotUsedHistory} dates={dates} color="#f43f5e" height={85} />
            </div>
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-1">{summaryStats.totalNotUsed.toLocaleString()}</p>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Expired</h3>
          </div>
        </div>
      </div>

      {/* Daily Summary - Middle row 3 cards (Today) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4 text-purple-500">
            <Activity className="w-5 h-5" />
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Today's Requests</h3>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-gray-900 dark:text-gray-50">+{summaryStats.dailyGenerated}</p>
            <BarChart data={dailyGeneratedHistory} dates={dates} color="#a855f7" height={50} width={120} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4 text-emerald-500">
            <CheckSquare className="w-5 h-5" />
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Today's Started</h3>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-gray-900 dark:text-gray-50">+{summaryStats.dailyTaken}</p>
            <BarChart data={dailyTakenHistory} dates={dates} color="#10b981" height={50} width={120} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4 text-rose-500">
            <XCircle className="w-5 h-5" />
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Today's Expiry</h3>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-gray-900 dark:text-gray-50">+{summaryStats.dailyNotUsed}</p>
            <BarChart data={dailyNotUsedHistory} dates={dates} color="#f43f5e" height={50} width={120} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Top Performers + Activity */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-center gap-3 mb-6 text-amber-500">
              <Trophy className="w-6 h-6" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Top Performance (Today)</h2>
            </div>
            <div className="space-y-4">
              {topCenter && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Top Center</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{topCenter.centerName}</p>
                  </div>
                  <p className="text-2xl font-black text-blue-700 dark:text-blue-300 ml-4">+{topCenter.generatedToday}</p>
                </div>
              )}
              {topTest && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800 flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase mb-1">Top Test</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{topTest.testName}</p>
                  </div>
                  <p className="text-2xl font-black text-purple-700 dark:text-purple-300 ml-4">+{topTest.generatedToday}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Activity Feed */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Recent generation activity
          </h2>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {activity.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">No activity yet.</div>
            ) : (
              activity.map((a, i) => (
                <div key={i} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {a.centerName} <span className="text-gray-400 dark:text-gray-500">•</span> {a.testName}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {new Date(a.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      +{a.count}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Education Centers Section */}
      <div className="pt-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
          <School className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Education Centers Performance
        </h2>
        <div className="space-y-6">
          {analytics.map((center, index) => {
            const iconConfig = getCenterIcon(index);
            const IconComponent = iconConfig.icon;
            return (
              <div key={center.centerSlug} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
                <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${iconConfig.color} shadow-sm`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xl text-gray-800 dark:text-gray-100">{center.centerName}</h4>
                      <p className="text-[10px] text-gray-500 font-mono tracking-tighter uppercase">/{center.centerSlug}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Generated Today</p>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">+{center.generatedToday}</p>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Center Generated Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Generated</p>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{center.generatedTotal}</p>
                        <p className="text-[10px] font-bold text-indigo-500">+{center.generatedToday} today</p>
                      </div>
                    </div>
                    <BarChart data={center.totalHistory || Array(7).fill(0)} dates={dates} color={getColorFromGradient(iconConfig.color)} height={60} />
                  </div>

                  {/* Center Taken Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Taken</p>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{center.takenTotal || 0}</p>
                        <p className="text-[10px] font-bold text-emerald-500">+{center.takenToday || 0} today</p>
                      </div>
                    </div>
                    <BarChart data={center.takenTotalHistory || Array(7).fill(0)} dates={dates} color="#10b981" height={60} />
                  </div>

                  {/* Center Not Used Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Not Used</p>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{Math.max(0, center.generatedTotal - (center.takenTotal || 0))}</p>
                        <p className="text-[10px] font-bold text-rose-500">+{Math.max(0, center.generatedToday - (center.takenToday || 0))} today</p>
                      </div>
                    </div>
                    <BarChart 
                      data={(center.totalHistory || Array(7).fill(0)).map((gen, i) => Math.max(0, gen - (center.takenTotalHistory?.[i] || 0)))} 
                      dates={dates} 
                      color="#f43f5e" 
                      height={60} 
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
