'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAuditStore } from '@/lib/store'
import { RegulatoryMapping, Pillar, TestResult } from '@/lib/types'
import {
  Shield, Search, Filter, CheckCircle, AlertTriangle, X,
  Target, ChevronDown, ChevronRight, FileText, BookOpen, Scale,
} from '@/components/Icons'
import { cn, buildRegulatoryMappings } from '@/lib/utils'

type ComplianceStatus = 'compliant' | 'partial' | 'non_compliant' | 'not_tested'
type RegSource = 'BACEN' | 'FATF' | 'CVM' | 'Lei' | 'all'

interface CellData {
  procedureCodes: string[]
  results: TestResult[]
  status: ComplianceStatus
}

interface SelectedCell {
  regulationRef: string
  pillarCode: string
}

function classifySource(ref: string): RegSource {
  if (/circular|resolu[çc][ãa]o|bacen|carta.circular/i.test(ref)) return 'BACEN'
  if (/fatf|gafi/i.test(ref)) return 'FATF'
  if (/cvm|instru[çc][ãa]o/i.test(ref)) return 'CVM'
  if (/lei\s/i.test(ref)) return 'Lei'
  return 'BACEN'
}

function deriveCellStatus(results: TestResult[]): ComplianceStatus {
  if (results.length === 0) return 'not_tested'
  const effective = results.filter(r => r !== 'not_tested' && r !== 'not_applicable')
  if (effective.length === 0) return 'not_tested'
  if (effective.every(r => r === 'pass')) return 'compliant'
  if (effective.some(r => r === 'fail')) return 'non_compliant'
  return 'partial'
}

const STATUS_STYLE: Record<ComplianceStatus, { bg: string; ring: string; text: string; label: string }> = {
  compliant:     { bg: 'bg-green-500/20',  ring: 'ring-green-500/30',  text: 'text-green-400',  label: 'Conforme' },
  partial:       { bg: 'bg-yellow-500/20', ring: 'ring-yellow-500/30', text: 'text-yellow-400', label: 'Parcial' },
  non_compliant: { bg: 'bg-red-500/20',    ring: 'ring-red-500/30',    text: 'text-red-400',    label: 'Não Conforme' },
  not_tested:    { bg: 'bg-slate-800',      ring: 'ring-slate-700',     text: 'text-slate-500',  label: 'Não Testado' },
}

const SOURCE_LABELS: Record<RegSource, string> = {
  all: 'Todas',
  BACEN: 'BACEN',
  FATF: 'FATF/GAFI',
  CVM: 'CVM',
  Lei: 'Legislação',
}

