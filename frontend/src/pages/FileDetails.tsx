import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFileDetails } from '@/lib/api';
import { Loader2, ArrowLeft, Clock, CheckCircle2, XCircle, Activity, FileText, Settings, Play, Database } from 'lucide-react';
import { motion } from 'framer-motion';

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

function StatusIcon({ status, className }: { status: string, className?: string }) {
  const s = (status || '').toLowerCase();
  if (s.includes('success') || s.includes('complete')) return <CheckCircle2 className={`text-green-500 ${className}`} />;
  if (s.includes('fail') || s.includes('error')) return <XCircle className={`text-red-500 ${className}`} />;
  return <Clock className={`text-yellow-500 ${className}`} />;
}

function StatusText({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  if (s.includes('success') || s.includes('complete')) return <span className="text-green-500 font-medium">Success</span>;
  if (s.includes('fail') || s.includes('error')) return <span className="text-red-500 font-medium">Failed</span>;
  return <span className="text-yellow-500 font-medium">In Progress</span>;
}

const getStepIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('parse') || n.includes('extract')) return <FileText size={16} />;
  if (n.includes('store') || n.includes('db') || n.includes('index')) return <Database size={16} />;
  if (n.includes('process') || n.includes('compute')) return <Settings size={16} />;
  return <Activity size={16} />;
};

export default function FileDetails({ fileId, onBack }: { fileId: string; onBack: () => void }) {
  const { data: steps, isLoading } = useQuery({
    queryKey: ['file-details', fileId],
    queryFn: () => getFileDetails(fileId),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
        <p className="text-muted-foreground text-sm">Loading pipeline details...</p>
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl">

      {/* Header Area */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack} 
          className="p-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-3">
            Pipeline Execution Details
          </h2>
          <p className="text-sm text-muted-foreground font-mono mt-1">{fileId}</p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Steps</p>
          </div>
          <p className="text-3xl font-black text-foreground">{steps?.length ?? 0}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Duration</p>
          </div>
          <p className="text-3xl font-black text-foreground">{fmtDur(totalDuration)}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-background rounded-lg shadow-sm border border-border">
              <StatusIcon status={overallStatus} className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Overall Status</p>
          </div>
          <p className="text-2xl font-black mt-1"><StatusText status={overallStatus} /></p>
        </div>
      </div>

      {/* Timeline View */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm mt-4">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" /> Execution Timeline
        </h3>

        {(!steps || steps.length === 0) ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
            No execution steps recorded for this file yet.
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="relative pl-6 border-l-2 border-border/60 ml-4 space-y-8"
          >
            {steps.map((s: any, i: number) => {
              const isLast = i === steps.length - 1;
              return (
                <motion.div key={i} variants={itemVariants} className="relative">
                  {/* Timeline Node */}
                  <div className="absolute -left-[35px] top-1 bg-background border-2 border-border p-1.5 rounded-full shadow-sm z-10">
                    <StatusIcon status={s.status} className="w-4 h-4" />
                  </div>
                  
                  {/* Step Card */}
                  <div className="bg-background border border-border rounded-lg p-4 shadow-sm hover:border-primary/50 transition-colors group">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      
                      <div className="flex items-start gap-4">
                        <div className="mt-1 p-2 bg-primary/10 text-primary rounded-md">
                          {getStepIcon(s.step_name)}
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">{s.step_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Step {i + 1}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{fmtDate(s.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-1 pl-12 md:pl-0">
                        <div className="text-sm font-semibold px-3 py-1 rounded-md bg-muted border border-border">
                          {fmtDur(s.duration)}
                        </div>
                        <div className="text-xs mt-1">
                          <StatusText status={s.status} />
                        </div>
                      </div>

                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

    </div>
  );
}