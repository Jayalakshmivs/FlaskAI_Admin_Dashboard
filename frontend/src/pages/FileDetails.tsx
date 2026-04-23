import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFileDetails, ProcessingStep } from '@/lib/api';
import { Loader2, ArrowLeft, AlertTriangle, CheckCircle2, Clock, Circle, ChevronDown, ChevronRight } from 'lucide-react';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { dot: string; bg: string; color: string; label: string }> = {
  success:       { dot: '#22c55e', bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', label: 'SUCCESS'     },
  failed:        { dot: '#ef4444', bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', label: 'FAILED'      },
  'in progress': { dot: '#eab308', bg: 'rgba(234,179,8,0.12)',  color: '#eab308', label: 'IN PROGRESS' },
  pending:       { dot: '#475569', bg: 'rgba(71,85,105,0.15)',  color: '#94a3b8', label: 'PENDING'     },
};

function cfg(s: string) {
  if (!s) return STATUS_CFG.pending;
  return STATUS_CFG[s] ?? STATUS_CFG[s.toLowerCase()] ?? STATUS_CFG.pending;
}

function Badge({ status }: { status: string }) {
  const c = cfg(status);
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.dot}44`, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>
      {c.label}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase();
  if (s.includes('success') || s.includes('complete') || s.includes('indexed'))
    return <CheckCircle2 size={14} style={{ color: '#22c55e', flexShrink: 0 }} />;
  if (s.includes('fail') || s.includes('error'))
    return <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />;
  if (s.includes('progress') || s.includes('running'))
    return <Clock size={14} style={{ color: '#eab308', flexShrink: 0 }} />;
  return <Circle size={14} style={{ color: '#475569', flexShrink: 0 }} />;
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDur(ms?: number | null) {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded mt-2 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 w-full px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground text-[10px] font-semibold text-left transition-colors">
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        {title}
      </button>
      {open && <div className="px-3 py-2 bg-background">{children}</div>}
    </div>
  );
}

// ── Waterfall Chart ───────────────────────────────────────────────────────────
function WaterfallChart({ steps }: { steps: ProcessingStep[] }) {
  const STEP_COLORS = ['#3b82f6','#8b5cf6','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316','#14b8a6'];
  const BAR_H = 32;
  const LABEL_W = 160;
  const CHART_W = 520;
  const GAP = 6;

  // Build waterfall: each bar starts where the previous ended
  const durations = steps.map(s => s.duration_ms ?? 0);
  const totalMs = durations.reduce((a, b) => a + b, 0);
  const maxMs = Math.max(totalMs, 1);

  let cumulative = 0;
  const bars = steps.map((s, i) => {
    const dur = s.duration_ms ?? 0;
    const startPct = (cumulative / maxMs) * 100;
    const widthPct = Math.max((dur / maxMs) * 100, 0.5);
    cumulative += dur;
    const isFail = s.status === 'failed' || (s.raw_status || '').toLowerCase().includes('error') || (s.raw_status || '').toLowerCase().includes('fail');
    const color = isFail ? '#ef4444' : STEP_COLORS[i % STEP_COLORS.length];
    return { ...s, startPct, widthPct, dur, color, isFail };
  });

  const svgH = steps.length * (BAR_H + GAP) + 40;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pipeline Waterfall</span>
          <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">Total: {fmtDur(totalMs)}</span>
        </div>

        {/* Chart */}
        <svg width="100%" viewBox={`0 0 ${LABEL_W + CHART_W + 120} ${svgH}`} style={{ fontFamily: 'inherit' }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(pct => (
            <g key={pct}>
              <line
                x1={LABEL_W + (pct / 100) * CHART_W} y1={0}
                x2={LABEL_W + (pct / 100) * CHART_W} y2={svgH - 20}
                stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="3,3"
              />
              <text x={LABEL_W + (pct / 100) * CHART_W} y={svgH - 6} textAnchor="middle" fontSize={8} fill="hsl(var(--muted-foreground))">
                {fmtDur((pct / 100) * maxMs)}
              </text>
            </g>
          ))}

          {bars.map((bar, i) => {
            const y = i * (BAR_H + GAP) + 4;
            const x = LABEL_W + (bar.startPct / 100) * CHART_W;
            const w = Math.max((bar.widthPct / 100) * CHART_W, 2);

            return (
              <g key={bar.id ?? i}>
                {/* Step label */}
                <text x={LABEL_W - 8} y={y + BAR_H / 2 + 4} textAnchor="end" fontSize={10} fill="hsl(var(--foreground))" fontWeight={600}>
                  {(bar.step_name || 'Unknown').length > 18 ? bar.step_name.slice(0, 17) + '…' : bar.step_name}
                </text>

                {/* Background track */}
                <rect x={LABEL_W} y={y} width={CHART_W} height={BAR_H} rx={4} fill="hsl(var(--muted))" opacity={0.3} />

                {/* Bar */}
                <rect x={x} y={y} width={w} height={BAR_H} rx={4}
                  fill={bar.color} opacity={bar.isFail ? 1 : 0.85}
                />

                {/* Status icon via text */}
                <text x={x + w + 6} y={y + BAR_H / 2 + 4} fontSize={9} fill={bar.color} fontWeight={700}>
                  {bar.isFail ? '✕' : '✓'}
                </text>

                {/* Duration label inside/outside bar */}
                {w > 35 ? (
                  <text x={x + w / 2} y={y + BAR_H / 2 + 4} textAnchor="middle" fontSize={9} fill="white" fontWeight={700}>
                    {fmtDur(bar.dur)}
                  </text>
                ) : (
                  <text x={x + w + 18} y={y + BAR_H / 2 + 4} fontSize={9} fill="hsl(var(--muted-foreground))">
                    {fmtDur(bar.dur)}
                  </text>
                )}

                {/* Status badge text */}
                <text x={LABEL_W + CHART_W + 8} y={y + BAR_H / 2 + 4} fontSize={8} fill={bar.color} fontWeight={700}>
                  {bar.isFail ? 'FAILED' : bar.status === 'in progress' ? 'IN PROG' : 'OK'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function FileDetails({ fileId, onBack }: { fileId: string; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'waterfall' | 'table'>('waterfall');
  const [showAllRaw, setShowAllRaw] = useState(false);

  const { data: steps, isLoading } = useQuery<ProcessingStep[]>({
    queryKey: ['file-details', fileId],
    queryFn: () => getFileDetails(fileId),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Loader2 className="animate-spin" style={{ color: '#3b82f6', width: 36, height: 36 }} />
      </div>
    );
  }

  const first = steps?.[0];

  // Overall status: if ANY step failed → Failure; else all success → Success; else In Progress
  const overallStatus: string =
    steps?.some(s => s.status === 'failed' || (s.raw_status ?? '').toLowerCase().includes('error') || (s.raw_status ?? '').toLowerCase().includes('fail'))
      ? 'failed'
      : steps?.length && steps.every(s => s.status === 'success')
        ? 'success'
        : (steps?.length ?? 0) > 0 ? 'in progress' : 'pending';

  const totalDuration = steps?.reduce((a, s) => a + (s.duration_ms ?? 0), 0) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Back */}
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start">
        <ArrowLeft size={14} /> Back to Files
      </button>

      {/* File header */}
      <div className="bg-card border border-border rounded-xl px-5 py-4 shadow-sm">
        <div className="flex flex-wrap gap-x-7 gap-y-2 items-center">
          {([
            ['File ID',  <span className="font-mono text-foreground font-semibold text-xs">{fileId}</span>],
            ['Name',     <span className="text-foreground font-semibold text-xs truncate max-w-[200px]">{first?.file_name ?? '—'}</span>],
            ['Type',     <span className="text-foreground font-semibold text-xs">{first?.file_type ?? '—'}</span>],
            ['User',     <span className="text-muted-foreground text-xs">{first?.user_name || first?.user_email || '—'}</span>],
            ['Created',  <span className="text-muted-foreground text-xs">{fmtDate(first?.created_at)}</span>],
            ['Steps',    <span className="text-foreground font-bold text-xs">{steps?.length ?? 0}</span>],
            ['Total Time', <span className="text-foreground font-bold text-xs">{fmtDur(totalDuration)}</span>],
          ] as [string, React.ReactNode][]).map(([label, val]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}:</span>
              {val}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Overall:</span>
            <Badge status={overallStatus} />
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['waterfall', 'table'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === tab
                ? 'border-blue-500 text-foreground bg-card'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'waterfall' ? '⬛ Waterfall Chart' : '☰ Step Table'}
          </button>
        ))}
      </div>

      {/* Waterfall View */}
      {activeTab === 'waterfall' && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          {(!steps || steps.length === 0) ? (
            <div className="text-center text-muted-foreground text-sm py-10">No steps found for this file.</div>
          ) : (
            <WaterfallChart steps={steps} />
          )}
        </div>
      )}

      {/* Table View */}
      {activeTab === 'table' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Pipeline Steps</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">{steps?.length ?? 0} steps</span>
          </div>
          {(!steps || steps.length === 0) ? (
            <div className="px-5 py-10 text-center text-muted-foreground text-sm">No processing steps found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40">
                    {['#', 'Step Name', 'Status', 'Duration', 'Started At', 'Details'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-muted-foreground border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step, i) => {
                    const c = cfg(step.status);
                    const hasOutput = step.output_summary && Object.keys(step.output_summary).length > 0;
                    return (
                      <tr key={step.id ?? i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-muted-foreground font-mono text-[10px]">{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={step.status} />
                            <span className="font-semibold text-foreground">{step.step_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5"><Badge status={step.status} /></td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                          {step.duration_ms != null ? (
                            <span style={{ color: c.dot }}>{fmtDur(step.duration_ms)}</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap text-[10px]">{fmtDate(step.created_at)}</td>
                        <td className="px-4 py-2.5">
                          {hasOutput && (
                            <Collapsible title="Output">
                              <pre className="text-[10px] text-muted-foreground font-mono overflow-x-auto max-h-40">
                                {JSON.stringify(step.output_summary, null, 2)}
                              </pre>
                            </Collapsible>
                          )}
                          <Collapsible title="Raw JSON">
                            <pre className="text-[10px] text-muted-foreground font-mono overflow-x-auto max-h-52">
                              {JSON.stringify({
                                step_name: step.step_name, status: step.raw_status,
                                duration_ms: step.duration_ms,
                                input: step.input_payload ?? null,
                                output: step.output_payload ?? null,
                                error_context: step.error_context ?? null,
                                created_at: step.created_at, updated_at: step.updated_at,
                              }, null, 2)}
                            </pre>
                          </Collapsible>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Raw JSON dump */}
      {steps && steps.length > 0 && (
        <div className="pt-1">
          <button
            onClick={() => setShowAllRaw(r => !r)}
            className="inline-flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-md bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors font-semibold"
          >
            View Raw JSON (all steps)
            <ChevronDown size={13} style={{ transform: showAllRaw ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {showAllRaw && (
            <div className="mt-3 p-4 bg-background border border-border rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-[11px] text-muted-foreground leading-relaxed overflow-x-auto font-mono">
                {JSON.stringify(steps, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
