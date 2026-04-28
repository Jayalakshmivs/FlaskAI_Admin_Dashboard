import { useQuery } from '@tanstack/react-query';
import { getJobs, JobItem, PaginatedResponse } from '@/lib/api';
import { 
  Loader2, Search, ArrowRight, Clock, CheckCircle2, 
  AlertTriangle, FileText, Database, Activity, RefreshCw, X
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_SIZE = 50;

const STATUS_CFG: Record<string, { bg: string; color: string; label: string; icon: any }> = {
  success:       { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'SUCCESS',     icon: CheckCircle2 },
  failed:        { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: 'FAILED',      icon: AlertTriangle },
  'in progress': { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'IN PROGRESS', icon: Clock },
  pending:       { bg: 'rgba(99,102,241,0.1)',  color: '#6366f1', label: 'PENDING',     icon: Activity },
};

function cfg(s: string) {
  if (!s) return STATUS_CFG.pending;
  const lower = s.toLowerCase();
  if (lower.includes('success') || lower.includes('complete') || lower.includes('indexed')) return STATUS_CFG.success;
  if (lower.includes('fail') || lower.includes('error')) return STATUS_CFG.failed;
  if (lower.includes('progress') || lower.includes('running')) return STATUS_CFG['in progress'];
  return STATUS_CFG.pending;
}

function StatusBadge({ status }: { status: string }) {
  const c = cfg(status);
  const Icon = c.icon;
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border"
      style={{ backgroundColor: c.bg, color: c.color, borderColor: `${c.color}22` }}
    >
      <Icon size={10} />
      {c.label}
    </span>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { 
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true 
  });
}

function shortId(id: string | null) {
  if (!id) return '—';
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export default function JobsList() {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = jobId || searchParams.get('id') || '';
  const [page, setPage] = useState(0);

  const { data, isLoading, isFetching } = useQuery<PaginatedResponse<JobItem>>({
    queryKey: ['jobs', page, search],
    queryFn: () => getJobs(page * PAGE_SIZE, PAGE_SIZE, search),
    refetchInterval: 5000, 
  });

  const jobs = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
            Job Pipeline
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Real-time status of all data ingestion and processing tasks.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-400 transition-colors" />
            <input 
              className="bg-card border border-border rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all w-64 shadow-inner"
              placeholder="Filter by Job ID..."
              value={search}
              onChange={e => {
                const val = e.target.value;
                if (val) setSearchParams({ id: val });
                else setSearchParams({});
                setPage(0);
              }}
            />
            {search && (
              <button 
                onClick={() => { setSearchParams({}); setPage(0); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-border bg-muted/20 ${isFetching ? 'text-blue-400 border-blue-400/30' : 'text-muted-foreground'}`}>
            <RefreshCw size={10} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Syncing' : 'Idle'}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-card/50 backdrop-blur-md border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest">ID / Type</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest">Status</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest">Timeline</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Hydrating Pipeline...</span>
                      </div>
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-24 text-center text-muted-foreground font-bold italic">No matching jobs found in the cluster.</td>
                  </tr>
                ) : (
                  jobs.map((job, idx) => (
                    <motion.tr 
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg text-muted-foreground group-hover:text-blue-500 transition-colors">
                            <Activity size={16} />
                          </div>
                          <div>
                            <div className="font-mono text-xs font-bold text-foreground" title={job.id}>{shortId(job.id)}</div>
                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-tight">{job.jobType}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={job.job_status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-foreground font-bold">
                            <Clock size={12} className="text-muted-foreground" />
                            {fmtDate(job.created_at)}
                          </div>
                          {job.finished_at && (
                            <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-2 pl-5">
                              Finished {fmtDate(job.finished_at)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {job.file_id ? (
                          <Link 
                            to={`/file-details/${job.file_id}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                          >
                            Track Step <ArrowRight size={12} />
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono italic">SYSTEM TASK</span>
                        )}
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
            Showing {total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold disabled:opacity-30 hover:bg-muted transition-colors"
            >
              Previous
            </button>
            <button 
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold disabled:opacity-30 hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

