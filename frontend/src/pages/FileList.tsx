import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFiles, getStats } from '@/lib/api';
import { Loader2, Search, Download, ArrowUp, ArrowDown, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const PAGE_SIZE = 100;

function fmtDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function exportCSV(files: any[]) {
  const header = 'File Name,Status,Created At';
  const rows = files.map(f =>
    [f.file_name, f.status, f.created_at].join(',')
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'files.csv';
  a.click();
}

export default function FileList() {
  const [searchParams] = useSearchParams();
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

  const files = data?.items ?? [];
  const totalRecords = data?.total ?? 0;
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const statusData = stats ? [
    { name: 'success', value: stats.total_success },
    { name: 'failed', value: stats.total_failures },
    { name: 'in_progress', value: stats.total_in_progress },
  ] : [];

  return (
    <div className="flex flex-col gap-4">

      {/* Toolbar */}
      <div className="flex gap-2">
        <input
          placeholder="Search file name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-2 py-1 text-sm"
        />

        <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}>
          {sortDir === 'desc' ? 'Newest' : 'Oldest'}
        </button>

        <button onClick={() => exportCSV(files)}>Export</button>
      </div>

      {/* Chart */}
      <div className="h-40 border p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={statusData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value">
              {statusData.map((_, i) => <Cell key={i} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <table className="w-full text-sm border">
        <thead>
          <tr>
            <th>File Name</th>
            <th>Status</th>
            <th>Created At</th>
          </tr>
        </thead>

        <tbody>
          {files.length === 0 ? (
            <tr>
              <td colSpan={3}>No data</td>
            </tr>
          ) : files.map((file: any, idx: number) => (
            <tr key={idx}>
              <td>{file.file_name}</td>
              <td>{file.status}</td>
              <td>{fmtDate(file.created_at)}</td>
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