import { useQuery } from '@tanstack/react-query';
import { getStats, FileStats } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Loader2, TrendingUp, FileText, Briefcase, Users, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';

const PIE_COLORS = ['#22c55e', '#ef4444', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899'];

const MAIN_STATS = [
  { label: 'Total Dataset (Files)', key: 'total_files', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { label: 'Total Jobs', key: 'total_jobs', icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  { label: 'Active Users', key: 'active_users', icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  { label: 'Processing Rate', key: 'processing_rate', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', isRate: true },
];

const SECONDARY_STATS = [
  { label: 'Successful', key: 'total_success', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  { label: 'Failed', key: 'total_failures', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  { label: 'In Progress', key: 'total_in_progress', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  { label: 'Success Rate', key: 'success_rate', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', isPercent: true },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Overview() {
  const { data: stats, isLoading } = useQuery<FileStats>({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 5000,
  });

  if (isLoading || !stats) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-primary w-8 h-8" />
          <p className="text-muted-foreground text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const statusData = [
    { name: 'Success', value: stats.total_success || 0, color: '#22c55e' },
    { name: 'Failed', value: stats.total_failures || 0, color: '#ef4444' },
    { name: 'In Progress', value: stats.total_in_progress || 0, color: '#eab308' },
  ].filter(d => d.value > 0);

  const pieData = Object.entries(stats.files_by_type || {}).map(([name, value]) => ({ name, value }));
  const hasPieData = pieData.length > 0;

  const pipeData = Object.entries(stats.pipeline_performance || {}).map(([name, counts]: any) => ({
    name,
    success: counts.success || 0,
    failed: counts.failed || 0,
    in_progress: counts.in_progress || 0,
  }));

  return (
    <div className="flex flex-col gap-6">

      {/* MAIN KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MAIN_STATS.map(({ label, key, icon: Icon, color, bg, isRate }) => {
          const val = (stats as any)[key] ?? 0;
          return (
            <div key={key} className={`relative overflow-hidden rounded-xl border p-5 ${bg} backdrop-blur-sm group hover:scale-[1.02] transition-transform duration-200`}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
                <div className={`p-2 rounded-lg bg-card/50`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
              <h2 className={`text-3xl font-black ${color}`}>
                {val}{isRate ? <span className="text-base font-semibold ml-1">stp/h</span> : ''}
              </h2>
              <div className={`absolute bottom-0 right-0 w-20 h-20 rounded-tl-full opacity-5 ${bg.split(' ')[0].replace('/10', '/30')}`} />
            </div>
          );
        })}
      </div>

      {/* SECONDARY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SECONDARY_STATS.map(({ label, key, icon: Icon, color, bg, isPercent }) => {
          const val = (stats as any)[key] ?? 0;
          return (
            <div key={key} className={`relative overflow-hidden rounded-xl border p-5 ${bg} backdrop-blur-sm hover:scale-[1.02] transition-transform duration-200`}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <h2 className={`text-3xl font-black ${color}`}>
                {isPercent ? `${val.toFixed(2)}%` : val}
              </h2>
            </div>
          );
        })}
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* STATUS PIE */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Processing Status Distribution
          </h3>
          {statusData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
              No data yet
            </div>
          )}
        </div>

        {/* FILE TYPE PIE */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            Files by Type
          </h3>
          {hasPieData ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
              No type breakdown available
            </div>
          )}
        </div>
      </div>

      {/* PIPELINE PERFORMANCE BAR */}
      {pipeData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            Pipeline Step Performance
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipeData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="success" name="Success" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="in_progress" name="In Progress" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}