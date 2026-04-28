import { useQuery } from '@tanstack/react-query';
import { getStats, FileStats } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Loader2, Activity, Database, Users, Cpu, CheckCircle2, AlertTriangle, Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const MAIN_STATS = [
  { label: 'Registry Size', key: 'total_files', icon: Database, color: 'text-blue-500', glow: 'bg-blue-500/10' },
  { label: 'Active Clusters', key: 'total_jobs', icon: Zap, color: 'text-purple-500', glow: 'bg-purple-500/10' },
  { label: 'Identity Node', key: 'active_users', icon: Users, color: 'text-emerald-500', glow: 'bg-emerald-500/10' },
  { label: 'Processing Rate', key: 'processing_rate', icon: Cpu, color: 'text-orange-500', glow: 'bg-orange-500/10', isRate: true },
];

const SECONDARY_STATS = [
  { label: 'Successful',    key: 'total_success',    icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'Failed',        key: 'total_failures',   icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  { label: 'In Progress',   key: 'total_in_progress',icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { label: 'Success Rate',  key: 'success_rate',     icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10', isPercent: true },
];

const DONUT_COLORS = ['#3b82f6', '#8b5cf6', '#eab308', '#10b981', '#ec4899', '#f97316', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl py-3 px-4 text-[10px] text-slate-300 shadow-2xl backdrop-blur-xl">
      <p className="font-black mb-2 border-b border-slate-800/50 pb-2 uppercase tracking-widest">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-3 py-1 font-bold" style={{ color: p.fill || p.color }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.fill || p.color }} />
          {p.name}: <span className="ml-auto font-mono text-xs">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

export default function Overview() {
  const { data: stats, isLoading, isFetching } = useQuery<FileStats>({
    queryKey: ['stats'],
    queryFn: () => getStats(),
    refetchInterval: 5000, 
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-[500px] items-center justify-center gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 opacity-40" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">Synchronizing Core Metrics...</span>
          <span className="text-[10px] text-muted-foreground/60 font-mono italic">Initializing database stream</span>
        </div>
      </div>
    );
  }

  const pieData = stats
    ? Object.entries(stats.files_by_type).map(([name, value], i) => ({ 
        name, value, fill: DONUT_COLORS[i % DONUT_COLORS.length]
      }))
    : [];

  const statusData = stats ? [
    { name: 'FAILED', value: stats.total_failures, fill: '#ef4444' },
    { name: 'IN PROGRESS', value: stats.total_in_progress, fill: '#f59e0b' },
    { name: 'SUCCESS', value: stats.total_success, fill: '#10b981' },
  ] : [];

  const pipeData = stats?.pipeline_performance
    ? Object.entries(stats.pipeline_performance).map(([name, counts]) => ({ 
        name, 
        SUCCESS: counts.success,
        FAILED: counts.failed,
        'IN PROGRESS': counts['in progress']
      }))
    : [];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-1000 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
            System Intelligence
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 border border-border text-[10px] font-black uppercase tracking-widest ${isFetching ? 'text-blue-400' : 'text-muted-foreground'}`}>
              <Activity size={10} className={isFetching ? 'animate-pulse' : ''} />
              {isFetching ? 'Syncing Live' : 'Registry Synced'}
            </div>
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Real-time heuristics and performance metrics from the connected PostgreSQL cluster.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-card/50 backdrop-blur-md border border-border px-5 py-2.5 rounded-2xl shadow-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Active Connection</span>
            <span className="text-[10px] font-mono font-bold text-foreground">{new Date().toLocaleTimeString()} @ CLUSTER-01</span>
          </div>
        </div>
      </div>

      {/* ── Primary Indicators ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {MAIN_STATS.map(({ label, key, icon: Icon, color, glow, isRate }, idx) => {
          const val = (stats as any)?.[key] ?? 0;
          return (
            <motion.div 
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative overflow-hidden bg-card/40 backdrop-blur-md border border-border rounded-3xl p-6 shadow-xl group hover:border-blue-500/30 transition-all"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${glow} rounded-full -mr-16 -mt-16 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`} />
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${glow} ${color}`}>
                  <Icon size={16} />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{label}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black tracking-tighter text-foreground leading-none">
                  {val.toLocaleString()}
                </span>
                {isRate && <span className="text-[10px] font-black text-muted-foreground uppercase mb-1">STP/H</span>}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Heuristic Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SECONDARY_STATS.map(({ label, key, icon: Icon, color, bg, isPercent }, idx) => {
          const val = (stats as any)?.[key] ?? 0;
          return (
            <motion.div 
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + idx * 0.05 }}
              className="bg-card/20 backdrop-blur-sm border border-border/40 rounded-2xl p-4 flex items-center justify-between group hover:bg-muted/10 transition-all"
            >
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{label}</span>
                <span className={`text-xl font-black ${color}`}>
                  {isPercent ? val.toFixed(2) : val.toLocaleString()}{isPercent ? '%' : ''}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl ${bg} ${color} group-hover:scale-110 transition-transform shadow-inner`}>
                <Icon size={14} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Visualization Layer ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-card/50 backdrop-blur-md border border-border rounded-3xl p-6 shadow-2xl flex flex-col h-[380px]"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col">
                <span className="text-xs font-black text-foreground uppercase tracking-widest">Flow Distribution</span>
                <span className="text-[9px] text-muted-foreground font-bold italic uppercase">Registry status mix</span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border/50">N={stats?.total_files.toLocaleString()}</div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="45%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                    {statusData.map((entry: any, index: number) => (
                      <Cell key={index} fill={entry.fill} className="hover:opacity-80 transition-opacity cursor-pointer shadow-lg" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '20px', letterSpacing: '0.1em' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Typology Composition */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-card/50 backdrop-blur-md border border-border rounded-3xl p-6 shadow-2xl flex flex-col h-[380px]"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col">
                <span className="text-xs font-black text-foreground uppercase tracking-widest">Typology mix</span>
                <span className="text-[9px] text-muted-foreground font-bold italic uppercase">Dataset object types</span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border/50">OBJ_TYPES</div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={index} fill={entry.fill} className="hover:opacity-80 transition-opacity cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '20px', letterSpacing: '0.1em' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Pipeline Performance */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-card/50 backdrop-blur-md border border-border rounded-3xl p-8 shadow-2xl flex flex-col h-[380px]"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <span className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Pipeline Performance Vector</span>
              <span className="text-[9px] text-muted-foreground font-bold italic uppercase">Granular step execution analysis</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest">
              {((stats as any)?.total_steps || 0).toLocaleString()} Processed Signals
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipeData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9, fontWeight: '900', letterSpacing: '0.05em' }} width={120} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                <Bar dataKey="SUCCESS" stackId="a" fill="#10b981" barSize={28} />
                <Bar dataKey="FAILED" stackId="a" fill="#ef4444" barSize={28} />
                <Bar dataKey="IN PROGRESS" stackId="a" fill="#f59e0b" radius={[0, 8, 8, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

