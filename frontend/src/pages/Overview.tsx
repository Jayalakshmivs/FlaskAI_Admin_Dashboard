import { useQuery } from '@tanstack/react-query';
import { getStats, FileStats } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Loader2, Activity, Database, Users, Cpu, CheckCircle2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const MAIN_STATS = [
  { label: 'Total Registry', key: 'total_files', icon: Database, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { label: 'Active Jobs', key: 'total_jobs', icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  { label: 'System Nodes', key: 'active_users', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { label: 'Processing Rate', key: 'processing_rate', icon: Cpu, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-500/10', isRate: true },
];

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export default function Overview() {
  const { data: stats, isLoading, isFetching } = useQuery<FileStats>({
    queryKey: ['stats-overview'],
    queryFn: () => getStats(),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Initializing Dashboard...</p>
      </div>
    );
  }

  const pieData = stats ? [
    { name: 'Success', value: stats.total_success },
    { name: 'In Progress', value: stats.total_in_progress },
    { name: 'Failed', value: stats.total_failures },
  ] : [];

  const performanceData = stats ? Object.entries(stats.pipeline_performance).map(([name, data]) => ({
    name: name.replace(/_/g, ' ').toUpperCase(),
    success: data.success,
    failed: data.failed,
    in_progress: data['in progress'],
  })) : [];

  return (
    <div className="space-y-8 page-transition">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">System Overview</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Real-time operational metrics and system telemetry.</p>
        </div>
        {isFetching && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full border border-border">
            <Loader2 size={12} className="animate-spin text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Data</span>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {MAIN_STATS.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className={cn("p-3 rounded-xl transition-colors", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</div>
            </div>
            <div className="mt-6">
              <div className="text-3xl font-black tracking-tighter">
                {stat.isRate ? `${(stats as any)?.[stat.key] || 0}%` : (stats as any)?.[stat.key]?.toLocaleString() || 0}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Live Status</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Success Rate Chart */}
        <div className="lg:col-span-1 bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-8 flex items-center gap-2">
            <Activity size={16} className="text-primary" /> Distribution Matrix
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }} 
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Performance */}
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-8 flex items-center gap-2">
            <Cpu size={16} className="text-primary" /> Pipeline Throughput
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 800, fill: 'hsl(var(--muted-foreground))' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 800, fill: 'hsl(var(--muted-foreground))' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }} 
                />
                <Bar dataKey="success" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={32} />
                <Bar dataKey="in_progress" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-muted/30 border border-border p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <CheckCircle2 size={24} />
             </div>
             <div>
               <h4 className="font-black text-foreground uppercase tracking-tight">All Systems Operational</h4>
               <p className="text-xs text-muted-foreground font-medium">Cluster health is at 99.8% with zero pending alerts.</p>
             </div>
          </div>
          <div className="flex gap-4">
             <div className="px-5 py-3 bg-card border border-border rounded-xl text-center min-w-[120px]">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Latency</p>
                <p className="text-sm font-black text-foreground">24ms</p>
             </div>
             <div className="px-5 py-3 bg-card border border-border rounded-xl text-center min-w-[120px]">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Uptime</p>
                <p className="text-sm font-black text-foreground">99.9%</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
