'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAuditStore } from '@/lib/store'
import { Finding, RiskMatrixItem, Severity } from '@/lib/types'
import { AlertTriangle, Target, Hash, X, Plus, CheckCircle } from '@/components/Icons'
import { cn } from '@/lib/utils'
import { SEVERITY_CONFIG } from '@/lib/audit-framework'

const LIKELIHOOD_LABELS = ['Raro', 'Improvável', 'Possível', 'Provável', 'Quase Certo'] as const
const IMPACT_LABELS = ['Insignificante', 'Menor', 'Moderado', 'Maior', 'Catastrófico'] as const

type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

function getRiskLevel(likelihood: number, impact: number): RiskLevel {
  const score = likelihood * impact
  if (score <= 4) return 'low'
  if (score <= 9) return 'medium'
  if (score <= 15) return 'high'
  return 'critical'
}

const RISK_COLORS: Record<RiskLevel, { bg: string; border: string; text: string; label: string }> = {
  low:      { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Baixo' },
  medium:   { bg: 'bg-yellow-500/15',  border: 'border-yellow-500/30',  text: 'text-yellow-400',  label: 'Médio' },
  high:     { bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  text: 'text-orange-400',  label: 'Alto' },
  critical: { bg: 'bg-red-500/15',     border: 'border-red-500/30',     text: 'text-red-400',     label: 'Crítico' },
}

export default function RiskMatrixPanel({ auditId }: { auditId: string }) {
  const { getCurrentAudit, updateRiskMatrixItem, removeRiskMatrixItem } = useAuditStore()
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null)

  const audit = getCurrentAudit()
  const findings: Finding[] = audit?.findings ?? []
  const riskItems: RiskMatrixItem[] = audit?.riskMatrixItems ?? []

  const mappedIds = useMemo(() => new Set(riskItems.map(r => r.findingId)), [riskItems])
  const unmappedFindings = useMemo(() => findings.filter(f => !mappedIds.has(f.id)), [findings, mappedIds])

  const findingsInCell = useCallback(
    (l: number, i: number) =>
      riskItems
        .filter(r => r.likelihood === l && r.impact === i)
        .map(r => findings.find(f => f.id === r.findingId))
        .filter(Boolean) as Finding[],
    [riskItems, findings],
  )

  const distribution = useMemo(() => {
    const d: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 }
    for (const r of riskItems) d[getRiskLevel(r.likelihood, r.impact)]++
    return d
  }, [riskItems])

  const handleCellClick = (likelihood: 1|2|3|4|5, impact: 1|2|3|4|5) => {
    if (!selectedFindingId) return
    updateRiskMatrixItem(auditId, selectedFindingId, likelihood, impact)
    setSelectedFindingId(null)
  }

  const handleRemove = (findingId: string) => {
    removeRiskMatrixItem(auditId, findingId)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--ln-1)]">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-slate-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Matriz de Risco</h3>
            <p className="text-[11px] text-slate-500">Probabilidade × Impacto — Mapeamento de achados</p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <CheckCircle size={12} className="text-emerald-400" />
            <span className="text-[11px] text-slate-400">Mapeados: <span className="text-slate-200 font-medium">{riskItems.length}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-400" />
            <span className="text-[11px] text-slate-400">Não mapeados: <span className="text-slate-200 font-medium">{unmappedFindings.length}</span></span>
          </div>
          <div className="h-3 w-px bg-[var(--ln-1)]" />
          {(Object.entries(distribution) as [RiskLevel, number][]).map(([level, count]) => (
            <div key={level} className="flex items-center gap-1">
              <div className={cn('w-2 h-2 rounded-full', RISK_COLORS[level].bg, 'ring-1', RISK_COLORS[level].border)} />
              <span className="text-[10px] text-slate-500">{RISK_COLORS[level].label}: {count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-4">
          {/* Matrix grid */}
          <div className="flex-1 min-w-0">
            <div className="flex">
              {/* Y-axis label */}
              <div className="flex items-center justify-center w-5 shrink-0">
                <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase -rotate-90 whitespace-nowrap">
                  Probabilidade
                </span>
              </div>

              <div className="flex-1">
                {/* Grid rows — likelihood 5 at top, 1 at bottom */}
                <div className="flex flex-col gap-px">
                  {[5, 4, 3, 2, 1].map(likelihood => (
                    <div key={likelihood} className="flex items-stretch gap-px">
                      {/* Row label */}
                      <div className="w-20 shrink-0 flex items-center justify-end pr-2">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-medium block leading-tight">{likelihood}</span>
                          <span className="text-[9px] text-slate-600 block leading-tight">{LIKELIHOOD_LABELS[likelihood - 1]}</span>
                        </div>
                      </div>

                      {/* Cells */}
                      {[1, 2, 3, 4, 5].map(impact => {
                        const level = getRiskLevel(likelihood, impact)
                        const colors = RISK_COLORS[level]
                        const cellFindings = findingsInCell(likelihood, impact)
                        const isClickTarget = selectedFindingId !== null

                        return (
                          <button
                            key={impact}
                            onClick={() => handleCellClick(likelihood as 1|2|3|4|5, impact as 1|2|3|4|5)}
                            disabled={!isClickTarget}
                            className={cn(
                              'flex-1 min-h-[52px] rounded border transition-all relative group',
                              colors.bg, colors.border,
                              isClickTarget && 'cursor-crosshair hover:brightness-125 hover:scale-[1.03]',
                              !isClickTarget && 'cursor-default',
                            )}
                          >
                            {/* Risk score */}
                            <span className={cn('absolute top-0.5 right-1 text-[9px] font-mono opacity-40', colors.text)}>
                              {likelihood * impact}
                            </span>

                            {/* Finding dots */}
                            {cellFindings.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 p-1 items-center justify-center h-full">
                                {cellFindings.map(f => (
                                  <span
                                    key={f.id}
                                    title={f.title}
                                    className="relative group/dot"
                                  >
                                    <span
                                      className="block w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                                      style={{ backgroundColor: SEVERITY_CONFIG[f.severity].color }}
                                    />
                                    {/* Tooltip */}
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-slate-900 border border-[var(--ln-1)] text-[10px] text-slate-200 whitespace-nowrap opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                                      {f.title}
                                      <button
                                        onClick={e => { e.stopPropagation(); handleRemove(f.id) }}
                                        className="ml-1.5 text-slate-500 hover:text-red-400 transition-colors inline-flex items-center pointer-events-auto"
                                      >
                                        <X size={10} />
                                      </button>
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))}

                  {/* X-axis labels */}
                  <div className="flex items-start gap-px mt-1">
                    <div className="w-20 shrink-0" />
                    {[1, 2, 3, 4, 5].map(impact => (
                      <div key={impact} className="flex-1 text-center">
                        <span className="text-[10px] text-slate-500 font-medium block leading-tight">{impact}</span>
                        <span className="text-[9px] text-slate-600 block leading-tight">{IMPACT_LABELS[impact - 1]}</span>
                      </div>
                    ))}
                  </div>

                  {/* X-axis title */}
                  <div className="flex justify-center mt-1">
                    <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Impacto</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 glass-panel p-3">
              <h4 className="text-[11px] text-slate-400 font-medium mb-2">Legenda de Risco</h4>
              <div className="flex items-center gap-4">
                {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).map(level => {
                  const c = RISK_COLORS[level]
                  return (
                    <div key={level} className="flex items-center gap-1.5">
                      <div className={cn('w-4 h-3 rounded-sm border', c.bg, c.border)} />
                      <span className={cn('text-[10px]', c.text)}>{c.label}</span>
                      <span className="text-[9px] text-slate-600">
                        {level === 'low' && '(≤4)'}
                        {level === 'medium' && '(5–9)'}
                        {level === 'high' && '(10–15)'}
                        {level === 'critical' && '(>15)'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mapped findings table */}
            {riskItems.length > 0 && (
              <div className="mt-4 glass-panel p-3">
                <h4 className="text-[11px] text-slate-400 font-medium mb-2 flex items-center gap-1.5">
                  <Hash size={11} className="text-slate-500" />
                  Achados Mapeados ({riskItems.length})
                </h4>
                <div className="space-y-1">
                  {riskItems.map(item => {
                    const finding = findings.find(f => f.id === item.findingId)
                    if (!finding) return null
                    const level = getRiskLevel(item.likelihood, item.impact)
                    const colors = RISK_COLORS[level]
                    return (
                      <div key={item.findingId} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/[0.03] group/row">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: SEVERITY_CONFIG[finding.severity].color }}
                        />
                        <span className="text-[11px] text-slate-300 flex-1 truncate">{finding.title}</span>
                        <span className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded', colors.bg, colors.text)}>
                          {item.likelihood}×{item.impact}={item.likelihood * item.impact}
                        </span>
                        <span className={cn('text-[10px]', colors.text)}>{colors.label}</span>
                        <button
                          onClick={() => handleRemove(item.findingId)}
                          className="opacity-0 group-hover/row:opacity-100 transition-opacity btn-ghost p-0.5"
                        >
                          <X size={11} className="text-slate-500 hover:text-red-400" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right panel: unmapped findings */}
          <div className="w-56 shrink-0">
            <div className="glass-panel p-3 h-full flex flex-col">
              <h4 className="text-[11px] text-slate-400 font-medium mb-2 flex items-center gap-1.5">
                <Plus size={11} className="text-slate-500" />
                Achados Não Mapeados ({unmappedFindings.length})
              </h4>
              <p className="text-[10px] text-slate-600 mb-3">
                Clique em um achado e depois na célula da matriz para posicioná-lo.
              </p>

              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {unmappedFindings.length === 0 && (
                  <div className="text-center py-6">
                    <CheckCircle size={20} className="text-emerald-500/40 mx-auto mb-1.5" />
                    <span className="text-[10px] text-slate-600 block">Todos os achados estão mapeados</span>
                  </div>
                )}

                {unmappedFindings.map(f => {
                  const isSelected = selectedFindingId === f.id
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFindingId(isSelected ? null : f.id)}
                      className={cn(
                        'w-full text-left px-2 py-2 rounded border transition-all',
                        isSelected
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-transparent hover:bg-white/[0.03] hover:border-[var(--ln-1)]',
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full mt-0.5 shrink-0"
                          style={{ backgroundColor: SEVERITY_CONFIG[f.severity].color }}
                        />
                        <div className="min-w-0">
                          <span className="text-[11px] text-slate-300 block truncate">{f.title}</span>
                          <span className="text-[10px] text-slate-600">{SEVERITY_CONFIG[f.severity].label}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-1.5 text-[9px] text-blue-400 flex items-center gap-1">
                          <Target size={9} />
                          Clique na célula da matriz
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
