import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFiles, getStats, FileStats, FileItem, PaginatedResponse } from '@/lib/api';
import { 
  RefreshCw, Filter, Activity,
  ChevronLeft, ChevronRight, Calendar,
  Search, Download, Database, FileText, Loader2
} from 'lucide-react';

import { cn } from '@/lib/utils';

const RECENT_LIMIT = 50;

const STATUS_CFG: Record<string, { dot: string; bg: string; color: string; label: string }> = {
  success:       { dot: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-500/10',  color: 'text-emerald-600 dark:text-emerald-400', label: 'SUCCESS'     },
  failed:        { dot: '#ef4444', bg: 'bg-rose-50 dark:bg-rose-500/10',   color: 'text-rose-600 dark:text-rose-400', label: 'FAILED'      },
  'in progress': { dot: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-500/10',  color: 'text-amber-600 dark:text-amber-400', label: 'IN PROGRESS' },
  pending:       { dot: '#6366f1', bg: 'bg-indigo-50 dark:bg-indigo-500/10',  color: 'text-indigo-600 dark:text-indigo-400', label: 'PENDING'     },
};

function cfg(s: string) {
  if (!s) return STATUS_CFG.pending;
  const lower = s.toLowerCase();
  return STATUS_CFG[lower] || STATUS_CFG.pending;
}

export default function RecentFiles({ onSelectFile }: { onSelectFile: (id: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: stats } = useQuery<FileStats>({
    queryKey: ['stats-overview'],
    queryFn: () => getStats(),
  });

  const { data: response, isLoading: isFilesLoading, refetch } = useQuery<PaginatedResponse<FileItem>>({
    queryKey: ['recent-files', statusFilter, searchTerm],
    queryFn: () => getFiles(0, RECENT_LIMIT, statusFilter === 'all' ? undefined : statusFilter, searchTerm),
    refetchInterval: 10000,
  });

  const files = response?.items || [];

  return (
    <div className="space-y-6 page-transition">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Recent File Activity</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time processing registry and audit logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2.5 bg-card border border-border rounded-lg hover:bg-muted transition-colors shadow-sm">
            <RefreshCw size={18} className="text-muted-foreground" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold uppercase tracking-widest shadow-md hover:opacity-90 transition-opacity">
            <Download size={16} />
            Export Logs
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Registry', value: stats?.total_files, icon: Database, color: 'text-blue-500' },
          { label: 'Successful', value: stats?.total_success, icon: FileText, color: 'text-emerald-500' },
          { label: 'Failures', value: stats?.total_failures, icon: Activity, color: 'text-rose-500' },
          { label: 'Processing', value: stats?.total_in_progress, icon: Loader2, color: 'text-amber-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center gap-4">
            <div className={cn("p-3 rounded-lg bg-muted", stat.color)}>
              <stat.icon size={20} className={stat.label === 'Processing' ? 'animate-spin' : ''} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value ?? '...'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search by file name or ID..." 
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
             <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg border border-border">
                {['all', 'success', 'failed', 'in progress'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all",
                      statusFilter === s 
                        ? "bg-card text-foreground shadow-sm border border-border" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
             </div>
             <button className="p-2.5 bg-card border border-border rounded-lg hover:bg-muted transition-colors">
               <Filter size={18} className="text-muted-foreground" />
             </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {isFilesLoading ? (
          <div className="py-32 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-primary h-10 w-10" />
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Refreshing Registry...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Object Details</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Execution Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Principal</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Temporal Data</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {files.map((file) => {
                  const s = cfg(file.status);
                  return (
                    <tr key={file.file_id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors shadow-sm border border-border">
                            <FileText size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold truncate max-w-[200px]">{file.file_name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">ID: {file.file_id.slice(0, 15)}...</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={cn("px-2.5 py-1 rounded-md text-[10px] font-black uppercase inline-flex items-center gap-2 border shadow-sm", s.bg, s.color)}>
                          <div className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                          {s.label}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground border border-border">
                              {file.user_email.charAt(0).toUpperCase()}
                           </div>
                           <span className="text-xs font-medium truncate max-w-[150px]">{file.user_email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                             <Calendar size={12} className="text-muted-foreground" />
                             {new Date(file.created_at).toLocaleDateString()}
                           </span>
                           <span className="text-[10px] text-muted-foreground font-medium">{new Date(file.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button 
                          onClick={() => onSelectFile(file.file_id)}
                          className="px-4 py-2 bg-muted hover:bg-primary hover:text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-lg transition-all active:scale-95 shadow-sm border border-border"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Showing {files.length} of {stats?.total_files || 0} Records</p>
           <div className="flex items-center gap-2">
              <button className="p-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground opacity-50 cursor-not-allowed"><ChevronLeft size={16} /></button>
              <button className="p-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground"><ChevronRight size={16} /></button>
           </div>
        </div>
      </div>
    </div>
  );
}
