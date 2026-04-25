import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFiles, getStats } from '@/lib/api';
import { Loader2, Search, Download, ArrowUp, ArrowDown, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const PAGE_SIZE = 100;

function fmtDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function exportCSV(files: any[]) {
  const header = 'File Name,Status,Created At';
  const rows = files.map(f => [f.file_name, f.status, f.created_at].join(','));
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'files.csv';
  a.click();
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
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
        <XCircle className="w-3 h-3" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
      <Clock className="w-3 h-3" /> In Progress
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.fill }}>{p.name}: <span className="font-bold">{p.value}</span></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function FileList({ onSelectFile }: { onSelectFile?: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['files', page],
    queryFn: () => getFiles(page * PAGE_SIZE, PAGE_SIZE),
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 5000,
  });

  const allFiles = data?.items ?? [];
  const totalRecords = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

  const filtered = allFiles
    .filter((f: any) => f.file_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'desc' ? -diff : diff;
    });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-primary w-6 h-6" />
      </div>
    );
  }

  const statusData = stats ? [
    { name: 'Success', value: stats.total_success, fill: '#22c55e' },
    { name: 'Failed', value: stats.total_failures, fill: '#ef4444' },
    { name: 'In Progress', value: stats.total_in_progress, fill: '#eab308' },
  ] : [];

  return (
    <div className="flex flex-col gap-5">

      {/* Mini chart */}
      {stats && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status Overview</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} barCategoryGap="40%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search file name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <button
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
        >
          {sortDir === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
          {sortDir === 'desc' ? 'Newest' : 'Oldest'}
        </button>

        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg text-sm hover:bg-primary/20 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {totalRecords} files
        </span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> File Name</div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  No files found
                </td>
              </tr>
            ) : filtered.map((file: any, idx: number) => (
              <tr
                key={idx}
                onClick={() => onSelectFile?.(file.id || file.file_name)}
                className="hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-foreground font-medium text-xs truncate max-w-[280px] group-hover:text-primary transition-colors">
                      {file.file_name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={file.status} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(file.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button
          disabled={page === 0}
          onClick={() => setPage(p => p - 1)}
          className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>
        <span className="text-xs text-muted-foreground">Page {page + 1} / {totalPages}</span>
        <button
          disabled={page >= totalPages - 1}
          onClick={() => setPage(p => p + 1)}
          className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}