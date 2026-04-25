import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStepMetrics } from '@/lib/api';
import { Loader2, ChevronLeft, ChevronRight, Activity, CheckCircle2, XCircle, Clock, LayoutDashboard, Search, FileText, Settings, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 100;

function normalizeStatus(s: string | undefined) {
  return (s || '').toLowerCase().replace(' ', '_');
}

function StatusBadge({ status }: { status: string | undefined }) {
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

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function shortId(id?: string) {
  return id ? id.replace(/-/g, '').slice(0, 8).toUpperCase() : '—';
}

function fmtDuration(ms?: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
  return `${(ms / 60000).toFixed(1)} min`;
}

const getStepIcon = (name: string) => {
  const n = (name || '').toLowerCase();
  if (n.includes('parse') || n.includes('extract')) return <FileText className="w-3.5 h-3.5" />;
  if (n.includes('store') || n.includes('db') || n.includes('index')) return <Database className="w-3.5 h-3.5" />;
  if (n.includes('process') || n.includes('compute')) return <Settings className="w-3.5 h-3.5" />;
  return <Activity className="w-3.5 h-3.5" />;
};

export default function StepMetricsList() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['step-metrics', page],
    queryFn: () => getStepMetrics(page * PAGE_SIZE, PAGE_SIZE),
    refetchInterval: 5000,
  });

  const metrics: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  const totalRecords = typeof data?.total === 'number' ? data.total : metrics.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 gap-4 flex-col">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
        <p className="text-muted-foreground text-sm">Loading metrics...</p>
      </div>
    );
  }

  const counts = { success: 0, failed: 0, in_progress: 0 };
  metrics.forEach((m) => {
    const s = normalizeStatus(m.status);
    if (s.includes('success')) counts.success++;
    else if (s.includes('fail')) counts.failed++;
    else counts.in_progress++;
  });

  return (
    <div className="flex flex-col gap-5">

      {/* Header and Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Step Metrics</h2>
            <p className="text-xs text-muted-foreground">{totalRecords} total records across all pipelines</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-background border border-border p-2 rounded-lg">
          <div className="flex items-center gap-1.5 px-3 border-r border-border">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm font-bold">{counts.success}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 border-r border-border">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-bold">{counts.failed}</span>
          </div>
          <div className="flex items-center gap-1.5 pl-3 pr-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-bold">{counts.in_progress}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">References</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Step Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {metrics.length > 0 ? (
                metrics.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      {shortId(m.id)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {m.job_id && (
                          <Link to={`/jobs?id=${m.job_id}`} className="text-xs text-blue-400 hover:text-blue-300 font-medium font-mono inline-flex items-center gap-1">
                            Job: {shortId(m.job_id)}
                          </Link>
                        )}
                        {m.file_id && (
                          <Link to={`/file-details/${m.file_id}`} className="text-xs text-purple-400 hover:text-purple-300 font-medium font-mono inline-flex items-center gap-1">
                            File: {shortId(m.file_id)}
                          </Link>
                        )}
                        {!m.job_id && !m.file_id && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 text-primary rounded border border-primary/20">
                          {getStepIcon(m.step_name)}
                        </div>
                        <span className="font-semibold text-sm">{m.step_name}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={m.status} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="inline-flex items-center px-2 py-1 rounded bg-muted border border-border text-xs font-medium">
                        {fmtDuration(m.duration_ms)}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {fmtDate(m.created_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground border-2 border-dashed border-border m-4 rounded-lg bg-muted/10">
                    <div className="flex flex-col items-center gap-2">
                      <Activity className="w-8 h-8 opacity-20" />
                      <span>Waiting for live metrics data...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-2">
        <button 
          disabled={page === 0} 
          onClick={() => setPage(p => p - 1)}
          className="flex items-center gap-1 px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <span className="text-xs font-medium text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-full">
          Page {page + 1} of {totalPages}
        </span>

        <button 
          disabled={page >= totalPages - 1} 
          onClick={() => setPage(p => p + 1)}
          className="flex items-center gap-1 px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}