import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFileDetails, ProcessingStep } from '@/lib/api';
import { 
  Loader2, ArrowLeft, AlertTriangle, CheckCircle2, Clock, 
  Circle, ChevronDown, ChevronRight, Activity, Database, 
  FileText, Calendar, User as UserIcon, Timer, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { dot: string; bg: string; color: string; label: string; icon: any }> = {
  success:       { dot: '#10b981', bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'SUCCESS',     icon: CheckCircle2 },
  failed:        { dot: '#ef4444', bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: 'FAILED',      icon: AlertTriangle },
  'in progress': { dot: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'IN PROGRESS', icon: Clock },
  pending:       { dot: '#6366f1', bg: 'rgba(99,102,241,0.1)',  color: '#6366f1', label: 'PENDING',     icon: Circle },
};

function cfg(s: string) {
  if (!s) return STATUS_CFG.pending;
  const lower = s.toLowerCase();
  if (lower.includes('success') || lower.includes('complete') || lower.includes('indexed')) return STATUS_CFG.success;
  if (lower.includes('fail') || lower.includes('error')) return STATUS_CFG.failed;
  if (lower.includes('progress') || lower.includes('running')) return STATUS_CFG['in progress'];
  return STATUS_CFG.pending;
}

function Badge({ status, className = "" }: { status: string, className?: string }) {
  const c = cfg(status);
  const Icon = c.icon;
  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${className}`}
      style={{ backgroundColor: c.bg, color: c.color, borderColor: `${c.dot}33` }}
    >
      <Icon size={10} />
      {c.label}
    </span>
  );
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { 
    month: 'short', day: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit', hour12: true 
  });
}

function fmtDur(ms?: number | null) {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/50 rounded-lg mt-2 overflow-hidden bg-muted/20">
      <button 
        onClick={() => setOpen(o => !o)} 
        className="flex items-center justify-between w-full px-3 py-2 bg-muted/40 hover:bg-muted/60 text-muted-foreground text-[10px] font-bold uppercase tracking-tight transition-colors"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {title}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-3 bg-background/50 border-t border-border/30">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page grouping helper ──────────────────────────────────────────────────────
interface PageGroup {
  pageLabel: string;
  pageNumber: number | null;
  steps: ProcessingStep[];
}

function groupStepsByPage(steps: ProcessingStep[]): PageGroup[] {
  const groups = new Map<string, { pageNumber: number | null; steps: ProcessingStep[] }>();
  
  for (const step of steps) {
    const pn = step.page_number;
    const key = pn != null ? `page-${pn}` : 'file-level';
    if (!groups.has(key)) {
      groups.set(key, { pageNumber: pn ?? null, steps: [] });
    }
    groups.get(key)!.steps.push(step);
  }
  
  // Sort: file-level first, then by page number ascending
  const sorted = Array.from(groups.entries()).sort(([, a], [, b]) => {
    const pa = a.pageNumber ?? -1;
    const pb = b.pageNumber ?? -1;
    return pa - pb;
  });

  return sorted.map(([, g]) => ({
    pageLabel: g.pageNumber != null ? `Page ${g.pageNumber}` : 'File Level',
    pageNumber: g.pageNumber,
    steps: g.steps,
  }));
}

const PAGE_SECTION_COLORS = [
  '#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b',
  '#6366f1','#a855f7','#0ea5e9','#ec4899','#4f46e5',
];

// ── Waterfall Chart ───────────────────────────────────────────────────────────
function WaterfallChart({ steps }: { steps: ProcessingStep[] }) {
  const STEP_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#6366f1','#a855f7','#0ea5e9','#f59e0b','#4f46e5','#ef4444'];
  const BAR_H = 32;
  const LABEL_W = 200;
  const CHART_W = 560;
  const GAP = 6;
  const PAGE_HEADER_H = 28;

  const pageGroups = groupStepsByPage(steps);
  const hasPages = pageGroups.some(g => g.pageNumber != null);

  const durations = steps.map(s => s.duration_ms ?? 0);
  const totalMs = durations.reduce((a, b) => a + b, 0);
  const maxMs = Math.max(totalMs, 1);

  // Build flat render list with page headers
  type RenderItem = { type: 'header'; label: string; colorIdx: number } | { type: 'bar'; step: ProcessingStep; globalIdx: number; colorIdx: number };
  const renderItems: RenderItem[] = [];
  let globalIdx = 0;

  pageGroups.forEach((group, gi) => {
    if (hasPages) {
      renderItems.push({ type: 'header', label: group.pageLabel, colorIdx: gi });
    }
    for (const step of group.steps) {
      renderItems.push({ type: 'bar', step, globalIdx, colorIdx: gi });
      globalIdx++;
    }
  });

  // Calculate cumulative positions
  let cumulative = 0;
  const barData = steps.map(s => {
    const dur = s.duration_ms ?? 0;
    const startPct = (cumulative / maxMs) * 100;
    const widthPct = Math.max((dur / maxMs) * 100, 0.8);
    cumulative += dur;
    return { startPct, widthPct, dur };
  });

  let yPos = 0;
  const svgH = renderItems.reduce((h, item) => h + (item.type === 'header' ? PAGE_HEADER_H + 4 : BAR_H + GAP), 50);

  let barIdx = 0;

  return (
    <div className="w-full overflow-x-auto custom-scrollbar">
      <div className="min-w-[850px] p-2">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="flex items-center gap-2 text-blue-400">
            <Activity size={16} />
            <span className="text-[11px] font-black uppercase tracking-widest">Execution Timeline</span>
          </div>
          <div className="h-4 w-px bg-border/50" />
          <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded border border-border/30">
            TOTAL: {fmtDur(totalMs)} · {steps.length} steps{hasPages ? ` · ${pageGroups.filter(g => g.pageNumber != null).length} pages` : ''}
          </span>
        </div>

        <svg width="100%" viewBox={`0 0 ${LABEL_W + CHART_W + 150} ${svgH}`} className="overflow-visible">
          {[0, 0.25, 0.5, 0.75, 1].map(pct => (
            <g key={pct}>
              <line x1={LABEL_W + pct * CHART_W} y1={0} x2={LABEL_W + pct * CHART_W} y2={svgH - 30}
                stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4,4" className="opacity-40" />
              <text x={LABEL_W + pct * CHART_W} y={svgH - 10} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))" className="font-mono font-medium">
                {fmtDur(pct * maxMs)}
              </text>
            </g>
          ))}

          {renderItems.map((item, ri) => {
            if (item.type === 'header') {
              const y = yPos;
              yPos += PAGE_HEADER_H + 4;
              const sectionColor = PAGE_SECTION_COLORS[item.colorIdx % PAGE_SECTION_COLORS.length];
              return (
                <g key={`hdr-${ri}`}>
                  <rect x={0} y={y} width={LABEL_W + CHART_W + 120} height={PAGE_HEADER_H} rx={4} fill={sectionColor} fillOpacity={0.08} />
                  <line x1={0} y1={y} x2={LABEL_W + CHART_W + 120} y2={y} stroke={sectionColor} strokeWidth={1.5} strokeOpacity={0.3} />
                  <text x={8} y={y + PAGE_HEADER_H / 2 + 4} fontSize={10} fill={sectionColor} className="font-black uppercase" letterSpacing={1.5}>
                    ▸ {item.label}
                  </text>
                </g>
              );
            }

            const bi = barIdx++;
            const bd = barData[bi];
            const y = yPos;
            yPos += BAR_H + GAP;
            const x = LABEL_W + (bd.startPct / 100) * CHART_W;
            const w = (bd.widthPct / 100) * CHART_W;
            const config = cfg(item.step.status);
            const isFail = config.label === 'FAILED';
            const color = isFail ? '#ef4444' : STEP_COLORS[bi % STEP_COLORS.length];

            return (
              <motion.g key={item.step.id ?? ri} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: bi * 0.02 }}>
                <text x={LABEL_W - 12} y={y + BAR_H / 2 + 4} textAnchor="end" fontSize={10} fill="hsl(var(--foreground))" className="font-bold tracking-tight">
                  {item.step.step_name}
                </text>
                <rect x={LABEL_W} y={y} width={CHART_W} height={BAR_H} rx={6} fill="hsl(var(--muted))" className="opacity-20" />
                <defs>
                  <linearGradient id={`grad-${bi}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={color} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <rect x={x} y={y} width={w} height={BAR_H} rx={6} fill={`url(#grad-${bi})`} className="cursor-help hover:brightness-110 transition-all shadow-sm" />
                <g transform={`translate(${x + w + 8}, ${y + BAR_H / 2 - 8})`}>
                  <circle r={8} fill={config.bg} cx={8} cy={8} />
                  <text x={8} y={11} textAnchor="middle" fontSize={10} fill={color} className="font-bold">{isFail ? '!' : '✓'}</text>
                </g>
                <text x={x + w + 28} y={y + BAR_H / 2 + 4} fontSize={10} fill="hsl(var(--muted-foreground))" className="font-mono font-bold">{fmtDur(bd.dur)}</text>
              </motion.g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function FileDetails({ fileId, onBack }: { fileId: string; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'waterfall' | 'table'>('waterfall');
  const [showAllRaw, setShowAllRaw] = useState(false);

  const { data: steps, isLoading, isFetching } = useQuery<ProcessingStep[]>({
    queryKey: ['file-details', fileId],
    queryFn: () => getFileDetails(fileId),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="animate-spin text-blue-500" style={{ width: 40, height: 40 }} />
        <p className="text-sm font-bold text-muted-foreground animate-pulse uppercase tracking-widest">Hydrating Pipeline Data...</p>
      </div>
    );
  }

  const first = steps?.[0];
  const overallStatus = steps?.some(s => cfg(s.status).label === 'FAILED')
    ? 'failed'
    : steps?.length && steps.every(s => cfg(s.status).label === 'SUCCESS')
      ? 'success'
      : (steps?.length ?? 0) > 0 ? 'in progress' : 'pending';

  const totalDuration = steps?.reduce((a, s) => a + (s.duration_ms ?? 0), 0) ?? 0;
  const pageCount = new Set((steps ?? []).map(s => s.page_number).filter(p => p != null)).size;

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto pb-12">
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack} 
          className="group flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all px-3 py-1.5 rounded-lg hover:bg-muted"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> 
          BACK TO PIPELINE
        </button>
        
        {isFetching && (
          <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
            <Activity size={10} className="animate-pulse" />
            LIVE POLLING
          </div>
        )}
      </div>

      {/* Main Info Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/50 backdrop-blur-md border border-border rounded-2xl overflow-hidden shadow-xl"
      >
        <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-transparent p-6 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-500 border border-blue-500/20">
                <FileText size={24} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-black tracking-tight text-foreground">{first?.file_name || 'System File'}</h1>
                  <Badge status={overallStatus} />
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Database size={12} /> {fileId.slice(0, 18)}...
                  </span>
                  <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
                  <span className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[10px]">
                    {first?.file_type || 'Unknown Type'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-4">
              {[
                { label: 'Steps', val: steps?.length ?? 0, icon: Activity, color: 'text-blue-400' },
                { label: 'Pages', val: pageCount || '—', icon: Layers, color: 'text-cyan-400' },
                { label: 'Runtime', val: fmtDur(totalDuration), icon: Timer, color: 'text-purple-400' },
                { label: 'Owner', val: first?.user_name?.split(' ')[0] || 'System', icon: UserIcon, color: 'text-emerald-400' },
                { label: 'Started', val: fmtDate(first?.created_at).split(',')[0], icon: Calendar, color: 'text-orange-400' },
              ].map(stat => (
                <div key={stat.label} className="flex flex-col items-center p-2 rounded-xl bg-muted/30 border border-border/20">
                  <stat.icon size={14} className={`${stat.color} mb-1`} />
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">{stat.label}</span>
                  <span className="text-xs font-bold text-foreground">{stat.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-0 flex gap-4 border-b border-border bg-muted/10">
          {(['waterfall', 'table'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? 'text-blue-400' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'waterfall' ? 'Execution View' : 'Step Table'}
              {activeTab === tab && (
                <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'waterfall' ? (
              <motion.div 
                key="waterfall"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-muted/10 rounded-2xl p-6 border border-border/50"
              >
                {(!steps || steps.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="p-4 bg-muted rounded-full text-muted-foreground">
                      <Clock size={32} />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Awaiting Pipeline Activation...</p>
                  </div>
                ) : (
                  <WaterfallChart steps={steps} />
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="table"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-muted/10 rounded-2xl overflow-hidden border border-border/50"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        {['#', 'Page', 'Process Step', 'Status', 'Duration', 'Executed At', 'Actions'].map(h => (
                          <th key={h} className="px-5 py-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const groups = groupStepsByPage(steps ?? []);
                        const hasPages = groups.some(g => g.pageNumber != null);
                        let rowIdx = 0;
                        return groups.flatMap((group, gi) => {
                          const rows: React.ReactNode[] = [];
                          if (hasPages) {
                            const sc = PAGE_SECTION_COLORS[gi % PAGE_SECTION_COLORS.length];
                            rows.push(
                              <tr key={`pg-${gi}`} style={{ backgroundColor: `${sc}0D` }}>
                                <td colSpan={7} className="px-5 py-2.5">
                                  <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: sc }}>
                                    ▸ {group.pageLabel} — {group.steps.length} steps
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                          for (const step of group.steps) {
                            rowIdx++;
                            rows.push(
                              <tr key={step.id ?? rowIdx} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors group">
                                <td className="px-5 py-4 font-mono text-[10px] text-muted-foreground">{String(rowIdx).padStart(2, '0')}</td>
                                <td className="px-5 py-4 font-mono text-[10px] text-muted-foreground">{step.page_number != null ? `P${step.page_number}` : '—'}</td>
                                <td className="px-5 py-4">
                                  <span className="font-black text-foreground tracking-tight">{step.step_name}</span>
                                </td>
                                <td className="px-5 py-4"><Badge status={step.status} /></td>
                                <td className="px-5 py-4 font-mono font-bold text-muted-foreground">{fmtDur(step.duration_ms)}</td>
                                <td className="px-5 py-4 text-muted-foreground font-medium text-[10px]">{fmtDate(step.created_at)}</td>
                                <td className="px-5 py-4">
                                  <div className="flex gap-2">
                                    {step.output_summary && Object.keys(step.output_summary).length > 0 && (
                                      <Collapsible title="Insights (JSON)">
                                        <pre className="text-[10px] text-blue-300 font-mono overflow-x-auto max-h-60 scrollbar-hide bg-slate-900/50 p-2 rounded border border-blue-500/10">
                                          {JSON.stringify(step.output_summary, null, 2)}
                                        </pre>
                                      </Collapsible>
                                    )}
                                    <Collapsible title="Log Trace (JSON)">
                                      <pre className="text-[10px] text-muted-foreground font-mono overflow-x-auto max-h-72 scrollbar-hide bg-slate-950/50 p-2 rounded border border-border/20">
                                        {JSON.stringify(step, null, 2)}
                                      </pre>
                                    </Collapsible>
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                          return rows;
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Footer / Raw Data Toggle */}
      <div className="flex justify-center">
        <button 
          onClick={() => setShowAllRaw(!showAllRaw)}
          className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-blue-400 transition-colors py-2 px-4 border border-border rounded-full bg-card/30 hover:bg-blue-400/5 hover:border-blue-400/20"
        >
          {showAllRaw ? '◓ Conceal System Logs' : '◑ Reveal Raw Data Structure'}
        </button>
      </div>

      <AnimatePresence>
        {showAllRaw && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-inner font-mono text-[10px] text-slate-400 custom-scrollbar overflow-x-auto max-h-[600px]">
              <pre>{JSON.stringify(steps, null, 2)}</pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

