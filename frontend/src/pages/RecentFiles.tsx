import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFiles, getStats, FileStats, FileItem, PaginatedResponse } from '@/lib/api';
import { Loader2, BarChart3, Download, Search } from 'lucide-react';
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const RECENT_LIMIT = 50;

// ✅ FIXED STATUS MAP
const STATUS_STYLES: Record<string, string> = {
  success: 'bg-green-500/15 text-green-500 border border-green-500/25',
  failed: 'bg-red-500/15 text-red-500 border border-red-500/25',
  in_progress: 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/25',
};

function normalizeStatus(status: string) {
  if (!status) return 'in_progress';
  return status.toLowerCase().replace(' ', '_');
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

export default function RecentFiles({ onSelectFile }: { onSelectFile: (id: string) => void }) {

  const [search, setSearch] = useState('');
  const [emailSearch, setEmail] = useState('');
  const [idSearch, setId] = useState('');
  const [statusFilter, setStatus] = useState('All');

  // ✅ IMPORTANT: backend already filters source != system
  const { data, isLoading } = useQuery<PaginatedResponse<FileItem>>({
    queryKey: ['recent_files', search, emailSearch, idSearch, statusFilter],
    queryFn: () =>
      getFiles(0, RECENT_LIMIT, statusFilter, search, emailSearch, idSearch),
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
      <div className="flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  // ✅ FIXED STATUS CHART
  const statusData = stats ? [
    { name: 'success', value: stats.total_success, color: '#22c55e' },
    { name: 'failed', value: stats.total_failures, color: '#ef4444' },
    { name: 'in_progress', value: stats.total_in_progress, color: '#eab308' },
  ] : [];

  return (
    <div className="flex flex-col gap-4">

      {/* HEADER */}
      <div className="flex justify-between">
        <h1 className="text-lg font-bold">Recent Files</h1>
        <span className="text-xs">
          {files.length} / {totalRecords}
        </span>
      </div>

      {/* FILTER */}
      <div className="flex gap-2">
        <input placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option>All</option>
          <option>success</option>
          <option>failed</option>
          <option>in_progress</option>
        </select>
      </div>

      {/* CHART */}
      <div className="h-[200px]">
        <ResponsiveContainer>
          <BarChart data={statusData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value">
              {statusData.map((e, i) => (
                <Cell key={i} fill={e.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TABLE */}
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {files.map(file => {
            const status = normalizeStatus(file.status);
            return (
              <tr key={file.file_id} onClick={() => onSelectFile(file.file_id)}>
                <td>{shortId(file.file_id)}</td>
                <td>{file.file_name}</td>
                <td>
                  <span className={STATUS_STYLES[status]}>
                    {status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {files.length === 0 && (
        <div className="text-center">No data</div>
      )}
    </div>
  );
}
