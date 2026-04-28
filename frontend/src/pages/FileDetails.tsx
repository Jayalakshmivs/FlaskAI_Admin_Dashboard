import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFileDetails, ProcessingStep } from '@/lib/api';
import { 
  Loader2, Clock, CheckCircle2, AlertTriangle, 
  User as UserIcon, Calendar, ArrowLeft, RefreshCw,
  ChevronDown, Activity, Database, Info,
  Layout, Table as TableIcon, Code
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const STATUS_CFG: Record<string, { bg: string; color: string; label: string; icon: any }> = {
  success:       { bg: 'bg-emerald-50 dark:bg-emerald-500/10',  color: 'text-emerald-600 dark:text-emerald-400', label: 'SUCCESS',     icon: CheckCircle2 },
  failed:        { bg: 'bg-rose-50 dark:bg-rose-500/10',   color: 'text-rose-600 dark:text-rose-400', label: 'FAILED',      icon: AlertTriangle },
  'in progress': { bg: 'bg-amber-50 dark:bg-amber-500/10',  color: 'text-amber-600 dark:text-amber-400', label: 'IN PROGRESS', icon: Clock },
};

function cfg(s: string) {
  if (!s) return STATUS_CFG['in progress'];
  const lower = s.toLowerCase();
  return STATUS_CFG[lower] || STATUS_CFG['in progress'];
}

export default function FileDetails({ fileId, onBack }: { fileId: string; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'table' | 'json'>('timeline');
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const { data: steps, isLoading, isError, refetch } = useQuery<ProcessingStep[]>({
    queryKey: ['file-details', fileId],
    queryFn: () => getFileDetails(fileId),
    refetchInterval: 5000, // Real-time polling
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Fetching file metrics...</p>
      </div>
    );
  }

  if (isError || !steps) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-100 rounded-xl text-center">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-rose-900">Failed to load metrics</h3>
        <p className="text-sm text-rose-700 mt-1">We couldn't retrieve the step metrics for this object.</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg font-bold">Retry Sync</button>
      </div>
    );
  }

  const latestStep = steps[0];
  const totalDuration = steps.reduce((acc, s) => acc + (s.duration_ms || 0), 0);
  const statusInfo = cfg(latestStep?.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-lg transition-colors border border-border"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{latestStep?.file_name || 'File Inspection'}</h1>
              <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold border", statusInfo.bg, statusInfo.color)}>
                {statusInfo.label}
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-medium mt-1">ID: {fileId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-card border border-border px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
            <Clock size={16} className="text-muted-foreground" />
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Runtime</p>
              <p className="text-sm font-bold">{(totalDuration / 1000).toFixed(2)}s</p>
            </div>
          </div>
          <button onClick={() => refetch()} className="p-2.5 bg-primary text-primary-foreground rounded-xl shadow-sm hover:opacity-90 transition-opacity">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-500">
            <UserIcon size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Principal Identity</p>
            <p className="text-sm font-bold truncate max-w-[200px]">{latestStep?.user_email || 'System'}</p>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-500/10 rounded-lg text-purple-500">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Sync Timestamp</p>
            <p className="text-sm font-bold">{new Date(latestStep?.created_at).toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-500">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Status Node</p>
            <p className="text-sm font-bold uppercase">{latestStep?.status}</p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-border bg-muted/30">
          {[
            { id: 'timeline', label: 'Processing Timeline', icon: Layout },
            { id: 'table', label: 'Detailed Step Table', icon: TableIcon },
            { id: 'json', label: 'Raw Telemetry', icon: Code },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                activeTab === tab.id 
                  ? "border-primary text-primary bg-background" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'timeline' && (
              <motion.div 
                key="timeline"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {steps.map((step, idx) => {
                  const s = cfg(step.status);
                  const isExpanded = expandedStep === idx;
                  
                  return (
                    <div key={idx} className="relative pl-10 group">
                      {/* Vertical Line */}
                      {idx !== steps.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-[-20px] w-0.5 bg-border group-hover:bg-primary/20 transition-colors" />
                      )}
                      
                      {/* Node Circle */}
                      <div className={cn(
                        "absolute left-0 top-1 w-6 h-6 rounded-full border-2 bg-background flex items-center justify-center z-10 transition-transform group-hover:scale-110 shadow-sm",
                        s.color.replace('text-', 'border-')
                      )}>
                        <s.icon size={12} className={s.color} />
                      </div>

                      <div className={cn(
                        "p-4 rounded-xl border transition-all shadow-sm cursor-pointer",
                        isExpanded ? "bg-muted/50 border-primary/30" : "bg-card border-border hover:border-primary/20"
                      )}
                      onClick={() => setExpandedStep(isExpanded ? null : idx)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Step {steps.length - idx}</span>
                            <h4 className="font-bold text-foreground uppercase tracking-tight text-sm">{step.step_name.replace(/_/g, ' ')}</h4>
                          </div>
                          <div className="flex items-center gap-6">
                             <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Duration</span>
                                <span className="text-xs font-bold text-foreground">{(step.duration_ms || 0).toFixed(0)}ms</span>
                             </div>
                             <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                          </div>
                        </div>

                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="mt-4 pt-4 border-t border-border space-y-4"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                  <Info size={12} /> Diagnostic Info
                                </p>
                                <div className="p-3 bg-muted/50 rounded-lg text-xs font-medium space-y-1">
                                  <div className="flex justify-between border-b border-border/50 pb-1">
                                    <span className="text-muted-foreground">Status Code</span>
                                    <span className={cn("font-bold", s.color)}>{step.status.toUpperCase()}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-border/50 py-1">
                                    <span className="text-muted-foreground">Original Status</span>
                                    <span className="font-mono">{step.raw_status || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between pt-1">
                                    <span className="text-muted-foreground">Timestamp</span>
                                    <span>{new Date(step.created_at).toLocaleTimeString()}</span>
                                  </div>
                                </div>
                              </div>
                              {step.error_message && (
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <AlertTriangle size={12} /> Failure Report
                                  </p>
                                  <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400">
                                    {step.error_message}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {activeTab === 'table' && (
              <motion.div 
                key="table"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="overflow-x-auto"
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      <th className="px-4 py-3 border-b border-border">Sequence</th>
                      <th className="px-4 py-3 border-b border-border">System Step</th>
                      <th className="px-4 py-3 border-b border-border">Execution State</th>
                      <th className="px-4 py-3 border-b border-border">Time Vector</th>
                      <th className="px-4 py-3 border-b border-border">Raw Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((step, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors border-b border-border last:border-0 group">
                        <td className="px-4 py-4 text-xs font-bold text-muted-foreground">{steps.length - idx}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Database size={14} className="text-muted-foreground" />
                            <span className="text-xs font-bold uppercase tracking-tight">{step.step_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className={cn("px-2.5 py-1 rounded-md text-[10px] font-black uppercase inline-flex items-center gap-1.5 border shadow-sm", cfg(step.status).bg, cfg(step.status).color)}>
                            {cfg(step.status).label}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs font-mono font-bold">{(step.duration_ms || 0).toFixed(0)}ms</td>
                        <td className="px-4 py-4 text-[10px] font-mono text-muted-foreground truncate max-w-[150px]" title={step.raw_status}>{step.raw_status || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}

            {activeTab === 'json' && (
              <motion.div 
                key="json"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="bg-muted/50 rounded-xl p-4 border border-border"
              >
                <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto text-foreground/80">
                  {JSON.stringify(steps, null, 2)}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
