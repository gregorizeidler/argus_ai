'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useAuditStore } from '@/lib/store'
import { AuditMilestone, AuditPhase } from '@/lib/types'
import { Calendar, Plus, X, CheckCircle, Clock, AlertTriangle, Save, Edit3, Target, Loader2, ChevronRight } from '@/components/Icons'
import { cn, generateId } from '@/lib/utils'

const PHASE_CONFIG: Record<AuditPhase, { label: string; color: string; gradient: string; bg: string; border: string }> = {
  planning:  { label: 'Planejamento', color: 'text-blue-400',    gradient: 'from-blue-600/80 to-blue-500/60',     bg: 'bg-blue-500/20',    border: 'border-blue-500/40' },
  fieldwork: { label: 'Trabalho de Campo', color: 'text-amber-400',   gradient: 'from-amber-600/80 to-amber-500/60',   bg: 'bg-amber-500/20',   border: 'border-amber-500/40' },
  testing:   { label: 'Testes', color: 'text-purple-400',  gradient: 'from-purple-600/80 to-purple-500/60',  bg: 'bg-purple-500/20',  border: 'border-purple-500/40' },
  reporting: { label: 'Relatório', color: 'text-green-400',   gradient: 'from-green-600/80 to-green-500/60',   bg: 'bg-green-500/20',   border: 'border-green-500/40' },
  completed: { label: 'Concluído', color: 'text-emerald-400', gradient: 'from-emerald-600/80 to-emerald-500/60', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' },
}

const STATUS_CONFIG: Record<AuditMilestone['status'], { label: string; icon: typeof CheckCircle; color: string; dot: string }> = {
  pending:     { label: 'Pendente',     icon: Clock,         color: 'text-slate-400',  dot: 'bg-slate-400' },
  in_progress: { label: 'Em Andamento', icon: Loader2,       color: 'text-blue-400',   dot: 'bg-blue-400' },
  completed:   { label: 'Concluído',    icon: CheckCircle,   color: 'text-emerald-400', dot: 'bg-emerald-400' },
  delayed:     { label: 'Atrasado',     icon: AlertTriangle, color: 'text-red-400',    dot: 'bg-red-400' },
}

const PHASES_ORDER: AuditPhase[] = ['planning', 'fieldwork', 'testing', 'reporting', 'completed']

const DEFAULT_MILESTONES: Omit<AuditMilestone, 'id' | 'targetDate' | 'status'>[] = [
  { phase: 'planning',  name: 'Reunião de Kick-off' },
  { phase: 'planning',  name: 'Solicitação PBC' },
  { phase: 'fieldwork', name: 'Coleta de Evidências' },
  { phase: 'fieldwork', name: 'Início do Trabalho de Campo' },
  { phase: 'testing',   name: 'Início dos Testes' },
  { phase: 'reporting', name: 'Relatório Preliminar' },
  { phase: 'reporting', name: 'Resposta da Administração' },
  { phase: 'completed', name: 'Relatório Final' },
]

export default function AuditTimeline({ auditId }: { auditId: string }) {
  const audit = useAuditStore(s => s.audits.find(a => a.id === auditId))
  const { addMilestone, updateMilestone, deleteMilestone } = useAuditStore()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<AuditMilestone>>({})
  const [newMilestone, setNewMilestone] = useState({
    name: '',
    phase: 'planning' as AuditPhase,
    targetDate: '',
    status: 'pending' as AuditMilestone['status'],
    notes: '',
  })

  const milestones = useMemo(() => audit?.milestones || [], [audit?.milestones])

  const autoPopulated = useMemo(() => milestones.length > 0, [milestones.length])

  useEffect(() => {
    if (!audit || autoPopulated) return
    const start = audit.planning?.auditPeriodStart
      ? new Date(audit.planning.auditPeriodStart)
      : new Date(audit.createdAt)
    const end = audit.planning?.auditPeriodEnd
      ? new Date(audit.planning.auditPeriodEnd)
      : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000)

    const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    const phaseOffsets: Record<AuditPhase, number> = {
      planning: 0, fieldwork: 0.2, testing: 0.45, reporting: 0.7, completed: 0.95,
    }

    DEFAULT_MILESTONES.forEach((m, i) => {
      const phaseStart = phaseOffsets[m.phase]
      const offset = phaseStart + (i % 2) * 0.05
      const date = new Date(start.getTime() + offset * totalDays * 24 * 60 * 60 * 1000)
      addMilestone(auditId, {
        phase: m.phase,
        name: m.name,
        targetDate: date.toISOString().slice(0, 10),
        status: 'pending',
      })
    })
  }, [audit, autoPopulated, auditId, addMilestone])

  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    const now = new Date()
    let start = audit?.planning?.auditPeriodStart
      ? new Date(audit.planning.auditPeriodStart)
      : new Date(audit?.createdAt || now)
    let end = audit?.planning?.auditPeriodEnd
      ? new Date(audit.planning.auditPeriodEnd)
      : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000)

    milestones.forEach(m => {
      const d = new Date(m.targetDate)
      if (d < start) start = d
      if (d > end) end = d
    })

    start = new Date(start.getTime() - 3 * 24 * 60 * 60 * 1000)
    end = new Date(end.getTime() + 7 * 24 * 60 * 60 * 1000)

    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))),
    }
  }, [audit, milestones])

  const dateToPercent = useCallback((dateStr: string) => {
    const d = new Date(dateStr)
    const elapsed = d.getTime() - timelineStart.getTime()
    return Math.max(0, Math.min(100, (elapsed / (totalDays * 24 * 60 * 60 * 1000)) * 100))
  }, [timelineStart, totalDays])

  const todayPercent = useMemo(() => {
    const now = new Date()
    const elapsed = now.getTime() - timelineStart.getTime()
    return Math.max(0, Math.min(100, (elapsed / (totalDays * 24 * 60 * 60 * 1000)) * 100))
  }, [timelineStart, totalDays])

  const phaseRanges = useMemo(() => {
    return PHASES_ORDER.map(phase => {
      const phaseMilestones = milestones.filter(m => m.phase === phase)
      if (phaseMilestones.length === 0) return null
      const dates = phaseMilestones.map(m => new Date(m.targetDate).getTime())
      const earliest = Math.min(...dates)
      const latest = Math.max(...dates)
      const padding = 2 * 24 * 60 * 60 * 1000
      const startPct = dateToPercent(new Date(earliest - padding).toISOString())
      const endPct = dateToPercent(new Date(latest + padding).toISOString())
      return { phase, startPct, widthPct: Math.max(endPct - startPct, 3) }
    }).filter(Boolean) as { phase: AuditPhase; startPct: number; widthPct: number }[]
  }, [milestones, dateToPercent])

  const monthMarkers = useMemo(() => {
    const markers: { label: string; pct: number }[] = []
    const cursor = new Date(timelineStart)
    cursor.setDate(1)
    cursor.setMonth(cursor.getMonth() + 1)
    while (cursor <= timelineEnd) {
      const pct = dateToPercent(cursor.toISOString())
      markers.push({
        label: cursor.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        pct,
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return markers
  }, [timelineStart, timelineEnd, dateToPercent])

  const summaryStats = useMemo(() => {
    const completed = milestones.filter(m => m.status === 'completed').length
    const total = milestones.length
    const now = new Date()
    const start = audit?.planning?.auditPeriodStart
      ? new Date(audit.planning.auditPeriodStart)
      : new Date(audit?.createdAt || now)
    const end = audit?.planning?.auditPeriodEnd
      ? new Date(audit.planning.auditPeriodEnd)
      : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000)
    const elapsed = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
    const remaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    return { completed, total, elapsed, remaining }
  }, [audit, milestones])

  const handleAdd = useCallback(() => {
    if (!newMilestone.name.trim() || !newMilestone.targetDate) return
    addMilestone(auditId, {
      phase: newMilestone.phase,
      name: newMilestone.name.trim(),
      targetDate: newMilestone.targetDate,
      status: newMilestone.status,
      notes: newMilestone.notes || undefined,
    })
    setNewMilestone({ name: '', phase: 'planning', targetDate: '', status: 'pending', notes: '' })
    setShowAddForm(false)
  }, [addMilestone, auditId, newMilestone])

  const startEdit = useCallback((m: AuditMilestone) => {
    setEditingId(m.id)
    setEditDraft({ name: m.name, phase: m.phase, targetDate: m.targetDate, status: m.status, notes: m.notes })
  }, [])

  const saveEdit = useCallback(() => {
    if (!editingId) return
    updateMilestone(auditId, editingId, editDraft)
    setEditingId(null)
    setEditDraft({})
  }, [editingId, editDraft, auditId, updateMilestone])

  const markComplete = useCallback((m: AuditMilestone) => {
    updateMilestone(auditId, m.id, {
      status: 'completed',
      completedDate: new Date().toISOString().slice(0, 10),
    })
  }, [auditId, updateMilestone])

  if (!audit) return null

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="glass-panel p-3 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-blue-400" />
          <span className="text-xs text-slate-400">Marcos</span>
          <span className="text-sm font-medium text-slate-100">
            {summaryStats.completed}/{summaryStats.total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-amber-400" />
          <span className="text-xs text-slate-400">Dias decorridos</span>
          <span className="text-sm font-medium text-slate-100">{summaryStats.elapsed}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-emerald-400" />
          <span className="text-xs text-slate-400">Dias restantes</span>
          <span className="text-sm font-medium text-slate-100">{summaryStats.remaining}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {summaryStats.total > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${(summaryStats.completed / summaryStats.total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-400">
                {Math.round((summaryStats.completed / summaryStats.total) * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Calendar size={14} className="text-blue-400" />
            Linha do Tempo da Auditoria
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-ghost text-xs flex items-center gap-1 px-2 py-1"
          >
            <Plus size={12} />
            Novo Marco
          </button>
        </div>

        {/* Phase Legend */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {PHASES_ORDER.map(phase => (
            <div key={phase} className="flex items-center gap-1.5">
              <div className={cn('w-3 h-2 rounded-sm bg-gradient-to-r', PHASE_CONFIG[phase].gradient)} />
              <span className="text-[10px] text-slate-400">{PHASE_CONFIG[phase].label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-2">
            <div className="w-0 h-3 border-l border-dashed border-red-400" />
            <span className="text-[10px] text-slate-400">Hoje</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="overflow-x-auto pb-2">
          <div className="relative min-w-[600px]" style={{ height: `${phaseRanges.length * 36 + 60}px` }}>
            {/* Month grid lines */}
            {monthMarkers.map((marker, i) => (
              <div key={i} className="absolute top-0 bottom-0" style={{ left: `${marker.pct}%` }}>
                <div className="w-px h-full" style={{ background: 'var(--ln-1)', opacity: 0.3 }} />
                <span className="absolute -top-0 text-[9px] text-slate-500 -translate-x-1/2 whitespace-nowrap">
                  {marker.label}
                </span>
              </div>
            ))}

            {/* Today marker */}
            {todayPercent > 0 && todayPercent < 100 && (
              <div
                className="absolute top-4 bottom-0 z-10"
                style={{ left: `${todayPercent}%` }}
              >
                <div className="w-px h-full border-l border-dashed border-red-400/70" />
                <div className="absolute -top-3.5 -translate-x-1/2 bg-red-500/90 text-white text-[8px] px-1 py-0.5 rounded font-medium whitespace-nowrap">
                  Hoje
                </div>
              </div>
            )}

            {/* Phase bars */}
            {phaseRanges.map((range, i) => {
              const cfg = PHASE_CONFIG[range.phase]
              return (
                <div
                  key={range.phase}
                  className={cn('absolute h-6 rounded-md bg-gradient-to-r shadow-sm', cfg.gradient)}
                  style={{
                    left: `${range.startPct}%`,
                    width: `${range.widthPct}%`,
                    top: `${20 + i * 36}px`,
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/90 truncate px-2">
                    {cfg.label}
                  </span>
                </div>
              )
            })}

            {/* Milestone diamonds */}
            {milestones.map(m => {
              const pct = dateToPercent(m.targetDate)
              const phaseIdx = phaseRanges.findIndex(r => r.phase === m.phase)
              if (phaseIdx === -1) return null
              const statusCfg = STATUS_CONFIG[m.status]
              return (
                <div
                  key={m.id}
                  className="absolute z-20 group"
                  style={{
                    left: `${pct}%`,
                    top: `${20 + phaseIdx * 36 + 3}px`,
                  }}
                >
                  <div
                    className={cn(
                      'w-3.5 h-3.5 rotate-45 border -translate-x-1/2 cursor-pointer transition-transform hover:scale-125',
                      m.status === 'completed' ? 'bg-emerald-500 border-emerald-400' :
                      m.status === 'delayed' ? 'bg-red-500 border-red-400' :
                      m.status === 'in_progress' ? 'bg-blue-500 border-blue-400 animate-pulse' :
                      'bg-slate-500 border-slate-400'
                    )}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30">
                    <div className="glass-panel px-2 py-1.5 rounded shadow-lg whitespace-nowrap text-[10px]">
                      <div className="font-medium text-slate-100">{m.name}</div>
                      <div className="text-slate-400 flex items-center gap-1 mt-0.5">
                        <statusCfg.icon size={9} className={statusCfg.color} />
                        {statusCfg.label} · {new Date(m.targetDate).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add Milestone Form */}
      {showAddForm && (
        <div className="glass-panel p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <Plus size={12} className="text-blue-400" />
              Novo Marco
            </h4>
            <button onClick={() => setShowAddForm(false)} className="btn-ghost p-1">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input
              type="text"
              placeholder="Nome do marco"
              value={newMilestone.name}
              onChange={e => setNewMilestone(p => ({ ...p, name: e.target.value }))}
              className="col-span-2 px-2 py-1.5 rounded text-xs border bg-[var(--sf-1)] border-[var(--ln-1)] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
            <select
              value={newMilestone.phase}
              onChange={e => setNewMilestone(p => ({ ...p, phase: e.target.value as AuditPhase }))}
              className="px-2 py-1.5 rounded text-xs border bg-[var(--sf-1)] border-[var(--ln-1)] text-slate-100 focus:outline-none focus:border-blue-500/50"
            >
              {PHASES_ORDER.map(p => (
                <option key={p} value={p}>{PHASE_CONFIG[p].label}</option>
              ))}
            </select>
            <input
              type="date"
              value={newMilestone.targetDate}
              onChange={e => setNewMilestone(p => ({ ...p, targetDate: e.target.value }))}
              className="px-2 py-1.5 rounded text-xs border bg-[var(--sf-1)] border-[var(--ln-1)] text-slate-100 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select
              value={newMilestone.status}
              onChange={e => setNewMilestone(p => ({ ...p, status: e.target.value as AuditMilestone['status'] }))}
              className="px-2 py-1.5 rounded text-xs border bg-[var(--sf-1)] border-[var(--ln-1)] text-slate-100 focus:outline-none focus:border-blue-500/50"
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Observações (opcional)"
              value={newMilestone.notes}
              onChange={e => setNewMilestone(p => ({ ...p, notes: e.target.value }))}
              className="col-span-2 sm:col-span-2 px-2 py-1.5 rounded text-xs border bg-[var(--sf-1)] border-[var(--ln-1)] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
            <button
              onClick={handleAdd}
              disabled={!newMilestone.name.trim() || !newMilestone.targetDate}
              className="btn-primary text-xs px-3 py-1.5 flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <Save size={12} />
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Milestones List */}
      <div className="glass-panel divide-y divide-[var(--ln-1)]">
        <div className="p-3 flex items-center gap-2">
          <Target size={14} className="text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-100">Marcos da Auditoria</h3>
          <span className="text-[10px] text-slate-500 ml-auto">{milestones.length} marcos</span>
        </div>
        {PHASES_ORDER.map(phase => {
          const phaseMilestones = milestones.filter(m => m.phase === phase)
          if (phaseMilestones.length === 0) return null
          const cfg = PHASE_CONFIG[phase]
          return (
            <div key={phase}>
              <div className={cn('px-3 py-1.5 flex items-center gap-2', cfg.bg)}>
                <ChevronRight size={10} className={cfg.color} />
                <span className={cn('text-[10px] font-semibold uppercase tracking-wider', cfg.color)}>
                  {cfg.label}
                </span>
                <span className="text-[10px] text-slate-500">{phaseMilestones.length}</span>
              </div>
              {phaseMilestones
                .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
                .map(m => {
                  const statusCfg = STATUS_CONFIG[m.status]
                  const StatusIcon = statusCfg.icon
                  const isEditing = editingId === m.id

                  if (isEditing) {
                    return (
                      <div key={m.id} className="px-3 py-2 space-y-2" style={{ background: 'var(--sf-1)' }}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            value={editDraft.name ?? ''}
                            onChange={e => setEditDraft(p => ({ ...p, name: e.target.value }))}
                            className="col-span-2 px-2 py-1 rounded text-xs border bg-[var(--sf-1)] border-[var(--ln-1)] text-slate-100 focus:outline-none focus:border-blue-500/50"
                          />
                          <select
                            value={editDraft.phase ?? 'planning'}
                            onChange={e => setEditDraft(p => ({ ...p, phase: e.target.value as AuditPhase }))}
                            className="px-2 py-1 rounded text-xs border bg-[var(--sf-1)] border-[var(--ln-1)] text-slate-100 focus:outline-none focus:border-blue-500/50"
                          >
                            {PHASES_ORDER.map(p => (
                              <option key={p} value={p}>{PHASE_CONFIG[p].label}</option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={editDraft.targetDate ?? ''}
                            onChange={e => setEditDraft(p => ({ ...p, targetDate: e.target.value }))}
                            className="px-2 py-1 rounded text-xs border bg-[var(--sf-1)] border-[var(--ln-1)] text-slate-100 focus:outline-none focus:border-blue-500/50"
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <select
                            value={editDraft.status ?? 'pending'}
                            onChange={e => setEditDraft(p => ({ ...p, status: e.target.value as AuditMilestone['status'] }))}
                            className="px-2 py-1 rounded text-xs border bg-[var(--sf-1)] border-[var(--ln-1)] text-slate-100 focus:outline-none focus:border-blue-500/50"
                          >
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Observações"
                            value={editDraft.notes ?? ''}
                            onChange={e => setEditDraft(p => ({ ...p, notes: e.target.value }))}
                            className="col-span-2 sm:col-span-2 px-2 py-1 rounded text-xs border bg-[var(--sf-1)] border-[var(--ln-1)] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                          />
                          <div className="flex gap-1">
                            <button onClick={saveEdit} className="btn-primary text-xs px-2 py-1 flex items-center gap-1 flex-1">
                              <Save size={10} /> Salvar
                            </button>
                            <button onClick={() => setEditingId(null)} className="btn-ghost text-xs px-2 py-1">
                              <X size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={m.id}
                      className="px-3 py-2 flex items-center gap-3 hover:bg-white/[0.02] transition-colors group/row"
                    >
                      <StatusIcon
                        size={14}
                        className={cn(
                          statusCfg.color,
                          m.status === 'in_progress' && 'animate-pulse'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-200 truncate">{m.name}</div>
                        {m.notes && (
                          <div className="text-[10px] text-slate-500 truncate">{m.notes}</div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(m.targetDate).toLocaleDateString('pt-BR')}
                      </div>
                      {m.completedDate && (
                        <div className="text-[10px] text-emerald-400 whitespace-nowrap flex items-center gap-0.5">
                          <CheckCircle size={9} />
                          {new Date(m.completedDate).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                      <div className="hidden group-hover/row:flex items-center gap-1">
                        {m.status !== 'completed' && (
                          <button
                            onClick={() => markComplete(m)}
                            className="btn-ghost p-1 text-emerald-400 hover:text-emerald-300"
                            title="Marcar como concluído"
                          >
                            <CheckCircle size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(m)}
                          className="btn-ghost p-1 text-slate-400 hover:text-slate-200"
                          title="Editar"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => deleteMilestone(auditId, m.id)}
                          className="btn-ghost p-1 text-red-400 hover:text-red-300"
                          title="Excluir"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          )
        })}
        {milestones.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500">
            Nenhum marco definido. Os marcos padrão serão gerados automaticamente.
          </div>
        )}
      </div>
    </div>
  )
}
