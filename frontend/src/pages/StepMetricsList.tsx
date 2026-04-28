import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStepMetrics, StepMetricItem, PaginatedResponse } from '@/lib/api';
import { 
  Loader2, ChevronLeft, ChevronRight, Activity, 
  Database, FileText, Zap, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_SIZE = 100;

const STATUS_CFG: Record<string, { dot: string; bg: string; color: string; label: string }> = {
  success:       { dot: '#10b981', bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'SUCCESS'     },
  failed:        { dot: '#ef4444', bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: 'FAILED'      },
  'in progress': { dot: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'IN PROGRESS' },
  pending:       { dot: '#6366f1', bg: 'rgba(99,102,241,0.1)',  color: '#6366f1', label: 'PENDING'     },
};

function cfg(s: string) {
  if (!s) return STATUS_CFG.pending;
  const lower = s.toLowerCase();
  if (lower.includes('success') || lower.includes('complete') || lower.includes('comp')) return STATUS_CFG.success;
  if (lower.includes('fail') || lower.includes('error') || lower.includes('err')) return STATUS_CFG.failed;
  if (lower.includes('progress') || lower.includes('running') || lower.includes('prog')) return STATUS_CFG['in progress'];
  return STATUS_CFG.pending;
}

function StatusBadge({ status }: { status: string }) {
  const c = cfg(status);
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase border"
      style={{ backgroundColor: c.bg, color: c.color, borderColor: `${c.dot}22` }}
    >
      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: c.dot }} />
      {c.label}
    </span>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function shortId(id: string) {
  return id ? id.replace(/-/g, '').slice(0, 8).toUpperCase() : '—';
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms.toFixed(0)} MS`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} S`;
  return `${(ms / 60000).toFixed(1)} MIN`;
}

export default function StepMetricsList() {
  const [page, setPage] = useState(0);

  const { data, isLoading, isFetching } = useQuery<PaginatedResponse<StepMetricItem>>({
    queryKey: ['step_metrics', page],
    queryFn: () => getStepMetrics(page * PAGE_SIZE, PAGE_SIZE),
    refetchInterval: 5000,
  });

  const metrics = data?.items ?? [];
  const totalRecords = data?.total ?? 0;
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <span className="text-sm font-black text-muted-foreground uppercase tracking-widest text-center">
          Monitoring Telemetry Stream...<br/>
          <span className="text-[10px] opacity-60 font-mono italic">Synchronizing signal buffers</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
            Signal Telemetry
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 border border-border text-[10px] font-black uppercase tracking-widest ${isFetching ? 'text-blue-400' : 'text-muted-foreground'}`}>
              <RefreshCw size={10} className={isFetching ? 'animate-spin' : ''} />
              {isFetching ? 'Refreshing' : 'Live'}
            </div>
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Monitoring low-level step execution metrics across all compute clusters.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-card border border-border rounded-2xl px-5 py-2.5 flex items-center gap-4 shadow-sm">
            <div className="text-right">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total Events</p>
              <p className="text-xl font-black text-foreground">{totalRecords.toLocaleString()}</p>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <Activity size={20} className="text-blue-400" />
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-card/50 backdrop-blur-md border border-border rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest">Signal Descriptor</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest">Source Links</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest text-center">Status</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest text-right">Latency</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <AnimatePresence mode="popLayout">
                {metrics.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-24 text-center text-muted-foreground font-bold italic uppercase tracking-widest">No telemetry signals found in buffer.</td>
                  </tr>
                ) : (
                  metrics.map((m, idx) => (
                    <motion.tr 
                      key={m.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (idx % 20) * 0.01 }}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 shadow-inner border border-blue-500/10">
                            <Zap size={18} />
                          </div>
                          <div>
                            <div className="font-black text-foreground text-sm tracking-tight">{m.step_name}</div>
                            <div className="font-mono text-[9px] text-muted-foreground mt-1 uppercase tracking-widest">SIG_{shortId(m.id)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          {m.job_id && (
                            <Link 
                              to={`/jobs?id=${m.job_id}`}
                              className="inline-flex items-center gap-2 font-mono text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <Database size={10} /> CLUSTER_{shortId(m.job_id)}
                            </Link>
                          )}
                          {m.file_id && (
                            <Link 
                              to={`/file-details/${m.file_id}`}
                              className="inline-flex items-center gap-2 font-mono text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              <FileText size={10} /> OBJECT_{shortId(m.file_id)}
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono text-[11px] font-black text-foreground bg-muted/50 px-2 py-1 rounded-lg border border-border">
                          {fmtDuration(m.duration_ms)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground font-medium whitespace-nowrap">
                        {fmtDate(m.created_at)}
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 bg-muted/20 border-t border-border flex items-center justify-between">
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Buffer Segment {page * PAGE_SIZE + 1} – {Math.min((page + 1) * PAGE_SIZE, totalRecords)} / {totalRecords.toLocaleString()}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <button 
                disabled={page === 0} 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-4 py-2 bg-card border border-border rounded-xl text-[10px] font-black text-foreground">
                PAGE {page + 1} <span className="text-muted-foreground mx-1">OF</span> {Math.max(1, totalPages)}
              </div>
              <button 
                disabled={page >= totalPages - 1} 
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

