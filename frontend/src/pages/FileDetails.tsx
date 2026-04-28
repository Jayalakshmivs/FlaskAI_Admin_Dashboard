import { useQuery } from '@tanstack/react-query';
import { getFileDetails, ProcessingStep } from '@/lib/api';
import { 
  Loader2, Clock, CheckCircle2, AlertTriangle, 
  User as UserIcon, Calendar, ArrowLeft, RefreshCw,
  Layout, Table as TableIcon, Code, ChevronDown, 
  ChevronRight, Activity, Database, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const STATUS_CFG: Record<string, { bg: string; color: string; label: string; icon: any }> = {
  success:       { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'SUCCESS',     icon: CheckCircle2 },
  failed:        { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: 'FAILED',      icon: AlertTriangle },
  'in progress': { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'IN PROGRESS', icon: Clock },
};

function cfg(s: string) {
  if (!s) return STATUS_CFG['in progress'];
  const lower = s.toLowerCase();
  if (lower.includes('success') || lower.includes('complete') || lower.includes('indexed')) return STATUS_CFG.success;
  if (lower.includes('fail') || lower.includes('error')) return STATUS_CFG.failed;
  return STATUS_CFG['in progress'];
}

function fmtDur(ms?: number | null) {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { 
    month: 'short', day: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit', hour12: true 
  });
}

