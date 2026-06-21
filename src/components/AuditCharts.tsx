'use client'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { Audit, Rating, Severity, EvidenceStatus } from '@/lib/types'

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
}

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
}

const RATING_SCORES: Record<Rating, number> = {
  effective: 4,
  largely_effective: 3,
  partially_effective: 2,
  ineffective: 1,
  not_assessed: 0,
}

const RATING_COLORS: Record<Rating, string> = {
  effective: '#22c55e',
  largely_effective: '#84cc16',
  partially_effective: '#eab308',
  ineffective: '#ef4444',
  not_assessed: '#6b7280',
}

const RATING_LABELS: Record<Rating, string> = {
  effective: 'Efetivo',
  largely_effective: 'Ampl. Efetivo',
  partially_effective: 'Parc. Efetivo',
  ineffective: 'Inefetivo',
  not_assessed: 'Não Avaliado',
}

const EVIDENCE_STATUS_COLORS: Record<EvidenceStatus, string> = {
  requested: '#6366f1',
  received: '#3b82f6',
  under_review: '#eab308',
  accepted: '#22c55e',
  rejected: '#ef4444',
  pending_clarification: '#f97316',
}

const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  requested: 'Solicitada',
  received: 'Recebida',
  under_review: 'Em Revisão',
  accepted: 'Aceita',
  rejected: 'Rejeitada',
  pending_clarification: 'Pend. Esclarec.',
}

