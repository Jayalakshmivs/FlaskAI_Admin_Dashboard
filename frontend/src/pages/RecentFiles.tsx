import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFiles, getStats, FileStats, FileItem, PaginatedResponse } from '@/lib/api';
import { Loader2, Download, Search, FileText, CheckCircle2, XCircle, Clock, Filter, List } from 'lucide-react';
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

function fmtDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
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
          <p key={p.name} style={{ color: p.payload.color }}>Count: <span className="font-bold">{p.value}</span></p>
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

  const { data, isLoading } = useQuery<PaginatedResponse<FileItem>>({
    queryKey: ['recent_files', search, emailSearch, idSearch, statusFilter],
    queryFn: () => getFiles(0, RECENT_LIMIT, statusFilter, search, emailSearch, idSearch),
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
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
        <p className="text-muted-foreground text-sm">Loading recent files...</p>
      </div>
    );
  }

  const statusData = stats ? [
    { name: 'success', value: stats.total_success, color: '#22c55e' },
    { name: 'failed', value: stats.total_failures, color: '#ef4444' },
    { name: 'in_progress', value: stats.total_in_progress, color: '#eab308' },
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
            <h1 className="text-lg font-bold text-foreground">Recent Files Explorer</h1>
            <p className="text-xs text-muted-foreground">Viewing top {files.length} out of {totalRecords} matching files</p>
          </div>
        </div>
        
        <button
          onClick={() => exportCSV(files)}
          className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm hover:bg-primary/20 transition-colors"
        >
          <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Filters and Chart */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          
          {/* Filters Card */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              Filter Results
            </h3>
            
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  placeholder="Search filename..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>
              
              <div className="relative">
                <select 
                  value={statusFilter} 
                  onChange={e => setStatus(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 outline-none appearance-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="in_progress">In Progress</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Chart Card */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm hidden lg:block">
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Status Distribution</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 10, fill: 'hsl(var(--muted-foreground))'}} tickFormatter={(v) => v.replace('_', ' ')} />
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

        </div>

        {/* Right Column: Table */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">File ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {files.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-16 text-muted-foreground border-2 border-dashed border-border m-4 rounded-lg bg-muted/10 block w-[calc(100%-2rem)] mx-auto mt-4 mb-4">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="w-8 h-8 opacity-20" />
                          <span>No files match your search criteria.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    files.map(file => (
                      <tr 
                        key={file.file_id} 
                        onClick={() => onSelectFile(file.file_id)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-4 w-32">
                          <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors bg-muted px-2 py-1 rounded">
                            {shortId(file.file_id)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                              <FileText className="w-4 h-4 text-blue-500" />
                            </div>
                            <span className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {file.file_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 w-32">
                          <StatusBadge status={file.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}