export default function FileDetails({ fileId, onBack }: { fileId: string; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'waterfall' | 'table' | 'json'>('waterfall');
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  const { data: steps, isLoading, isFetching } = useQuery<ProcessingStep[]>({
    queryKey: ['file-details', fileId],
    queryFn: () => getFileDetails(fileId),
    refetchInterval: 3000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-[400px] items-center justify-center gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 opacity-40" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">Hydrating Execution Context...</span>
          <span className="text-[10px] text-muted-foreground/60 font-mono italic">Fetching step metrics for {fileId}</span>
        </div>
      </div>
    );
  }

  const toggleExpand = (id: number) => {
    setExpandedSteps(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalDuration = steps?.reduce((acc, s) => acc + (s.duration_ms || 0), 0) || 0;
  const overallStatus = steps?.some(s => s.status === 'failed') ? 'failed' : 
                        steps?.every(s => s.status === 'success') ? 'success' : 'in progress';
  const statusInfo = cfg(overallStatus);
  const StatusIcon = statusInfo.icon;

  const first = steps?.[0];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1200px] mx-auto pb-12">
      {/* ── Action Bar ── */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack} 
          className="group flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all px-3 py-1.5 rounded-lg hover:bg-muted"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> 
          BACK TO REGISTRY
        </button>
        
        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full border border-border/50 bg-muted/10 ${isFetching ? 'text-blue-400' : 'text-muted-foreground/40'}`}>
          <RefreshCw size={10} className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? 'Hydrating Live' : 'Synced'}
        </div>
      </div>

      {/* ── Header Card ── */}
      <div className="relative overflow-hidden bg-card border border-border rounded-3xl p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 relative z-10">
          <div className="flex items-start gap-6">
            <div className="p-5 bg-blue-500/10 rounded-2xl text-blue-500 shadow-inner border border-blue-500/20">
              <FileText size={32} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4 flex-wrap">
                <h1 className="text-3xl font-black tracking-tighter text-foreground leading-none">
                  {first?.file_name ?? 'File Context'}
                </h1>
                <div 
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
                  style={{ backgroundColor: statusInfo.bg, color: statusInfo.color, borderColor: `${statusInfo.color}33` }}
                >
                  <StatusIcon size={12} className={overallStatus === 'in progress' ? 'animate-spin' : ''} />
                  {statusInfo.label}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl w-fit border border-border/50">
                <span className="opacity-60 flex items-center gap-1"><Database size={12}/> ID:</span>
                <span className="text-foreground font-bold">{fileId.slice(0,18)}...</span>
                <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-widest">{first?.file_type ?? 'BINARY'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-2xl border border-border/40 backdrop-blur-sm">
            {[
              { label: 'Steps',   val: steps?.length ?? 0, icon: Activity, color: 'text-blue-500' },
              { label: 'Runtime', val: fmtDur(totalDuration), icon: Clock, color: 'text-purple-500' },
              { label: 'Owner',   val: first?.user_name || 'System', icon: UserIcon, color: 'text-emerald-500' },
              { label: 'Started', val: fmtDate(first?.created_at || '').split(',')[0], icon: Calendar, color: 'text-orange-500' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center px-4 py-1 border-r last:border-0 border-border/50">
                <stat.icon size={14} className={`${stat.color} mb-1 opacity-80`} />
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                <span className="text-xs font-bold text-foreground truncate max-w-[100px]">{stat.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center justify-between border-b border-border/50 px-2 mt-4">
        <div className="flex items-center gap-8">
          {[
            { id: 'waterfall', label: 'WATERFALL CHART', icon: Layout },
            { id: 'table',     label: 'STEP TABLE',      icon: TableIcon },
            { id: 'json',      label: 'JSON EXPLORER',   icon: Code },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-2 text-[10px] font-black tracking-widest transition-all relative ${
                activeTab === tab.id ? 'text-blue-500' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'waterfall' && (
            <motion.div 
              key="waterfall"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-card border border-border rounded-3xl p-8 shadow-xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Activity size={18} className="text-blue-400" />
                  <span className="text-xs font-black text-foreground uppercase tracking-widest">Execution Timeline</span>
                </div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted/40 px-3 py-1 rounded-full">
                  Aggregated Runtime: <span className="text-blue-500">{fmtDur(totalDuration)}</span>
                </div>
              </div>
              
              <WaterfallChart steps={steps || []} totalDuration={totalDuration} />
            </motion.div>
          )}

          {activeTab === 'table' && (
            <motion.div 
              key="table"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest">Process Step</th>
                    <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest">Status</th>
                    <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest">Duration</th>
                    <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(!steps || steps.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-24 text-center text-muted-foreground font-bold italic uppercase tracking-widest">No step metrics available.</td>
                    </tr>
                  ) : steps.map((step, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg(step.status).color }} />
                          <span className="font-bold text-foreground">{step.step_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={step.status} />
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-muted-foreground">
                        {fmtDur(step.duration_ms)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-[10px] font-medium">
                        {fmtDate(step.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {activeTab === 'json' && (
            <motion.div 
              key="json"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4"
            >
              {(!steps || steps.length === 0) ? (
                <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground font-bold uppercase tracking-widest">No data available for exploration.</div>
              ) : steps.map((step, idx) => (
                <div key={idx} className="bg-card border border-border rounded-2xl overflow-hidden shadow-md group">
                  <button 
                    onClick={() => toggleExpand(idx)}
                    className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl border border-border/50 ${expandedSteps[idx] ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                        <Code size={14} />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-black text-foreground uppercase tracking-tight">{step.step_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">Raw Payload Inspection</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={step.status} />
                      {expandedSteps[idx] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {expandedSteps[idx] && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border/50 bg-black/5 dark:bg-black/20"
                      >
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Process Input</span>
                              <pre className="bg-muted/50 p-4 rounded-xl text-[10px] font-mono text-foreground border border-border/50 overflow-auto max-h-[300px] scrollbar-thin">
                                {JSON.stringify(step.input_payload || { status: 'Empty' }, null, 2)}
                              </pre>
                            </div>
                            <div className="flex flex-col gap-2">
                              <span className="text-[9px] font-black text-blue-500/80 uppercase tracking-[0.2em] ml-1">Process Output</span>
                              <pre className="bg-blue-500/5 p-4 rounded-xl text-[10px] font-mono text-foreground border border-blue-500/10 overflow-auto max-h-[300px] scrollbar-thin">
                                {JSON.stringify(step.output_payload || step.output_summary || { status: 'Empty' }, null, 2)}
                              </pre>
                            </div>
                          </div>
                          {step.error_message && (
                            <div className="mt-6 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                              <div className="flex items-center gap-2 mb-2 text-red-500 font-black text-[10px] uppercase tracking-widest">
                                <AlertTriangle size={12} /> Fault Details
                              </div>
                              <p className="text-xs font-medium text-red-400 font-mono">{step.error_message}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = cfg(status);
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border"
      style={{ backgroundColor: c.bg, color: c.color, borderColor: `${c.color}22` }}
    >
      {c.label}
    </span>
  );
}

function WaterfallChart({ steps, totalDuration }: { steps: ProcessingStep[]; totalDuration: number }) {
  if (!steps.length) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="p-4 bg-muted rounded-full text-muted-foreground animate-pulse">
        <Clock size={32} />
      </div>
      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Awaiting Pipeline Signals...</p>
    </div>
  );

  let currentX = 0;
  const padding = 160; // Room for labels
  const width = 1000;
  const barHeight = 8;
  const rowHeight = 45;
  const svgHeight = steps.length * rowHeight + 40;

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <svg width={width + padding} height={svgHeight} className="font-mono">
        {/* Vertical Grids */}
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <g key={p}>
            <line 
              x1={padding + p * width} y1={20} x2={padding + p * width} y2={svgHeight - 20} 
              stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" 
            />
            <text x={padding + p * width} y={svgHeight - 5} fontSize="8" fill="rgba(255,255,255,0.2)" textAnchor="middle">
              {fmtDur(p * totalDuration)}
            </text>
          </g>
        ))}

        {steps.map((step, idx) => {
          const duration = step.duration_ms || 10; 
          const barWidth = Math.max((duration / (totalDuration || 1)) * width, 4);
          const x = padding + (currentX / (totalDuration || 1)) * width;
          const y = idx * rowHeight + 30;
          currentX += duration;

          const color = cfg(step.status).color;

          return (
            <g key={idx} className="group cursor-help">
              <text x={padding - 15} y={y + 6} fontSize="10" fill="currentColor" className="text-muted-foreground font-black uppercase tracking-tighter" textAnchor="end">
                {step.step_name}
              </text>
              
              <rect 
                x={x} y={y} width={barWidth} height={barHeight} 
                rx={barHeight/2} fill={color} opacity="0.1"
                className="group-hover:opacity-30 transition-opacity"
              />
              
              <rect 
                x={x} y={y} width={barWidth} height={barHeight} 
                rx={barHeight/2} fill={color}
              />

              <text x={x + barWidth + 8} y={y + 7} fontSize="9" fill={color} className="font-black opacity-60">
                {fmtDur(step.duration_ms)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}


