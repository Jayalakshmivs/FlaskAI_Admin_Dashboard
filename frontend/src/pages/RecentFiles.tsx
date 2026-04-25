import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFiles, getStats, FileStats, FileItem, PaginatedResponse } from '@/lib/api';
import { Loader2, Download, Search, FileText, CheckCircle2, XCircle, Clock, Filter, List, X, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const RECENT_LIMIT = 50;

function normalizeStatus(status: string) {
  if (!status) return 'in_progress';
  return status.toLowerCase().replace(' ', '_');
}

function StatusBadge({ status }: { status: string }) {
  const s = normalizeStatus(status);
  if (s.includes('success') || s.includes('complete')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/25">
        <CheckCircle2 className="w-3 h-3" /> Success
      </span>
    );
  }
  if (s.includes('fail') || s.includes('error')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/25">
        <XCircle className="w-3 h-3" /> Failure
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
      <Clock className="w-3 h-3" /> In Progress
    </span>
  );
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function shortId(id: string) {
  return id ? id.replace(/-/g, '').slice(0, 8).toUpperCase() : '—';
}

function exportCSV(files: FileItem[]) {
  const header = 'File ID,File Name,Email,Type,Status,Created At,Updated At';
  const rows = files.map(f =>
    [f.file_id, f.file_name, f.user_email, f.file_type, f.status, f.created_at, f.updated_at].join(',')
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'recent-files.csv';
  a.click();
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
        <p className="font-semibold text-foreground mb-1 capitalize">{label.replace('_', ' ')}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.payload.color }}>Volume: <span className="font-bold">{p.value}</span></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function RecentFiles({ onSelectFile }: { onSelectFile: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [emailSearch, setEmail] = useState('');
  const [idSearch, setId] = useState('');
  const [statusFilter, setStatus] = useState('All');
  const [dateRange, setDateRange] = useState('All');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery<PaginatedResponse<FileItem>>({
    queryKey: ['recent_files', search, emailSearch, idSearch, statusFilter, page],
    queryFn: () => getFiles(page * RECENT_LIMIT, RECENT_LIMIT, statusFilter, search, emailSearch, idSearch),
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery<FileStats>({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 5000,
  });

  const files = data?.items ?? [];
  const totalRecords = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / RECENT_LIMIT));

  const clearFilters = () => {
    setSearch('');
    setEmail('');
    setId('');
    setStatus('All');
    setDateRange('All');
    setPage(0);
  };

  const statusData = stats ? [
    { name: 'Success', value: stats.total_success, color: '#22c55e' },
    { name: 'Failure', value: stats.total_failures, color: '#ef4444' },
    { name: 'In Progress', value: stats.total_in_progress, color: '#eab308' },
  ] : [];

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg border border-blue-500/20">
            <List className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Recent Files</h1>
          </div>
        </div>
        <button
          onClick={() => window.history.back()}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          ← Back
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Filters (Sidebar style) */}
        <div className="lg:w-64 flex-shrink-0 flex flex-col gap-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filters</h3>
            
            <div className="space-y-4">
              {/* Email Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                <input 
                  placeholder="Filter by email..." 
                  value={emailSearch} 
                  onChange={e => { setEmail(e.target.value); setPage(0); }}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>

              {/* File ID Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">File ID</label>
                <input 
                  placeholder="Partial ID..." 
                  value={idSearch} 
                  onChange={e => { setId(e.target.value); setPage(0); }}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>

              {/* File Name Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">File Name</label>
                <input 
                  placeholder="Contains..." 
                  value={search} 
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>
              
              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                <div className="relative">
                  <select 
                    value={statusFilter} 
                    onChange={e => { setStatus(e.target.value); setPage(0); }}
                    className="w-full pl-3 pr-8 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 outline-none appearance-none"
                  >
                    <option value="All">All</option>
                    <option value="success">Success</option>
                    <option value="failed">Failure</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    ▼
                  </div>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date Range</label>
                <div className="relative">
                  <select 
                    value={dateRange} 
                    onChange={e => { setDateRange(e.target.value); setPage(0); }}
                    className="w-full pl-3 pr-8 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 outline-none appearance-none"
                  >
                    <option value="All">All</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {(search || emailSearch || idSearch || statusFilter !== 'All' || dateRange !== 'All') && (
              <button 
                onClick={clearFilters}
                className="text-red-500 hover:text-red-400 text-sm flex items-center gap-1 transition-colors"
              >
                <X className="w-4 h-4" /> Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Chart & Table */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Top Actions Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                placeholder="Quick filter..." 
                value={search} 
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-card text-foreground border border-border rounded-lg text-sm hover:bg-muted transition-colors">
              ↓ Newest
            </button>
            <button
              onClick={() => exportCSV(files)}
              className="flex items-center gap-2 px-4 py-2 bg-card text-foreground border border-border rounded-lg text-sm hover:bg-muted transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          </div>

          {/* Chart Card */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Volume By Status (Global)
              </h3>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded font-mono font-medium">N={totalRecords}</span>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} barCategoryGap="20%" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 10, fill: 'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 10, fill: 'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted)/0.5)'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col relative min-h-[300px]">
            {isLoading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">ID</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">File Name</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Job ID</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Email</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Type</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Updated At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(!isLoading && files.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-muted-foreground">
                        No files match your filters.
                      </td>
                    </tr>
                  ) : (
                    files.map(file => (
                      <tr 
                        key={file.file_id} 
                        onClick={() => onSelectFile(file.file_id)}
                        className="hover:bg-muted/40 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                            {shortId(file.file_id)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                          {file.file_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground">
                            {shortId(file.job_id || '')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[150px]">
                          {file.user_email || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {file.file_type || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={file.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {fmtDate(file.updated_at || file.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="border-t border-border p-4 flex items-center justify-between bg-card mt-auto">
              <span className="text-xs text-muted-foreground">
                Showing {totalRecords === 0 ? 0 : page * RECENT_LIMIT + 1}–{Math.min((page + 1) * RECENT_LIMIT, totalRecords)} of {totalRecords} files
              </span>
              
              <div className="flex items-center gap-2">
                <button 
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded bg-muted/50 text-foreground border border-border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground px-2">
                  Page {page + 1} of {totalPages}
                </span>
                <button 
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded bg-muted/50 text-foreground border border-border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}