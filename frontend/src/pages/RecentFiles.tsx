import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFiles, getStats, FileStats, FileItem, PaginatedResponse } from '@/lib/api';
import { 
  Loader2, Search, Download, 
  FileText, User as UserIcon, Database, 
  RefreshCw, Filter, ArrowRight, Activity 
} from 'lucide-react';
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const RECENT_LIMIT = 50;

const STATUS_CFG: Record<string, { dot: string; bg: string; color: string; label: string }> = {
  success:       { dot: '#10b981', bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'SUCCESS'     },
  failed:        { dot: '#ef4444', bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: 'FAILED'      },
  'in progress': { dot: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'IN PROGRESS' },
  pending:       { dot: '#6366f1', bg: 'rgba(99,102,241,0.1)',  color: '#6366f1', label: 'PENDING'     },
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

function fmtDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { 
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true 
  });
}

function shortId(id: string) {
  return id ? id.replace(/-/g, '').slice(0, 8).toUpperCase() : '—';
}

export default function RecentFiles({ onSelectFile }: { onSelectFile: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [emailSearch, setEmail] = useState('');
  const [idSearch, setId] = useState('');
  const [statusFilter, setStatus] = useState('All');

  const { data, isLoading, isFetching } = useQuery<PaginatedResponse<FileItem>>({
    queryKey: ['recent_files', search, emailSearch, idSearch, statusFilter],
    queryFn: () => getFiles(0, RECENT_LIMIT, statusFilter === 'All' ? undefined : statusFilter, search, emailSearch, idSearch),
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery<FileStats>({
    queryKey: ['stats'],
    queryFn: () => getStats(),
    refetchInterval: 5000,
  });

  const files = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <span className="text-sm font-black text-muted-foreground uppercase tracking-widest text-center">
          Monitoring Recent Activity...<br/>
          <span className="text-[10px] opacity-60 font-mono italic">Synchronizing with registry</span>
        </span>
      </div>
    );
  }

  const statusData = stats ? [
    { name: 'SUCCESS', value: stats.total_success, color: '#10b981' },
    { name: 'FAILED', value: stats.total_failures, color: '#ef4444' },
    { name: 'IN PROGRESS', value: stats.total_in_progress, color: '#f59e0b' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
            Inbound Stream
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 border border-border text-[10px] font-black uppercase tracking-widest ${isFetching ? 'text-blue-400' : 'text-muted-foreground'}`}>
              <RefreshCw size={10} className={isFetching ? 'animate-spin' : ''} />
              {isFetching ? 'Hydrating' : 'Live'}
            </div>
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Monitoring the latest {RECENT_LIMIT} items entering the pipeline.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl px-5 py-2.5 flex items-center gap-4 shadow-sm">
          <div className="text-right">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">In Stream</p>
            <p className="text-xl font-black text-foreground">{files.length}</p>
          </div>
          <div className="h-8 w-px bg-border/50" />
          <Activity size={20} className="text-blue-400" />
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-card/50 backdrop-blur-md border border-border rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              <Filter size={12} /> Search & Filters
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Identity</label>
                <div className="relative group">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-400 transition-colors" />
                  <input 
                    className="w-full bg-background/50 border border-border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all shadow-inner"
                    placeholder="Search by name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Status Policy</label>
                <select 
                  className="w-full bg-background/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all shadow-inner appearance-none cursor-pointer"
                  value={statusFilter}
                  onChange={e => setStatus(e.target.value)}
                >
                  <option value="All">ALL STATUSES</option>
                  <option value="success">SUCCESS ONLY</option>
                  <option value="failed">FAILED ONLY</option>
                  <option value="in progress">IN PROGRESS</option>
                </select>
              </div>

              <button 
                onClick={() => { setSearch(''); setStatus('All'); setEmail(''); setId(''); }}
                className="mt-2 w-full py-2 rounded-xl bg-muted/50 text-[10px] font-black text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest border border-border"
              >
                Reset Cluster
              </button>
            </div>
          </div>

          <div className="bg-card/50 backdrop-blur-md border border-border rounded-2xl p-4 shadow-xl h-48 overflow-hidden">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Volume Mix</p>
            <ResponsiveContainer width="100%" height="75%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '10px', borderRadius: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex-1 min-w-0 bg-card/50 backdrop-blur-md border border-border rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest">Descriptor</th>
                  <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest">Affinity</th>
                  <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest">Operational Status</th>
                  <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <AnimatePresence mode="popLayout">
                  {files.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-24 text-center text-muted-foreground font-bold italic uppercase tracking-widest">No matching records found in inbound stream.</td>
                    </tr>
                  ) : (
                    files.map((file, idx) => (
                      <motion.tr 
                        key={file.file_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.01 }}
                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => onSelectFile(file.file_id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform shadow-inner border border-blue-500/10">
                              <FileText size={18} />
                            </div>
                            <div>
                              <div className="font-black text-foreground text-sm tracking-tight group-hover:text-blue-400 transition-colors">{file.file_name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded" title={file.file_id}>{shortId(file.file_id)}</span>
                                <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{file.file_type}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-foreground font-bold">
                              <UserIcon size={12} className="text-muted-foreground" />
                              {file.user_name || file.user_email || 'System'}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-2">
                              Updated {fmtDate(file.updated_at)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={file.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {file.job_id && (
                              <Link 
                                to={`/jobs?id=${file.job_id}`}
                                onClick={e => e.stopPropagation()}
                                className="p-2 rounded-xl bg-muted/50 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-all border border-border"
                                title="View Cluster Job"
                              >
                                <Database size={14} />
                              </Link>
                            )}
                            <button className="px-3 py-1.5 rounded-xl bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                              Inspect <ArrowRight size={10} className="inline ml-1" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 bg-muted/20 border-t border-border flex items-center justify-between">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Live Stream Monitoring: {files.length} Registry Objects
            </div>
            <button 
              onClick={() => files.length && exportCSV(files)}
              className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-xl font-black uppercase tracking-widest border border-border bg-card text-muted-foreground hover:text-foreground transition-all"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function exportCSV(files: FileItem[]) {
  const header = 'File ID,File Name,Email,Type,Status,Created At,Updated At';
  const rows = files.map(f =>
    [f.file_id, f.file_name, f.user_email, f.file_type, f.status, f.created_at, f.updated_at].join(',')
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'recent-files.csv'; a.click();
}
