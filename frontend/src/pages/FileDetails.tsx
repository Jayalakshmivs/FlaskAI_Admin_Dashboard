import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFileDetails } from '@/lib/api';
import { Loader2, ArrowLeft } from 'lucide-react';

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function fmtDur(ms?: number | null) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
  return `${(ms / 60000).toFixed(1)} min`;
}

export default function FileDetails({ fileId, onBack }: { fileId: string; onBack: () => void }) {
  const { data: steps, isLoading } = useQuery({
    queryKey: ['file-details', fileId],
    queryFn: () => getFileDetails(fileId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const totalDuration = steps?.reduce((a: number, s: any) => a + (s.duration ?? 0), 0) ?? 0;

  const overallStatus =
    steps?.some((s: any) => s.status === 'failed')
      ? 'failed'
      : steps?.every((s: any) => s.status === 'success')
        ? 'success'
        : 'in_progress';

  return (
    <div className="flex flex-col gap-4">

      {/* Back */}
      <button onClick={onBack} className="text-sm">
        ← Back
      </button>

      {/* Header */}
      <div className="border p-3">
        <div><b>File ID:</b> {fileId}</div>
        <div><b>Total Steps:</b> {steps?.length ?? 0}</div>
        <div><b>Total Duration:</b> {fmtDur(totalDuration)}</div>
        <div><b>Status:</b> {overallStatus}</div>
      </div>

      {/* Table */}
      <table className="w-full text-sm border">
        <thead>
          <tr>
            <th>#</th>
            <th>Step</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Created</th>
          </tr>
        </thead>

        <tbody>
          {(!steps || steps.length === 0) ? (
            <tr>
              <td colSpan={5}>No steps</td>
            </tr>
          ) : steps.map((s: any, i: number) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{s.step_name}</td>
              <td>{s.status}</td>
              <td>{fmtDur(s.duration)}</td>
              <td>{fmtDate(s.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}