export default function RegulatoryMatrix({ auditId }: { auditId: string }) {
  const audit = useAuditStore(s => s.audits.find(a => a.id === auditId))

  const [sourceFilter, setSourceFilter] = useState<RegSource>('all')
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const pillars: Pillar[] = audit?.pillars ?? []

  const findProcResult = useCallback((code: string): TestResult => {
    if (!audit) return 'not_tested'
    for (const p of audit.pillars) {
      for (const sa of p.subAreas) {
        const tp = sa.testProcedures.find(t => t.code === code)
        if (tp) return tp.result
      }
    }
    return 'not_tested'
  }, [audit])

  const rawMappings = useMemo(() => buildRegulatoryMappings(pillars), [pillars])

  const pillarCodes = useMemo(() => {
    const codes = new Set<string>()
    for (const m of rawMappings) codes.add(m.pillarCode)
    return Array.from(codes).sort()
  }, [rawMappings])

  const regulationRefs = useMemo(() => {
    const refs = new Set<string>()
    for (const m of rawMappings) refs.add(m.regulationRef)
    return Array.from(refs).sort()
  }, [rawMappings])

  const matrixData = useMemo(() => {
    const grid: Record<string, Record<string, CellData>> = {}
    for (const ref of regulationRefs) {
      grid[ref] = {}
      for (const pc of pillarCodes) {
        grid[ref][pc] = { procedureCodes: [], results: [], status: 'not_tested' }
      }
    }
    for (const m of rawMappings) {
      const cell = grid[m.regulationRef]?.[m.pillarCode]
      if (!cell) continue
      for (const code of m.testProcedureCodes) {
        if (!cell.procedureCodes.includes(code)) {
          cell.procedureCodes.push(code)
          cell.results.push(findProcResult(code))
        }
      }
    }
    for (const ref of regulationRefs) {
      for (const pc of pillarCodes) {
        grid[ref][pc].status = deriveCellStatus(grid[ref][pc].results)
      }
    }
    return grid
  }, [rawMappings, regulationRefs, pillarCodes, findProcResult])

  const filteredRefs = useMemo(() => {
    return regulationRefs.filter(ref => {
      if (sourceFilter !== 'all' && classifySource(ref) !== sourceFilter) return false
      if (statusFilter !== 'all') {
        const hasMatch = pillarCodes.some(pc => matrixData[ref]?.[pc]?.status === statusFilter)
        if (!hasMatch) return false
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!ref.toLowerCase().includes(q)) {
          const mapping = rawMappings.find(m => m.regulationRef === ref)
          if (!mapping?.description.toLowerCase().includes(q)) return false
        }
      }
      return true
    })
  }, [regulationRefs, sourceFilter, statusFilter, searchQuery, pillarCodes, matrixData, rawMappings])

  const stats = useMemo(() => {
    const total = regulationRefs.length
    let covered = 0
    let testedPass = 0
    let testedTotal = 0
    for (const ref of regulationRefs) {
      let hasCoverage = false
      for (const pc of pillarCodes) {
        const cell = matrixData[ref]?.[pc]
        if (!cell) continue
        if (cell.procedureCodes.length > 0) hasCoverage = true
        if (cell.status !== 'not_tested') {
          testedTotal++
          if (cell.status === 'compliant') testedPass++
        }
      }
      if (hasCoverage) covered++
    }
    return {
      total,
      covered,
      coveragePercent: total > 0 ? Math.round((covered / total) * 100) : 0,
      complianceRate: testedTotal > 0 ? Math.round((testedPass / testedTotal) * 100) : 0,
    }
  }, [regulationRefs, pillarCodes, matrixData])

  const selectedMappingDetail = useMemo(() => {
    if (!selectedCell) return null
    const cell = matrixData[selectedCell.regulationRef]?.[selectedCell.pillarCode]
    const mapping = rawMappings.find(
      m => m.regulationRef === selectedCell.regulationRef && m.pillarCode === selectedCell.pillarCode
    )
    return { cell, mapping }
  }, [selectedCell, matrixData, rawMappings])

  const toggleRow = (ref: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(ref) ? next.delete(ref) : next.add(ref)
      return next
    })
  }

  if (!audit) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Nenhuma auditoria encontrada.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--ln-1)]">
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-slate-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Matriz de Rastreabilidade Regulatória</h3>
            <p className="text-[11px] text-slate-500">
              FATF / BACEN / CVM — Mapeamento de regulamentações × pilares × procedimentos
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <BookOpen size={12} className="text-blue-400" />
            <span className="text-[11px] text-slate-400">
              Requisitos: <span className="text-slate-200 font-medium">{stats.total}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target size={12} className="text-cyan-400" />
            <span className="text-[11px] text-slate-400">
              Cobertura: <span className="text-slate-200 font-medium">{stats.coveragePercent}%</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle size={12} className="text-emerald-400" />
            <span className="text-[11px] text-slate-400">
              Conformidade: <span className="text-slate-200 font-medium">{stats.complianceRate}%</span>
            </span>
          </div>
          <div className="h-3 w-px bg-[var(--ln-1)]" />
          {(Object.entries(STATUS_STYLE) as [ComplianceStatus, typeof STATUS_STYLE[ComplianceStatus]][]).map(([status, cfg]) => {
            const count = filteredRefs.filter(ref =>
              pillarCodes.some(pc => matrixData[ref]?.[pc]?.status === status)
            ).length
            return (
              <div key={status} className="flex items-center gap-1">
                <div className={cn('w-2 h-2 rounded-full', cfg.bg, 'ring-1', cfg.ring)} />
                <span className="text-[10px] text-slate-500">{cfg.label}: {count}</span>
              </div>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="relative">
            <Filter size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value as RegSource)}
              className="pl-7 pr-6 py-1 text-xs bg-[var(--sf-2)] border border-[var(--ln-1)] rounded text-slate-300 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            >
              {(Object.entries(SOURCE_LABELS) as [RegSource, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          <div className="relative">
            <Shield size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as ComplianceStatus | 'all')}
              className="pl-7 pr-6 py-1 text-xs bg-[var(--sf-2)] border border-[var(--ln-1)] rounded text-slate-300 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            >
              <option value="all">Todos os status</option>
              {(Object.entries(STATUS_STYLE) as [ComplianceStatus, typeof STATUS_STYLE[ComplianceStatus]][]).map(([k, cfg]) => (
                <option key={k} value={k}>{cfg.label}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar regulamentação..."
              className="w-full pl-7 pr-7 py-1 text-xs bg-[var(--sf-2)] border border-[var(--ln-1)] rounded text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X size={10} />
              </button>
            )}
          </div>

          <span className="text-[10px] text-slate-600 ml-auto">
            {filteredRefs.length} de {regulationRefs.length} regulamentações
          </span>
        </div>
      </div>

      {/* Matrix table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse min-w-max">
          <thead className="sticky top-0 z-10 bg-[var(--sf-1)]">
            <tr>
              <th className="sticky left-0 z-20 bg-[var(--sf-1)] text-left text-[11px] font-medium text-slate-400 px-3 py-2 border-b border-r border-[var(--ln-1)] min-w-[260px]">
                Referência Regulatória
              </th>
              {pillarCodes.map(pc => (
                <th
                  key={pc}
                  className="text-center text-[10px] font-medium text-slate-400 px-1.5 py-2 border-b border-[var(--ln-1)] min-w-[56px] whitespace-nowrap"
                >
                  {pc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRefs.length === 0 ? (
              <tr>
                <td
                  colSpan={pillarCodes.length + 1}
                  className="text-center text-xs text-slate-500 py-12"
                >
                  Nenhuma regulamentação encontrada com os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredRefs.map(ref => {
                const isExpanded = expandedRows.has(ref)
                const source = classifySource(ref)
                const mapping = rawMappings.find(m => m.regulationRef === ref)

                return (
                  <tr
                    key={ref}
                    className="group hover:bg-[var(--sf-2)]/50 transition-colors"
                  >
                    <td className="sticky left-0 z-[5] bg-[var(--sf-1)] group-hover:bg-[var(--sf-2)] border-b border-r border-[var(--ln-1)] px-2 py-1.5 transition-colors">
                      <button
                        onClick={() => toggleRow(ref)}
                        className="flex items-start gap-1.5 w-full text-left"
                      >
                        {isExpanded
                          ? <ChevronDown size={12} className="text-slate-500 mt-0.5 shrink-0" />
                          : <ChevronRight size={12} className="text-slate-500 mt-0.5 shrink-0" />
                        }
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              'text-[9px] font-medium px-1 py-px rounded',
                              source === 'BACEN' && 'bg-blue-500/15 text-blue-400',
                              source === 'FATF' && 'bg-purple-500/15 text-purple-400',
                              source === 'CVM' && 'bg-cyan-500/15 text-cyan-400',
                              source === 'Lei' && 'bg-amber-500/15 text-amber-400',
                            )}>
                              {source}
                            </span>
                            <span className="text-xs text-slate-300 truncate">{ref}</span>
                          </div>
                          {isExpanded && mapping && (
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed max-w-[240px]">
                              {mapping.description}
                            </p>
                          )}
                        </div>
                      </button>
                    </td>

                    {pillarCodes.map(pc => {
                      const cell = matrixData[ref]?.[pc]
                      if (!cell) return <td key={pc} className="border-b border-[var(--ln-1)]" />
                      const style = STATUS_STYLE[cell.status]
                      const isSelected = selectedCell?.regulationRef === ref && selectedCell?.pillarCode === pc

                      return (
                        <td
                          key={pc}
                          className="border-b border-[var(--ln-1)] p-0.5 text-center"
                        >
                          {cell.procedureCodes.length > 0 ? (
                            <button
                              onClick={() => setSelectedCell(
                                isSelected ? null : { regulationRef: ref, pillarCode: pc }
                              )}
                              className={cn(
                                'w-full rounded px-1 py-1 transition-all ring-1',
                                style.bg, style.ring,
                                isSelected && 'ring-2 ring-blue-400 brightness-125',
                                'hover:brightness-110 cursor-pointer',
                              )}
                            >
                              <span className={cn('text-[9px] font-mono font-medium leading-tight block', style.text)}>
                                {cell.procedureCodes.length}
                              </span>
                            </button>
                          ) : (
                            <div className="w-full h-6" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selectedCell && selectedMappingDetail && (
        <div className="border-t border-[var(--ln-1)] bg-[var(--sf-2)] p-4 max-h-[200px] overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-200">
                {selectedCell.regulationRef}
              </span>
              <span className="text-[10px] text-slate-500">→</span>
              <span className="text-xs font-medium text-slate-300">
                Pilar {selectedCell.pillarCode}
              </span>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="btn-ghost p-1 rounded hover:bg-[var(--sf-1)]"
            >
              <X size={14} className="text-slate-400" />
            </button>
          </div>

          {selectedMappingDetail.mapping && (
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              {selectedMappingDetail.mapping.description}
            </p>
          )}

          {selectedMappingDetail.cell && selectedMappingDetail.cell.procedureCodes.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                Procedimentos de Teste
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {selectedMappingDetail.cell.procedureCodes.map((code, i) => {
                  const result = selectedMappingDetail.cell!.results[i] ?? 'not_tested'
                  const resultStyle = result === 'pass'
                    ? 'bg-green-500/15 text-green-400 ring-green-500/30'
                    : result === 'fail'
                      ? 'bg-red-500/15 text-red-400 ring-red-500/30'
                      : result === 'partial'
                        ? 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30'
                        : 'bg-slate-800 text-slate-500 ring-slate-700'

                  return (
                    <div
                      key={code}
                      className={cn('flex items-center gap-1.5 px-2 py-1 rounded ring-1 text-[10px] font-mono', resultStyle)}
                    >
                      {result === 'pass' && <CheckCircle size={10} />}
                      {result === 'fail' && <AlertTriangle size={10} />}
                      {result === 'partial' && <AlertTriangle size={10} />}
                      <span>{code}</span>
                      <span className="text-[9px] opacity-70">
                        {result === 'pass' ? 'OK' : result === 'fail' ? 'FALHA' : result === 'partial' ? 'PARCIAL' : 'N/T'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
