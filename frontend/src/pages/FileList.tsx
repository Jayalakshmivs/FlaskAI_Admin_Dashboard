import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFiles, getStats, FileStats, FileItem, PaginatedResponse } from '@/lib/api';
import { Loader2, Search, Download, ArrowUp, ArrowDown, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

type SortDir = 'asc' | 'desc';
const PAGE_SIZE = 100;


const STATUS_STYLES: Record<string, string> = {
  success: 'bg-green-500/15 text-green-500 border border-green-500/25',
  complete: 'bg-green-500/15 text-green-500 border border-green-500/25',
  completed: 'bg-green-500/15 text-green-500 border border-green-500/25',
  indexed: 'bg-green-500/15 text-green-500 border border-green-500/25',
  failure: 'bg-red-500/15 text-red-500 border border-red-500/25',
  failed: 'bg-red-500/15 text-red-500 border border-red-500/25',
  error: 'bg-red-500/15 text-red-500 border border-red-500/25',
  'in progress': 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/25',
  running: 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/25',
  pending: 'bg-blue-500/15 text-blue-500 border border-blue-500/25',
};

function getStatusStyle(status: string) {
  if (!status) return STATUS_STYLES['pending'];
  const s = status.toLowerCase();
  if (s.includes('success') || s.includes('complete') || s.includes('indexed')) return STATUS_STYLES['success'];
  if (s.includes('fail') || s.includes('error')) return STATUS_STYLES['failed'];
  if (s.includes('progress') || s.includes('running')) return STATUS_STYLES['in progress'];
  if (s.includes('pending')) return STATUS_STYLES['pending'];
  return STATUS_STYLES['in progress'];
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function shortId(id: string) {
  return id ? id.replace(/-/g, '').slice(0, 5).toUpperCase() : '—';
}

function exportCSV(files: FileItem[]) {
  const header = 'File ID,File Name,Email,Type,Status,Created At,Updated At';
  const rows = files.map(f =>
    [f.file_id, f.file_name, f.user_email, f.file_type, f.status, f.created_at, f.updated_at].join(',')
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'files.csv'; a.click();
}

export default function FileList({ onSelectFile }: { onSelectFile: (id: string) => void }) {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [emailSearch, setEmail] = useState(searchParams.get('email') ?? '');
  const [idSearch, setId] = useState('');
  const [statusFilter, setStatus] = useState('All');
  const [dateRange, setDate] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  // Always filter by source = 'system'
  const source = 'system';

  const { data, isLoading } = useQuery<PaginatedResponse<FileItem>>({
    queryKey: ['files', page, search, emailSearch, idSearch, statusFilter, startDate, endDate, source],
    queryFn: () => getFiles(
      page * PAGE_SIZE, 
      PAGE_SIZE, 
      statusFilter, 
      search, 
      emailSearch, 
      idSearch,
      startDate,
      endDate,
      source
    ),
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery<FileStats>({
    queryKey: ['stats', 'system'],
    queryFn: () => getStats('system'),
    refetchInterval: 5000,
  });

  const files = data?.items ?? [];
  const totalRecords = data?.total ?? 0;
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-primary" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  // Use GLOBAL stats for the chart if available
  const statusData = stats ? [
    { name: 'success', value: stats.total_success, color: '#22c55e' },
    { name: 'failed', value: stats.total_failures, color: '#ef4444' },
    { name: 'in progress', value: stats.total_in_progress, color: '#eab308' },
  ].filter(d => d.value > 0) : [];

  const FILE_TYPE_COLORS: Record<string, string> = {
    pdf: 'bg-blue-500/15 text-blue-500',
    pptx: 'bg-orange-500/15 text-orange-500',
    cdxml: 'bg-purple-500/15 text-purple-500',
    docx: 'bg-indigo-500/15 text-indigo-500',
  };

  const labelCls = 'text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block';
  const inputCls = 'w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="flex gap-0 animate-in fade-in duration-500">

      {/* ── Left Filter Panel (RESTORED) ── */}
      <div className="w-44 min-w-[160px] pr-6 flex-shrink-0">
        <div className="text-[10px] font-bold text-muted-foreground mb-4 uppercase tracking-wider">Filters</div>
        <div className="flex flex-col gap-3.5">
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} placeholder="Filter by email…" value={emailSearch} onChange={e => { setEmail(e.target.value); setPage(0); }} />
          </div>
          <div>
            <label className={labelCls}>File ID</label>
            <input className={inputCls} placeholder="Partial ID…" value={idSearch} onChange={e => { setId(e.target.value); setPage(0); }} />
          </div>
          <div>
            <label className={labelCls}>File Name</label>
            <input className={inputCls} placeholder="Contains…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(0); }} title="Status Filter">
              {['All', 'success', 'failed', 'in progress'].map(s => <option key={s} value={s}>{s === 'All' ? 'All' : s.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date Range</label>
            <select
              className={inputCls}
              value={dateRange}
              onChange={e => {
                const val = e.target.value;
                setDate(val);
                setPage(0);
                if (val !== 'Custom') {
                  // Set startDate/endDate based on predefined ranges
                  const now = new Date();
                  let start = '';
                  if (val === 'Today') start = new Date(now.setHours(0,0,0,0)).toISOString();
                  else if (val === 'Week') start = new Date(now.setDate(now.getDate() - 7)).toISOString();
                  else if (val === 'Month') start = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
                  setStartDate(start);
                  setEndDate(''); // Clear end date for predefines
                }
              }}
              title="Date Range Filter"
            >
              {['All', 'Today', 'Week', 'Month', 'Custom'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          {dateRange === 'Custom' && (
            <div className="flex flex-col gap-2">
              <div>
                <label className={labelCls}>Start Date</label>
                <input type="date" className={inputCls} value={startDate} onChange={e => { setStartDate(e.target.value); setPage(0); }} title="Start Date" placeholder="Start Date" />
              </div>
              <div>
                <label className={labelCls}>End Date</label>
                <input type="date" className={inputCls} value={endDate} onChange={e => { setEndDate(e.target.value); setPage(0); }} title="End Date" placeholder="End Date" />
              </div>
            </div>
          )}
          <button
            onClick={() => { setSearch(''); setEmail(''); setId(''); setStatus('All'); setDate('All'); setStartDate(''); setEndDate(''); setPage(0); /* source stays 'system' */ }}
            className="text-[11px] text-destructive hover:underline text-left mt-1"
          >
            ✕ Clear filters
          </button>
        </div>
      </div>

      {/* ── Right Content ── */}
      <div className="flex-1 min-w-0">

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className={inputCls + ' pl-8'} placeholder="Quick filter…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <button
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium border border-border bg-secondary text-foreground hover:bg-muted transition-colors"
          >
            {sortDir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
            {sortDir === 'desc' ? 'Newest' : 'Oldest'}
          </button>
          <button
            onClick={() => files.length && exportCSV(files)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium border border-border bg-secondary text-foreground hover:bg-muted transition-colors"
          >
            <Download size={12} /> Export
          </button>
        </div>

        {/* ── Volume by Status Chart (RESTORED) ── */}
        <div className="mb-6">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm h-48">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-blue-400" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Volume by Status (Global)</span>
              </div>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">N={totalRecords.toLocaleString()}</span>
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={statusData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', fontSize: '10px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusData.map((_entry: any, index: number) => (
                    <Cell key={index} fill={_entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/60">
                {['ID', 'File Name', 'Job ID', 'Email', 'Type', 'Status', 'Updated At'].map(h => (
                  <th key={h} className="px-3.5 py-2.5 text-left font-semibold text-muted-foreground border-b border-border whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {files.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3.5 py-10 text-center text-muted-foreground">No files match your filters.</td>
                </tr>
              ) : files.map((file) => (
                <tr
                  key={file.file_id}
                  onClick={() => onSelectFile(file.file_id)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                >
                  <td className="px-3.5 py-2.5">
                    <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-foreground" title={file.file_id}>
                      {shortId(file.file_id)}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 font-medium text-foreground">{file.file_name}</td>
                  <td className="px-3.5 py-2.5">
                    {file.job_id ? (
                      <Link 
                        to={`/jobs?id=${file.job_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-[10px] text-blue-400 hover:text-blue-500 hover:underline bg-blue-500/10 px-1.5 py-0.5 rounded transition-colors"
                        title={file.job_id}
                      >
                        {shortId(file.job_id)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-muted-foreground">{file.user_name || file.user_email || '—'}</td>
                  <td className="px-3.5 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${FILE_TYPE_COLORS[file.file_type?.toLowerCase()] ?? 'bg-muted text-muted-foreground'}`}>
                      {file.file_type}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusStyle(file.status)}`}>
                      {file.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(file.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination & Move to Next File ── */}
        <div className="flex items-center justify-between mt-3">
          <div className="text-[11px] text-muted-foreground">
            Showing {totalRecords === 0 ? 0 : Math.min(page * PAGE_SIZE + 1, totalRecords)}–{Math.min((page + 1) * PAGE_SIZE, totalRecords)} of {totalRecords.toLocaleString()} files
          </div>
          <div className="flex items-center gap-2">
            <button
              title="Previous Page"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="p-1.5 rounded-md border border-border bg-secondary text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs px-2 text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <button
              title="Next Page"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              className="p-1.5 rounded-md border border-border bg-secondary text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            {/* Move to Next File Button */}
            <button
              disabled={files.length === 0}
              onClick={() => {
                if (files.length > 0) {
                  const idx = files.findIndex(f => f.status && getStatusStyle(f.status) === STATUS_STYLES['in progress']);
                  if (idx >= 0 && idx < files.length - 1) {
                    onSelectFile(files[idx + 1].file_id);
                  } else if (files.length > 1) {
                    onSelectFile(files[1].file_id);
                  } else {
                    onSelectFile(files[0].file_id);
                  }
                }
              }}
              className="ml-2 px-3 py-1.5 rounded-md border border-border bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Move to next file"
            >
              Next File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
