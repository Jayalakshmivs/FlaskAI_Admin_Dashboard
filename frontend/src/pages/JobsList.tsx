import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getJobs } from '@/lib/api';
import { Loader2, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const PAGE_SIZE = 100;

function statusStyle(raw: string): string {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('complete') || s.includes('success'))
    return 'text-green-500';
  if (s.includes('error') || s.includes('fail'))
    return 'text-red-500';
  if (s.includes('progress') || s.includes('running'))
    return 'text-yellow-500';
  return 'text-gray-400';
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function shortId(id: string) {
  return id ? id.slice(0, 8) : '—';
}

export default function JobsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const job_id = searchParams.get('id') || '';
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', page, job_id],
    queryFn: () => getJobs(page * PAGE_SIZE, PAGE_SIZE, job_id),
  });

  const jobs = data?.items ?? [];
  const totalRecords = data?.total ?? 0;
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex justify-between">
        <h2>Jobs ({totalRecords})</h2>

        <input
          placeholder="Search Job ID"
          value={job_id}
          onChange={(e) => {
            const val = e.target.value;
            if (val) setSearchParams({ id: val });
            else setSearchParams({});
            setPage(0);
          }}
          className="border px-2 py-1 text-sm"
        />
      </div>

      {/* Table */}
      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th>ID</th>
            <th>Job Type</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>

        <tbody>
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={4}>No jobs</td>
            </tr>
          ) : jobs.map((job: any) => (
            <tr key={job.id}>
              <td>{shortId(job.id)}</td>
              <td>{job.jobType}</td>
              <td className={statusStyle(job.job_status)}>
                {job.job_status}
              </td>
              <td>{fmtDate(job.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex justify-between">
        <button
          disabled={page === 0}
          onClick={() => setPage(p => p - 1)}
        >
          Prev
        </button>

        <span>Page {page + 1} / {totalPages}</span>

        <button
          disabled={page >= totalPages - 1}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}