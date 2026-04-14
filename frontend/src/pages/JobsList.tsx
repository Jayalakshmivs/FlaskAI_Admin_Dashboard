import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getJobs, JobItem, PaginatedResponse } from '@/lib/api';
import { Loader2, ChevronLeft, ChevronRight, Search, X, ExternalLink } from 'lucide-react';
import { useParams, useSearchParams, Link } from 'react-router-dom';

const PAGE_SIZE = 100;

// Handles both raw DB values (complete, in_progress, error) and
// any normalised variants that might come through.
function statusStyle(raw: string): string {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('complete') || s.includes('success'))
    return 'bg-green-500/15 text-green-500 border border-green-500/25';
  if (s.includes('error') || s.includes('fail'))
    return 'bg-red-500/15 text-red-500 border border-red-500/25';
  if (s.includes('progress') || s.includes('running'))
    return 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/25';
  if (s.includes('queue') || s.includes('pending'))
    return 'bg-blue-500/15 text-blue-500 border border-blue-500/25';
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

export default function JobsList() {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const job_id = jobId || searchParams.get('id') || '';
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery<PaginatedResponse<JobItem>>({
    queryKey: ['jobs', page, job_id],
    queryFn: () => getJobs(page * PAGE_SIZE, PAGE_SIZE, job_id),
  });

  const jobs = data?.items ?? [];
  const totalRecords = data?.total ?? 0;
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-primary" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">
          Jobs ({totalRecords.toLocaleString()} total)
        </h2>
        <div className="relative w-64">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full bg-background border border-border rounded-md pl-8 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Search Job ID…"
            value={job_id}
            onChange={e => {
              const val = e.target.value;
              if (val) setSearchParams({ id: val });
              else setSearchParams({});
              setPage(0);
            }}
          />
          {job_id && (
            <button
              onClick={() => { setSearchParams({}); setPage(0); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        {(() => {
          const counts = { complete: 0, in_progress: 0, error: 0, other: 0 };
          jobs.forEach(j => {
            const s = (j.job_status ?? '').toLowerCase();
            if (s.includes('complete') || s.includes('success')) counts.complete++;
            else if (s.includes('progress') || s.includes('running')) counts.in_progress++;
            else if (s.includes('error') || s.includes('fail')) counts.error++;
            else counts.other++;
          });
          return (
            <>
              <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/25 px-2.5 py-1 rounded-full font-bold">✓ {counts.complete} Complete</span>
              <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/25 px-2.5 py-1 rounded-full font-bold">⟳ {counts.in_progress} In Progress</span>
              <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/25 px-2.5 py-1 rounded-full font-bold">✕ {counts.error} Error</span>
            </>
          );
        })()}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/60">
              {['ID', 'Job Type', 'File ID', 'Status', 'Error', 'Created At', 'Started At', 'Finished At'].map(h => (
                <th key={h} className="px-3.5 py-2.5 text-left font-semibold text-muted-foreground border-b border-border whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3.5 py-10 text-center text-muted-foreground">No jobs found.</td>
              </tr>
            ) : jobs.map((job: JobItem) => (
              <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                <td className="px-3.5 py-2.5">
                  <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-foreground" title={job.id}>
                    {shortId(job.id)}
                  </span>
                </td>
                <td className="px-3.5 py-2.5">
                  {job.file_id ? (
                    <Link
                      to={`/file-details/${job.file_id}`}
                      className="inline-flex items-center gap-1.5 font-medium text-blue-400 hover:text-blue-500 hover:underline transition-colors group"
                    >
                      {job.jobType}
                      <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{job.jobType}</span>
                  )}
                </td>
                <td className="px-3.5 py-2.5">
                  {job.file_id ? (
                    <Link
                      to={`/file-details/${job.file_id}`}
                      className="font-mono text-[10px] text-muted-foreground hover:text-foreground hover:underline bg-muted/50 px-1.5 py-0.5 rounded transition-colors"
                      title={job.file_id}
                    >
                      {shortId(job.file_id)}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3.5 py-2.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusStyle(job.job_status)}`}>
                    {job.job_status}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 text-muted-foreground max-w-[200px] truncate" title={job.error_message ?? ''}>
                  {job.error_message || '—'}
                </td>
                <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(job.created_at)}</td>
                <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(job.started_at)}</td>
                <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(job.finished_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">
          Showing {totalRecords === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalRecords)} of {totalRecords.toLocaleString()} jobs
        </div>
        <div className="flex items-center gap-1">
          <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="p-1.5 rounded-md border border-border bg-secondary text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs px-2 text-muted-foreground">Page {page + 1} of {Math.max(1, totalPages)}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} className="p-1.5 rounded-md border border-border bg-secondary text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
