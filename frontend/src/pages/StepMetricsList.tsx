import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStepMetrics, StepMetricItem, PaginatedResponse } from '@/lib/api';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 100;

function statusStyle(raw: string): string {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('complete') || s.includes('success') || s.includes('comp'))
    return 'bg-green-500/15 text-green-500 border border-green-500/25';
  if (s.includes('error') || s.includes('fail'))
    return 'bg-red-500/15 text-red-500 border border-red-500/25';
  if (s.includes('progress') || s.includes('running') || s.includes('prog'))
    return 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/25';
  if (s.includes('queue') || s.includes('pending'))
    return 'bg-blue-500/15 text-blue-500 border border-blue-500/25';
  if (s.includes('skip'))
    return 'bg-gray-500/15 text-gray-400 border border-gray-500/25';
  return 'bg-muted text-muted-foreground border border-border';
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-US', {
      month: '2-digit', day: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
}

function shortId(id: string) {
  return id ? id.replace(/-/g, '').slice(0, 8).toUpperCase() : '—';
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
  return `${(ms / 60000).toFixed(1)} min`;
}

export default function StepMetricsList() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery<PaginatedResponse<StepMetricItem>>({
    queryKey: ['step_metrics', page],
    queryFn: () => getStepMetrics(page * PAGE_SIZE, PAGE_SIZE),
    refetchInterval: 5000,
  });

  const metrics = data?.items ?? [];
  const totalRecords = data?.total ?? 0;
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-primary" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  // Summary counts for this page
  const counts = { complete: 0, error: 0, other: 0 };
  metrics.forEach(m => {
    const s = (m.status ?? '').toLowerCase();
    if (s.includes('complete') || s.includes('success') || s.includes('comp')) counts.complete++;
    else if (s.includes('error') || s.includes('fail')) counts.error++;
    else counts.other++;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">
          Step Metrics ({totalRecords.toLocaleString()} total)
        </h2>
        <div className="flex gap-2">
          <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/25 px-2.5 py-1 rounded-full font-bold">
            ✓ {counts.complete} Complete
          </span>
          <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/25 px-2.5 py-1 rounded-full font-bold">
            ✕ {counts.error} Error
          </span>
        </div>
      </div>

      {totalRecords === 0 && (
        <div className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No step metrics found. Make sure <code className="text-xs bg-muted px-1 py-0.5 rounded">datasets/step_metrics.sql</code> has been imported into your database.
        </div>
      )}

      {totalRecords > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/60">
                {['ID', 'Job ID', 'File ID', 'Step Name', 'Status', 'Duration', 'Created At', 'Updated At'].map(h => (
                  <th key={h} className="px-3.5 py-2.5 text-left font-semibold text-muted-foreground border-b border-border whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-3.5 py-2.5">
                    <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-foreground" title={m.id}>
                      {shortId(m.id)}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    {m.job_id ? (
                      <Link
                        to={`/jobs?id=${m.job_id}`}
                        className="font-mono text-[11px] text-blue-400 hover:text-blue-300 hover:underline bg-blue-500/10 px-1.5 py-0.5 rounded transition-colors"
                        title={`Go to Job: ${m.job_id}`}
                      >
                        {shortId(m.job_id)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5">
                    {m.file_id ? (
                      <Link
                        to={`/file-details/${m.file_id}`}
                        className="font-mono text-[11px] text-blue-400 hover:text-blue-300 hover:underline bg-blue-500/10 px-1.5 py-0.5 rounded transition-colors"
                        title={`Go to File: ${m.file_id}`}
                      >
                        {shortId(m.file_id)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 font-medium text-foreground">{m.step_name}</td>
                  <td className="px-3.5 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusStyle(m.status)}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-muted-foreground font-mono">
                    {fmtDuration(m.duration_ms)}
                  </td>
                  <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(m.created_at)}</td>
                  <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(m.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">
          Showing {totalRecords === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalRecords)} of {totalRecords.toLocaleString()} metrics
        </div>
        <div className="flex items-center gap-1">
          <button title="Previous page" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="p-1.5 rounded-md border border-border bg-secondary text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs px-2 text-muted-foreground">Page {page + 1} of {Math.max(1, totalPages)}</span>
          <button title="Next page" disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} className="p-1.5 rounded-md border border-border bg-secondary text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
