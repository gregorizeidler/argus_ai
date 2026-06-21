'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAuditStore } from '@/lib/store'
import { AuditPlanning, PriorFinding, Severity } from '@/lib/types'
import { Settings, Calendar, Target, AlertTriangle, Plus, X, Save, FileText, Hash, Percent, ClipboardList } from './Icons'
import { cn, generateId } from '@/lib/utils'

interface Props {
  auditId: string
}

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
}

const STATUS_LABELS: Record<PriorFinding['status'], string> = {
  open: 'Aberto',
  remediated: 'Remediado',
  partially_remediated: 'Parcialmente Remediado',
  not_addressed: 'Não Endereçado',
}

const STATUS_COLORS: Record<PriorFinding['status'], string> = {
  open: 'bg-red-500/20 text-red-400 border-red-500/30',
  remediated: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  partially_remediated: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  not_addressed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const POPULATION_SIZES = [50, 100, 500, 1000, 5000]

function calculateSampleSize(confidenceLevel: number, tolerableErrorRate: number, populationSize: number): number {
  if (tolerableErrorRate <= 0 || tolerableErrorRate >= 100 || confidenceLevel <= 0 || confidenceLevel >= 100) return populationSize
  const raw = Math.ceil(Math.log(1 - confidenceLevel / 100) / Math.log(1 - tolerableErrorRate / 100))
  return Math.min(raw, populationSize)
}

function getDefaultPlanning(): AuditPlanning {
  return {
    auditPeriodStart: '',
    auditPeriodEnd: '',
    tolerableErrorRate: 5,
    confidenceLevel: 95,
    scopeNotes: '',
    limitations: [],
    teamNotes: '',
    priorFindings: [],
  }
}

export default function PlanningPanel({ auditId }: Props) {
  const { getCurrentAudit, updateAuditPlanning } = useAuditStore()
  const audit = getCurrentAudit()
  const planning = audit?.planning ?? getDefaultPlanning()

  const [periodStart, setPeriodStart] = useState(planning.auditPeriodStart)
  const [periodEnd, setPeriodEnd] = useState(planning.auditPeriodEnd)
  const [materialityThreshold, setMaterialityThreshold] = useState<string>(
    planning.materialityThreshold?.toString() ?? ''
  )
  const [ter, setTer] = useState(planning.tolerableErrorRate)
  const [confidence, setConfidence] = useState(planning.confidenceLevel)
  const [scopeNotes, setScopeNotes] = useState(planning.scopeNotes)
  const [teamNotes, setTeamNotes] = useState(planning.teamNotes)
  const [limitations, setLimitations] = useState<string[]>(planning.limitations)
  const [newLimitation, setNewLimitation] = useState('')
  const [priorFindings, setPriorFindings] = useState<PriorFinding[]>(planning.priorFindings)
  const [showAddFinding, setShowAddFinding] = useState(false)
  const [newFinding, setNewFinding] = useState({
    title: '',
    severity: 'medium' as Severity,
    status: 'open' as PriorFinding['status'],
    originalDate: '',
    followUpNotes: '',
  })

  const sampleSizeTable = useMemo(
    () => POPULATION_SIZES.map(pop => ({
      population: pop,
      sample: calculateSampleSize(confidence, ter, pop),
    })),
    [confidence, ter]
  )

  const save = useCallback(
    (partial: Partial<AuditPlanning>) => {
      updateAuditPlanning(auditId, partial)
    },
    [auditId, updateAuditPlanning]
  )

  const savePeriod = (field: 'auditPeriodStart' | 'auditPeriodEnd', value: string) => {
    save({ [field]: value })
  }

  const saveMateriality = () => {
    const val = materialityThreshold.trim() === '' ? undefined : Number(materialityThreshold)
    save({ materialityThreshold: val })
  }

  const saveSampling = (newTer: number, newConf: number) => {
    save({ tolerableErrorRate: newTer, confidenceLevel: newConf })
  }

  const addLimitation = () => {
    if (!newLimitation.trim()) return
    const updated = [...limitations, newLimitation.trim()]
    setLimitations(updated)
    setNewLimitation('')
    save({ limitations: updated })
  }

  const removeLimitation = (index: number) => {
    const updated = limitations.filter((_, i) => i !== index)
    setLimitations(updated)
    save({ limitations: updated })
  }

  const addPriorFinding = () => {
    if (!newFinding.title.trim()) return
    const finding: PriorFinding = {
      id: generateId(),
      title: newFinding.title,
      severity: newFinding.severity,
      status: newFinding.status,
      originalDate: newFinding.originalDate,
      followUpNotes: newFinding.followUpNotes || undefined,
    }
    const updated = [...priorFindings, finding]
    setPriorFindings(updated)
    save({ priorFindings: updated })
    setNewFinding({ title: '', severity: 'medium', status: 'open', originalDate: '', followUpNotes: '' })
    setShowAddFinding(false)
  }

  const removePriorFinding = (id: string) => {
    const updated = priorFindings.filter(f => f.id !== id)
    setPriorFindings(updated)
    save({ priorFindings: updated })
  }

  const updatePriorFindingStatus = (id: string, status: PriorFinding['status']) => {
    const updated = priorFindings.map(f => (f.id === id ? { ...f, status } : f))
    setPriorFindings(updated)
    save({ priorFindings: updated })
  }

  if (!audit) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Nenhuma auditoria selecionada.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto scroll-thin">
      <div className="p-4 border-b border-[var(--ln-1)]">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200">Planejamento da Auditoria</h2>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">{audit.name}</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Audit Period */}
        <section className="glass-panel p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-blue-400" />
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Período da Auditoria</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Data Início</label>
              <input
                type="date"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
                onBlur={() => savePeriod('auditPeriodStart', periodStart)}
                className="input-field text-xs w-full"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Data Fim</label>
              <input
                type="date"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
                onBlur={() => savePeriod('auditPeriodEnd', periodEnd)}
                className="input-field text-xs w-full"
              />
            </div>
          </div>
          {audit.scope.period.end && (
            <p className="text-[11px] text-slate-500">
              Data-base de referência: {new Date(audit.scope.period.end).toLocaleDateString('pt-BR')}
            </p>
          )}
        </section>

        {/* Scope & Objectives */}
        <section className="glass-panel p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} className="text-emerald-400" />
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Escopo & Objetivos</h3>
          </div>

          {audit.scope.objectives.length > 0 && (
            <div>
              <label className="text-[11px] text-slate-500 block mb-1.5">Objetivos</label>
              <ul className="space-y-1">
                {audit.scope.objectives.map((obj, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {audit.scope.methodology && (
            <div>
              <label className="text-[11px] text-slate-500 block mb-1.5">Metodologia</label>
              <p className="text-xs text-slate-400 bg-[var(--sf-2)] rounded p-2 border border-[var(--ln-1)]">
                {audit.scope.methodology}
              </p>
            </div>
          )}

          <div>
            <label className="text-[11px] text-slate-500 block mb-1.5">Notas de Escopo</label>
            <textarea
              value={scopeNotes}
              onChange={e => setScopeNotes(e.target.value)}
              onBlur={() => save({ scopeNotes })}
              placeholder="Observações adicionais sobre o escopo da auditoria..."
              className="textarea-field text-xs w-full"
              rows={3}
            />
          </div>
        </section>

        {/* Materiality & Sampling */}
        <section className="glass-panel p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash size={14} className="text-violet-400" />
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Materialidade & Amostragem</h3>
          </div>

          <div>
            <label className="text-[11px] text-slate-500 block mb-1">Limiar de Materialidade (R$)</label>
            <input
              type="number"
              value={materialityThreshold}
              onChange={e => setMaterialityThreshold(e.target.value)}
              onBlur={saveMateriality}
              placeholder="Opcional"
              className="input-field text-xs w-full"
              min={0}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 flex items-center gap-1 mb-1">
                <Percent size={10} /> Taxa de Erro Tolerável (%)
              </label>
              <input
                type="number"
                value={ter}
                onChange={e => {
                  const v = Number(e.target.value)
                  setTer(v)
                }}
                onBlur={() => saveSampling(ter, confidence)}
                className="input-field text-xs w-full"
                min={0.1}
                max={99}
                step={0.5}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 flex items-center gap-1 mb-1">
                <Percent size={10} /> Nível de Confiança (%)
              </label>
              <input
                type="number"
                value={confidence}
                onChange={e => {
                  const v = Number(e.target.value)
                  setConfidence(v)
                }}
                onBlur={() => saveSampling(ter, confidence)}
                className="input-field text-xs w-full"
                min={50}
                max={99.9}
                step={0.5}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-500 block mb-2">Tamanho de Amostra Recomendado</label>
            <div className="border border-[var(--ln-1)] rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--sf-2)]">
                    <th className="text-left px-3 py-1.5 text-slate-400 font-medium">População</th>
                    <th className="text-right px-3 py-1.5 text-slate-400 font-medium">Amostra</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleSizeTable.map(({ population, sample }) => (
                    <tr key={population} className="border-t border-[var(--ln-1)]">
                      <td className="px-3 py-1.5 text-slate-300">
                        {population >= 5000 ? `${population.toLocaleString('pt-BR')}+` : population.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-200 font-medium">{sample}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5">
              Fórmula: n = ⌈ln(1−NC) / ln(1−TET)⌉, limitado ao tamanho da população.
            </p>
          </div>
        </section>

        {/* Limitations */}
        <section className="glass-panel p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Limitações</h3>
          </div>

          {limitations.length > 0 ? (
            <ul className="space-y-2">
              {limitations.map((lim, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-[var(--sf-2)] rounded p-2 border border-[var(--ln-1)]">
                  <span className="flex-1">{lim}</span>
                  <button
                    onClick={() => removeLimitation(i)}
                    className="text-slate-600 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-slate-600 italic">Nenhuma limitação registrada.</p>
          )}

          <div className="flex gap-2">
            <input
              value={newLimitation}
              onChange={e => setNewLimitation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLimitation()}
              placeholder="Adicionar limitação..."
              className="input-field text-xs flex-1"
            />
            <button onClick={addLimitation} className="btn-secondary text-xs py-1.5 px-3 shrink-0">
              <Plus size={12} className="inline mr-1" /> Adicionar
            </button>
          </div>
        </section>

        {/* Prior Findings */}
        <section className="glass-panel p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ClipboardList size={14} className="text-orange-400" />
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Achados Anteriores</h3>
            </div>
            <button
              onClick={() => setShowAddFinding(!showAddFinding)}
              className="btn-secondary text-xs py-1 px-2.5"
            >
              <Plus size={12} className="inline mr-1" />Novo
            </button>
          </div>

          {showAddFinding && (
            <div className="bg-[var(--sf-2)] border border-[var(--ln-1)] rounded p-3 space-y-2.5">
              <input
                value={newFinding.title}
                onChange={e => setNewFinding({ ...newFinding, title: e.target.value })}
                placeholder="Título do achado"
                className="input-field text-xs w-full"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newFinding.severity}
                  onChange={e => setNewFinding({ ...newFinding, severity: e.target.value as Severity })}
                  className="select-field text-xs"
                >
                  <option value="critical">Crítico</option>
                  <option value="high">Alto</option>
                  <option value="medium">Médio</option>
                  <option value="low">Baixo</option>
                </select>
                <select
                  value={newFinding.status}
                  onChange={e => setNewFinding({ ...newFinding, status: e.target.value as PriorFinding['status'] })}
                  className="select-field text-xs"
                >
                  <option value="open">Aberto</option>
                  <option value="remediated">Remediado</option>
                  <option value="partially_remediated">Parcialmente Remediado</option>
                  <option value="not_addressed">Não Endereçado</option>
                </select>
              </div>
              <input
                type="date"
                value={newFinding.originalDate}
                onChange={e => setNewFinding({ ...newFinding, originalDate: e.target.value })}
                className="input-field text-xs w-full"
              />
              <textarea
                value={newFinding.followUpNotes}
                onChange={e => setNewFinding({ ...newFinding, followUpNotes: e.target.value })}
                placeholder="Notas de acompanhamento (opcional)"
                className="textarea-field text-xs w-full"
                rows={2}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddFinding(false)} className="btn-ghost text-xs py-1.5 px-3">
                  Cancelar
                </button>
                <button onClick={addPriorFinding} className="btn-primary text-xs py-1.5 px-3">
                  <Save size={12} className="inline mr-1" /> Salvar
                </button>
              </div>
            </div>
          )}

          {priorFindings.length > 0 ? (
            <div className="space-y-2">
              {priorFindings.map(finding => (
                <div
                  key={finding.id}
                  className="bg-[var(--sf-2)] border border-[var(--ln-1)] rounded p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{finding.title}</p>
                      {finding.originalDate && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(finding.originalDate).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removePriorFinding(finding.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('severity-badge', `severity-${finding.severity}`)}>
                      {SEVERITY_LABELS[finding.severity]}
                    </span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', STATUS_COLORS[finding.status])}>
                      {STATUS_LABELS[finding.status]}
                    </span>
                    <select
                      value={finding.status}
                      onChange={e => updatePriorFindingStatus(finding.id, e.target.value as PriorFinding['status'])}
                      className="select-field text-[10px] py-0.5 ml-auto"
                    >
                      <option value="open">Aberto</option>
                      <option value="remediated">Remediado</option>
                      <option value="partially_remediated">Parcial</option>
                      <option value="not_addressed">Não Endereçado</option>
                    </select>
                  </div>
                  {finding.followUpNotes && (
                    <p className="text-[11px] text-slate-400 border-t border-[var(--ln-1)] pt-2">
                      {finding.followUpNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !showAddFinding && (
              <p className="text-[11px] text-slate-600 italic">Nenhum achado anterior registrado.</p>
            )
          )}
        </section>

        {/* Team Notes */}
        <section className="glass-panel p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-cyan-400" />
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Notas da Equipe</h3>
          </div>
          <textarea
            value={teamNotes}
            onChange={e => setTeamNotes(e.target.value)}
            onBlur={() => save({ teamNotes })}
            placeholder="Memorandos de trabalho, anotações da equipe..."
            className="textarea-field text-xs w-full"
            rows={5}
          />
        </section>
      </div>
    </div>
  )
}
