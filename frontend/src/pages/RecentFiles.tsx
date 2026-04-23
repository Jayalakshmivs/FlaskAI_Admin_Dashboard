import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFiles, getStats, FileStats, FileItem, PaginatedResponse } from '@/lib/api';
import { Loader2, BarChart3, Download, Search } from 'lucide-react';
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const RECENT_LIMIT = 50;

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-green-500/15 text-green-500 border border-green-500/25',
  failed: 'bg-red-500/15 text-red-500 border border-red-500/25',
  'in progress': 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/25',
};

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
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'recent-files.csv'; a.click();
}

export default function RecentFiles({ onSelectFile }: { onSelectFile: (id: string) => void }) {
  // Filter state
  const [search, setSearch] = useState('');
  const [emailSearch, setEmail] = useState('');
  const [idSearch, setId] = useState('');
  const [statusFilter, setStatus] = useState('All');
  const [dateRange, setDate] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch recent files (page 0, showing limited count)
  const { data, isLoading } = useQuery<PaginatedResponse<FileItem>>({
    queryKey: ['recent_files', search, emailSearch, idSearch, statusFilter, startDate, endDate],
    queryFn: () => getFiles(0, RECENT_LIMIT, statusFilter, search, emailSearch, idSearch, startDate, endDate),
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery<FileStats>({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 5000,
  });

  const files = data?.items ?? [];
  const totalRecords = data?.total ?? 0;

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

      {/* ── Left Filter Panel ── */}
      <div className="w-44 min-w-[160px] pr-6 flex-shrink-0">
        <div className="text-[10px] font-bold text-muted-foreground mb-4 uppercase tracking-wider">Filters</div>
        <div className="flex flex-col gap-3.5">
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} placeholder="Filter by email…" value={emailSearch} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>File ID</label>
            <input className={inputCls} placeholder="Partial ID…" value={idSearch} onChange={e => setId(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>File Name</label>
            <input className={inputCls} placeholder="Contains…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={statusFilter} onChange={e => setStatus(e.target.value)}>
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
                if (val !== 'Custom') {
                  const now = new Date();
                  let start = '';
                  if (val === 'Today') start = new Date(now.setHours(0,0,0,0)).toISOString();
                  else if (val === 'Week') start = new Date(now.setDate(now.getDate() - 7)).toISOString();
                  else if (val === 'Month') start = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
                  
                  setStartDate(start);
                  setEndDate('');
                }
              }}
            >
              {['All', 'Today', 'Week', 'Month', 'Custom'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          {dateRange === 'Custom' && (
            <div className="flex flex-col gap-2">
              <div>
                <label className={labelCls}>Start Date</label>
                <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>End Date</label>
                <input type="date" className={inputCls} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          )}
          <button
            onClick={() => { setSearch(''); setEmail(''); setId(''); setStatus('All'); setDate('All'); setStartDate(''); setEndDate(''); }}
            className="text-[11px] text-destructive hover:underline text-left mt-1"
          >
            ✕ Clear filters
          </button>
        </div>
      </div>

      {/* ── Right Content ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">Recent Files</h1>
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-md font-mono">
            Showing {Math.min(RECENT_LIMIT, files.length)} of {totalRecords.toLocaleString()} recent files
          </span>
        </div>

        {/* ── Volume by Status Chart ── */}
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

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={inputCls + ' pl-8'} placeholder="Quick filter…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => files.length && exportCSV(files)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium border border-border bg-secondary text-foreground hover:bg-muted transition-colors"
        >
          <Download size={12} /> Export
        </button>
      </div>

      {/* Table */}
      {files.length > 0 && (
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
              {files.map((file) => (
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_STYLES[file.status] ?? STATUS_STYLES['in progress']}`}>
                      {file.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(file.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {files.length === 0 && (
        <div className="text-center text-muted-foreground py-10">
          No recent files match your filters.
        </div>
      )}
      </div>
    </div>
  );
}
