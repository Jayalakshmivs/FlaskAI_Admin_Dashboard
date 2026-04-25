import { useQuery } from '@tanstack/react-query';
import { getStats, FileStats } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Loader2 } from 'lucide-react';

const MAIN_STATS = [
  { label: 'Total Dataset (Files)', key: 'total_files' },
  { label: 'Total Jobs', key: 'total_jobs' },
  { label: 'Active Users', key: 'active_users' },
  { label: 'Processing Rate', key: 'processing_rate', isRate: true },
];

const SECONDARY_STATS = [
  { label: 'Successful', key: 'total_success' },
  { label: 'Failed', key: 'total_failures' },
  { label: 'In Progress', key: 'total_in_progress' },
  { label: 'Success Rate', key: 'success_rate', isPercent: true },
];

export default function Overview() {

  const { data: stats, isLoading } = useQuery<FileStats>({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 5000,
  });

  if (isLoading || !stats) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  // ✅ SAFE DATA FIXES
  const pieData = Object.entries(stats.files_by_type || {}).map(([name, value]) => ({
    name,
    value,
  }));

  const statusData = [
    { name: 'failed', value: stats.total_failures || 0 },
    { name: 'in_progress', value: stats.total_in_progress || 0 },
    { name: 'success', value: stats.total_success || 0 },
  ];

  const pipeData = Object.entries(stats.pipeline_performance || {}).map(([name, counts]: any) => ({
    name,
    success: counts.success || 0,
    failed: counts.failed || 0,
    in_progress: counts.in_progress || 0, // ✅ FIXED KEY
  }));

  return (
    <div className="flex flex-col gap-6">

      {/* MAIN STATS */}
      <div className="grid grid-cols-4 gap-4">
        {MAIN_STATS.map(({ label, key, isRate }) => {
          const val = (stats as any)[key] ?? 0;
          return (
            <div key={key} className="border p-4 rounded">
              <p className="text-xs">{label}</p>
              <h2 className="text-2xl font-bold">
                {val}{isRate ? ' stp/h' : ''}
              </h2>
            </div>
          );
        })}
      </div>

      {/* SECONDARY */}
      <div className="grid grid-cols-4 gap-4">
        {SECONDARY_STATS.map(({ label, key, isPercent }) => {
          const val = (stats as any)[key] ?? 0;
          return (
            <div key={key} className="border p-4 rounded">
              <p className="text-xs">{label}</p>
              <h2 className="text-xl">
                {isPercent ? val.toFixed(2) + '%' : val}
              </h2>
            </div>
          );
        })}
      </div>

      {/* STATUS PIE */}
      <div className="h-[300px]">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={statusData} dataKey="value" />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* PIPELINE */}
      <div className="h-[300px]">
        <ResponsiveContainer>
          <BarChart data={pipeData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="success" fill="#22c55e" />
            <Bar dataKey="failed" fill="#ef4444" />
            <Bar dataKey="in_progress" fill="#eab308" />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
