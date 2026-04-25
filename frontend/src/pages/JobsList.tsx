import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getJobs } from '@/lib/api';
import { Loader2, ChevronLeft, ChevronRight, Search, Briefcase, CheckCircle2, XCircle, Clock, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const PAGE_SIZE = 100;

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase();
  if (s.includes('complete') || s.includes('success')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/25">
        <CheckCircle2 className="w-3 h-3" /> {status}
      </span>
    );
  }
  if (s.includes('error') || s.includes('fail')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/25">
        <XCircle className="w-3 h-3" /> {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
      <Clock className="w-3 h-3" /> {status}
    </span>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function shortId(id: string) {
  return id ? id.replace(/-/g, '').slice(0, 8).toUpperCase() : '—';
}

export default function JobsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const job_id = searchParams.get('id') || '';
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', page, job_id],
    queryFn: () => getJobs(page * PAGE_SIZE, PAGE_SIZE, job_id),
    refetchInterval: 5000,
  });

  const jobs = data?.items ?? [];
  const totalRecords = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="animate-spin text-primary w-6 h-6" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <Briefcase className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Jobs</h2>
            <p className="text-xs text-muted-foreground">{totalRecords} total records</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search Job ID..."
            value={job_id}
            onChange={(e) => {
              const val = e.target.value;
              if (val) setSearchParams({ id: val });
              else setSearchParams({});
              setPage(0);
            }}
            className="pl-9 pr-8 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-52"
          />
          {job_id && (
            <button
              onClick={() => { setSearchParams({}); setPage(0); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Job ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  No jobs found
                </td>
              </tr>
            ) : jobs.map((job: any) => (
              <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <span className="font-mono text-xs text-foreground font-bold">{shortId(job.id)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-muted px-2 py-1 rounded font-medium text-muted-foreground">
                    {job.jobType || '—'}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={job.job_status} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(job.created_at)}</td>
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
          className="flex items-center gap-1 px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <span className="text-xs text-muted-foreground">Page {page + 1} / {totalPages}</span>
        <button
          disabled={page >= totalPages - 1}
          onClick={() => setPage(p => p + 1)}
          className="flex items-center gap-1 px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}