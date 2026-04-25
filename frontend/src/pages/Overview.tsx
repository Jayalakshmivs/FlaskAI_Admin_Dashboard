import { useQuery } from '@tanstack/react-query';
import { getStats, FileStats } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Loader2 } from 'lucide-react';

// Updated CARD_COLORS to reflect requested metrics and professional color palette
const MAIN_STATS = [
  { label: 'Total Dataset (Files)', key: 'total_files',     dot: null,      value_class: 'text-foreground' },
  { label: 'Total Jobs',            key: 'total_jobs',      dot: 'hsl(var(--primary))', value_class: 'text-primary' },
  { label: 'Active Users',          key: 'active_users',    dot: '#22c55e', value_class: 'text-green-500' },
  { label: 'Processing Rate',       key: 'processing_rate', dot: '#f59e0b', value_class: 'text-orange-500', isRate: true },
];

const SECONDARY_STATS = [
  { label: 'Successful',    key: 'total_success',    dot: '#22c55e', value_class: 'text-green-600 dark:text-green-400' },
  { label: 'Failed',        key: 'total_failures',   dot: '#ef4444', value_class: 'text-red-500' },
  { label: 'In Progress',   key: 'total_in_progress',dot: '#eab308', value_class: 'text-yellow-500' },
  { label: 'Success Rate',  key: 'success_rate',     dot: '#8b5cf6', value_class: 'text-purple-500', isPercent: true },
];

const DONUT_COLORS = ['#3b82f6', '#8b5cf6', '#eab308', '#22c55e', '#ec4899', '#f97316', '#06b6d4'];

// Custom tooltip for recharts - theme aware
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg py-2.5 px-3.5 text-xs text-popover-foreground shadow-xl backdrop-blur-md">
      <p className="font-bold mb-1.5 border-b border-border pb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 py-0.5" style={{ color: p.fill || p.color }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: p.fill || p.color }} />
          {p.name}: <strong className="ml-auto font-mono">{p.value.toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
};

export default function Overview() {
  const { data: stats, isLoading } = useQuery<FileStats>({
    queryKey: ['stats'],
    queryFn: () => getStats(),
    refetchInterval: 5000, 
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-[400px] items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
        <span className="text-xs text-muted-foreground animate-pulse font-medium">Fetching dataset metrics...</span>
      </div>
    );
  }

  const pieData = stats
    ? Object.entries(stats.files_by_type).map(([name, value], i) => ({ 
        name, 
        value,
        fill: DONUT_COLORS[i % DONUT_COLORS.length]
      }))
    : [];

  const statusData = stats ? [
    { name: 'failed', value: stats.total_failures, fill: '#ef4444' },
    { name: 'in progress', value: stats.total_in_progress, fill: '#eab308' },
    { name: 'success', value: stats.total_success, fill: '#22c55e' },
  ] : [];

  const pipeData = stats?.pipeline_performance
    ? Object.entries(stats.pipeline_performance).map(([name, counts]) => ({ 
        name, 
        success: counts.success,
        failed: counts.failed,
        in_progress: counts['in progress']
      }))
    : [];

  const commonChartProps = {
    textColor: 'hsl(var(--muted-foreground))',
    gridColor: 'hsl(var(--border))',
    fontSize: 10,
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">Real-time statistics from the fully connected PostgreSQL database.</p>
        </div>
        <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-full border border-border">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Database Connected: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* ── Primary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MAIN_STATS.map(({ label, key, dot, value_class, isRate }) => {
          const val = (stats as any)?.[key] ?? 0;
          return (
            <div key={key} className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                {dot && <div className="w-24 h-24 rounded-full" style={{ backgroundColor: dot }} />}
              </div>
              <div className="flex items-center gap-2 mb-3">
                {dot && <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: dot }} />}
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">{label}</span>
              </div>
              <div className={`text-4xl font-black tracking-tight leading-none ${value_class}`}>
                {val.toLocaleString()}{isRate ? ' stp/h' : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Secondary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SECONDARY_STATS.map(({ label, key, dot, value_class, isPercent }) => {
          const val = (stats as any)?.[key] ?? 0;
          return (
            <div key={key} className="bg-slate-50/50 dark:bg-muted/10 border border-border/60 rounded-xl p-4 transition-colors hover:border-border">
              <div className="flex items-center gap-1.5 mb-1.5">
                {dot && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: dot }} />}
                <span className="text-[10px] text-muted-foreground font-bold tracking-tight uppercase">{label}</span>
              </div>
              <div className={`text-2xl font-bold ${value_class}`}>
                {isPercent ? val.toFixed(2) : val.toLocaleString()}{isPercent ? '%' : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Distribution - Pie */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-bold text-foreground">Processing Status</span>
                    <span className="text-[10px] text-muted-foreground font-mono bg-muted p-1 rounded">N={stats?.total_files.toLocaleString()}</span>
                </div>
                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={6} dataKey="value" stroke="none">
                                {statusData.map((entry: any, index: number) => (
                                    <Cell key={index} fill={entry.fill} className="hover:opacity-80 transition-opacity cursor-pointer" />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px', color: commonChartProps.textColor }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Files by Type - Donut */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-bold text-foreground">Dataset Composition</span>
                    <span className="text-[10px] text-muted-foreground font-mono bg-muted p-1 rounded">TYPOLOGY</span>
                </div>
                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                                {pieData.map((entry: any, index: number) => (
                                    <Cell key={index} fill={entry.fill} className="hover:opacity-80 transition-opacity cursor-pointer" />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px', color: commonChartProps.textColor }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Pipeline Performance - Stacked Bar */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold text-foreground uppercase tracking-widest">Pipeline Performance (Step Level)</span>
              <span className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">30.1K EVENTS</span>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipeData} layout="vertical" margin={{ left: 20, right: 10 }}>
                <CartesianGrid horizontal={false} strokeDasharray="4 4" stroke={commonChartProps.gridColor} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: commonChartProps.textColor, fontSize: 9, fontWeight: 600 }} width={100} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                <Bar dataKey="success" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} name="Success" barSize={24} />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} name="Failed" barSize={24} />
                <Bar dataKey="in_progress" stackId="a" fill="#eab308" radius={[0, 6, 6, 0]} name="In Progress" barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
