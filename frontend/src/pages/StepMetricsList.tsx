import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStepMetrics } from '@/lib/api';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 100;

// ✅ normalize status safely
function normalizeStatus(s: string | undefined) {
  return (s || '').toLowerCase().replace(' ', '_');
}

function statusStyle(raw: string | undefined): string {
  const s = normalizeStatus(raw);

  if (s.includes('success') || s.includes('complete'))
    return 'bg-green-500/15 text-green-500 border border-green-500/25';

  if (s.includes('fail') || s.includes('error'))
    return 'bg-red-500/15 text-red-500 border border-red-500/25';

  if (s.includes('progress') || s.includes('running'))
    return 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/25';

  return 'bg-muted text-muted-foreground border border-border';
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

export default function StepMetricsList() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['step-metrics', page], // ✅ fixed key
    queryFn: () => getStepMetrics(page * PAGE_SIZE, PAGE_SIZE),
    refetchInterval: 5000,
  });

  // ✅ SAFE DATA EXTRACTION (TypeScript friendly)
  const metrics: any[] = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
      ? data
      : [];

  const totalRecords =
    typeof data?.total === 'number'
      ? data.total
      : metrics.length;

  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  // ✅ SAFE COUNTS
  const counts = { success: 0, failed: 0, in_progress: 0 };

  metrics.forEach((m) => {
    const s = normalizeStatus(m.status);
    if (s.includes('success')) counts.success++;
    else if (s.includes('fail')) counts.failed++;
    else counts.in_progress++;
  });

  return (
    <div className="flex flex-col gap-4">

      {/* HEADER */}
      <div className="flex justify-between">
        <h2 className="text-sm font-bold">
          Step Metrics ({totalRecords})
        </h2>

        <div className="flex gap-2">
          <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-1 rounded">
            ✓ {counts.success}
          </span>
          <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-1 rounded">
            ✕ {counts.failed}
          </span>
          <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded">
            ⏳ {counts.in_progress}
          </span>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th>ID</th>
              <th>Job</th>
              <th>File</th>
              <th>Step</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Created</th>
            </tr>
          </thead>

          <tbody>
            {metrics.length > 0 ? (
              metrics.map((m) => (
                <tr key={m.id}>
                  <td>{shortId(m.id)}</td>

                  <td>
                    {m.job_id && (
                      <Link to={`/jobs?id=${m.job_id}`}>
                        {shortId(m.job_id)}
                      </Link>
                    )}
                  </td>

                  <td>
                    {m.file_id && (
                      <Link to={`/file-details/${m.file_id}`}>
                        {shortId(m.file_id)}
                      </Link>
                    )}
                  </td>

                  <td>{m.step_name}</td>

                  <td>
                    <span className={statusStyle(m.status)}>
                      {normalizeStatus(m.status)}
                    </span>
                  </td>

                  <td>{fmtDuration(m.duration_ms)}</td>
                  <td>{fmtDate(m.created_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-6 text-muted-foreground">
                  Waiting for live data...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>
          <ChevronLeft size={14} />
        </button>

        <span>Page {page + 1} / {totalPages}</span>

        <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
          <ChevronRight size={14} />
        </button>
      </div>

    </div>
  );
}