const GRID_TEXT = '#94a3b8'
const GRID_LINE = '#1e2d4a'

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel p-4">
      <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  )
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-panel p-2 text-xs border border-[var(--ln-1)]">
      {label && <p className="text-slate-300 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || GRID_TEXT }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

function RiskHeatMap({ audit }: { audit: Audit }) {
  const levels = ['high', 'medium', 'low'] as const
  const impactLabels = { high: 'Alto', medium: 'Médio', low: 'Baixo' }

  const cellColors: Record<string, string> = {
    'high-high': '#dc2626',
    'high-medium': '#ef4444',
    'high-low': '#f97316',
    'medium-high': '#ef4444',
    'medium-medium': '#eab308',
    'medium-low': '#84cc16',
    'low-high': '#f97316',
    'low-medium': '#84cc16',
    'low-low': '#22c55e',
  }

  const findingCounts: Record<string, number> = {}
  for (const l of levels) {
    for (const i of levels) {
      findingCounts[`${l}-${i}`] = 0
    }
  }

  audit.findings.forEach(f => {
    const likelihood = f.severity === 'critical' || f.severity === 'high' ? 'high' : f.severity === 'medium' ? 'medium' : 'low'
    const impact = f.severity === 'critical' ? 'high' : f.severity === 'high' ? 'high' : f.severity === 'medium' ? 'medium' : 'low'
    findingCounts[`${likelihood}-${impact}`]++
  })

  return (
    <div>
      <div className="grid grid-cols-4 gap-1 text-[10px]">
        <div />
        {levels.map(i => (
          <div key={i} className="text-center text-slate-500 font-medium py-1">
            {impactLabels[i]}
          </div>
        ))}
        {levels.map(likelihood => (
          <>
            <div key={`label-${likelihood}`} className="flex items-center text-slate-500 font-medium pr-2 justify-end">
              {impactLabels[likelihood]}
            </div>
            {levels.map(impact => {
              const key = `${likelihood}-${impact}`
              const count = findingCounts[key]
              return (
                <div
                  key={key}
                  className="aspect-square rounded-lg flex items-center justify-center text-white font-bold text-sm transition-all"
                  style={{
                    backgroundColor: cellColors[key],
                    opacity: count > 0 ? 1 : 0.25,
                  }}
                >
                  {count > 0 ? count : ''}
                </div>
              )
            })}
          </>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[9px] text-slate-500">
        <span>← Probabilidade</span>
        <span>Impacto →</span>
      </div>
    </div>
  )
}

function FindingsBySeverityChart({ audit }: { audit: Audit }) {
  const data = (['critical', 'high', 'medium', 'low'] as Severity[])
    .map(sev => ({
      name: SEVERITY_LABELS[sev],
      value: audit.findings.filter(f => f.severity === sev).length,
      color: SEVERITY_COLORS[sev],
    }))
    .filter(d => d.value > 0)

  if (data.length === 0) {
    return <p className="text-slate-500 text-xs text-center py-8">Nenhum achado registrado</p>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) => <span className="text-xs text-slate-400">{value}</span>}
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

function PillarRatingChart({ audit }: { audit: Audit }) {
  const data = audit.pillars.map(p => ({
    name: p.code,
    score: RATING_SCORES[p.overallRating],
    rating: RATING_LABELS[p.overallRating],
    fill: RATING_COLORS[p.overallRating],
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, audit.pillars.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_LINE} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 4]}
          ticks={[0, 1, 2, 3, 4]}
          tickFormatter={(v: number) => ['N/A', 'Inef.', 'Parc.', 'Ampl.', 'Efet.'][v]}
          tick={{ fill: GRID_TEXT, fontSize: 10 }}
          stroke={GRID_LINE}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={40}
          tick={{ fill: GRID_TEXT, fontSize: 10 }}
          stroke={GRID_LINE}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as { name: string; rating: string; score: number }
            return (
              <div className="glass-panel p-2 text-xs border border-[var(--ln-1)]">
                <p className="text-slate-300">{d.name}: {d.rating} ({d.score}/4)</p>
              </div>
            )
          }}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={14}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function EvidenceStatusChart({ audit }: { audit: Audit }) {
  const statusCounts = new Map<EvidenceStatus, number>()
  audit.evidence.forEach(e => {
    statusCounts.set(e.status, (statusCounts.get(e.status) || 0) + 1)
  })

  const data = Array.from(statusCounts.entries())
    .map(([status, count]) => ({
      name: EVIDENCE_STATUS_LABELS[status],
      value: count,
      color: EVIDENCE_STATUS_COLORS[status],
    }))
    .filter(d => d.value > 0)

  if (data.length === 0) {
    return <p className="text-slate-500 text-xs text-center py-8">Nenhuma evidência registrada</p>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) => <span className="text-xs text-slate-400">{value}</span>}
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

function ProgressByPillarChart({ audit }: { audit: Audit }) {
  const data = audit.pillars.map(p => ({
    name: p.code,
    progress: p.completionPercent,
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, audit.pillars.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_LINE} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: GRID_TEXT, fontSize: 10 }}
          stroke={GRID_LINE}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={40}
          tick={{ fill: GRID_TEXT, fontSize: 10 }}
          stroke={GRID_LINE}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as { name: string; progress: number }
            return (
              <div className="glass-panel p-2 text-xs border border-[var(--ln-1)]">
                <p className="text-slate-300">{d.name}: {d.progress}%</p>
              </div>
            )
          }}
        />
        <Bar dataKey="progress" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.progress >= 80 ? '#22c55e' : entry.progress >= 40 ? '#eab308' : '#3b82f6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function FindingsTimelineChart({ audit }: { audit: Audit }) {
  if (audit.findings.length === 0) {
    return <p className="text-slate-500 text-xs text-center py-8">Nenhum achado registrado</p>
  }

  const dateMap = new Map<string, number>()
  audit.findings.forEach(f => {
    if (!f.createdAt) return
    const date = new Date(f.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    dateMap.set(date, (dateMap.get(date) || 0) + 1)
  })

  if (dateMap.size === 0) {
    return <p className="text-slate-500 text-xs text-center py-8">Sem dados de datas disponíveis</p>
  }

  const data = Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, achados: count }))
    .sort((a, b) => {
      const [da, ma] = a.date.split('/').map(Number)
      const [db, mb] = b.date.split('/').map(Number)
      return ma !== mb ? ma - mb : da - db
    })

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_LINE} />
        <XAxis dataKey="date" tick={{ fill: GRID_TEXT, fontSize: 10 }} stroke={GRID_LINE} />
        <YAxis tick={{ fill: GRID_TEXT, fontSize: 10 }} stroke={GRID_LINE} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="achados"
          name="Achados"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function AuditCharts({ audit }: { audit: Audit }) {
  return (
    <div className="grid grid-cols-3 gap-3 animate-fade-in">
      <ChartCard title="Matriz de Risco">
        <RiskHeatMap audit={audit} />
      </ChartCard>

      <ChartCard title="Achados por Severidade">
        <FindingsBySeverityChart audit={audit} />
      </ChartCard>

      <ChartCard title="Classificação dos Pilares">
        <PillarRatingChart audit={audit} />
      </ChartCard>

      <ChartCard title="Status das Evidências">
        <EvidenceStatusChart audit={audit} />
      </ChartCard>

      <ChartCard title="Progresso por Pilar">
        <ProgressByPillarChart audit={audit} />
      </ChartCard>

      <ChartCard title="Timeline de Achados">
        <FindingsTimelineChart audit={audit} />
      </ChartCard>
    </div>
  )
}
