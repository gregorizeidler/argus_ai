'use client'

import { useState, useMemo } from 'react'
import { useAuditStore } from '@/lib/store'
import { Evidence, EvidenceStatus } from '@/lib/types'
import {
  FileText, Clock, CheckCircle, AlertTriangle, Search, Filter,
  Upload, ChevronDown, ChevronRight, Target, Eye, X,
} from './Icons'
import { formatDate, cn } from '@/lib/utils'

interface Props {
  auditId: string
}

type StatusFilter = 'all' | 'requested' | 'received' | 'overdue'
type PriorityFilter = 'all' | 'high' | 'medium' | 'low'
type SortOption = 'dueDate' | 'age' | 'priority' | 'pillar'

const STATUS_CONFIG: Record<EvidenceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  requested: { label: 'Solicitada', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20', icon: <Clock size={12} /> },
  received: { label: 'Recebida', color: 'text-blue-400 bg-blue-400/10 border-blue-500/20', icon: <FileText size={12} /> },
  under_review: { label: 'Em Análise', color: 'text-purple-400 bg-purple-400/10 border-purple-500/20', icon: <Eye size={12} /> },
  accepted: { label: 'Aceita', color: 'text-green-400 bg-green-400/10 border-green-500/20', icon: <CheckCircle size={12} /> },
  rejected: { label: 'Rejeitada', color: 'text-red-400 bg-red-400/10 border-red-500/20', icon: <X size={12} /> },
  pending_clarification: { label: 'Pendente Esclarecimento', color: 'text-orange-400 bg-orange-400/10 border-orange-500/20', icon: <AlertTriangle size={12} /> },
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

function getDaysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function isOverdue(ev: Evidence): boolean {
  if (!ev.dueDate) return false
  if (['accepted', 'rejected'].includes(ev.status)) return false
  return new Date(ev.dueDate) < new Date()
}

export default function PBCTracker({ auditId }: Props) {
  const {
    getCurrentAudit,
    updateEvidenceStatus,
    updateEvidenceDueDate,
    updateEvidencePriority,
    updateEvidenceFile,
  } = useAuditStore()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('dueDate')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const audit = getCurrentAudit()
  const allEvidence = audit?.evidence || []
  const pillars = audit?.pillars || []

  const pillarMap = useMemo(() => {
    const map: Record<string, { code: string; name: string }> = {}
    for (const p of pillars) {
      map[p.id] = { code: p.code, name: p.name }
    }
    return map
  }, [pillars])

  const stats = useMemo(() => {
    const total = allEvidence.length
    const pending = allEvidence.filter(e => e.status === 'requested' || e.status === 'pending_clarification').length
    const overdue = allEvidence.filter(isOverdue).length
    const received = allEvidence.filter(e => e.status === 'received' || e.status === 'under_review').length
    const accepted = allEvidence.filter(e => e.status === 'accepted').length
    return { total, pending, overdue, received, accepted }
  }, [allEvidence])

  const filtered = useMemo(() => {
    let items = [...allEvidence]

    if (searchText) {
      const q = searchText.toLowerCase()
      items = items.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (pillarMap[e.pillarId]?.code.toLowerCase().includes(q))
      )
    }

    if (statusFilter === 'requested') {
      items = items.filter(e => e.status === 'requested')
    } else if (statusFilter === 'received') {
      items = items.filter(e => e.status === 'received' || e.status === 'under_review')
    } else if (statusFilter === 'overdue') {
      items = items.filter(isOverdue)
    }

    if (priorityFilter !== 'all') {
      items = items.filter(e => e.priority === priorityFilter)
    }

    items.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate': {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        }
        case 'age':
          return getDaysSince(b.requestedAt) - getDaysSince(a.requestedAt)
        case 'priority': {
          const pa = PRIORITY_ORDER[a.priority || 'low'] ?? 2
          const pb = PRIORITY_ORDER[b.priority || 'low'] ?? 2
          return pa - pb
        }
        case 'pillar':
          return (pillarMap[a.pillarId]?.code || '').localeCompare(pillarMap[b.pillarId]?.code || '')
        default:
          return 0
      }
    })

    return items
  }, [allEvidence, searchText, statusFilter, priorityFilter, sortBy, pillarMap])

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleUpload = (ev: Evidence) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (!res.ok) return

        const data = await res.json()
        updateEvidenceFile(auditId, ev.id, {
          fileName: data.fileName,
          fileSize: data.fileSize,
          uploadPath: data.uploadPath,
          textPreview: data.textContent?.slice(0, 500) || '',
        })
        updateEvidenceStatus(auditId, ev.id, 'received')
      } catch {
        // upload failed silently
      }
    }
    input.click()
  }

  const statCards = [
    { label: 'Total', value: stats.total, icon: <FileText size={16} />, color: 'text-slate-300' },
    { label: 'Pendentes', value: stats.pending, icon: <Clock size={16} />, color: 'text-yellow-400' },
    { label: 'Vencidas', value: stats.overdue, icon: <AlertTriangle size={16} />, color: 'text-red-400' },
    { label: 'Recebidas', value: stats.received, icon: <Eye size={16} />, color: 'text-blue-400' },
    { label: 'Aceitas', value: stats.accepted, icon: <CheckCircle size={16} />, color: 'text-green-400' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--ln-1)] space-y-4">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-blue-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-200">PBC Tracker</h3>
            <p className="text-[11px] text-slate-500">Controle consolidado de evidências solicitadas</p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {statCards.map(card => (
            <div key={card.label} className="stat-card p-2.5 text-center">
              <div className={cn('flex items-center justify-center mb-1', card.color)}>
                {card.icon}
              </div>
              <div className="text-lg font-bold text-slate-200">{card.value}</div>
              <div className="text-[10px] text-slate-500">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Buscar evidências..."
              className="input-field pl-9 text-xs w-full"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="select-field text-xs"
          >
            <option value="all">Todos Status</option>
            <option value="requested">Solicitadas</option>
            <option value="received">Recebidas</option>
            <option value="overdue">Vencidas</option>
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as PriorityFilter)}
            className="select-field text-xs"
          >
            <option value="all">Prioridade</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="select-field text-xs"
          >
            <option value="dueDate">Ordenar: Vencimento</option>
            <option value="age">Ordenar: Antiguidade</option>
            <option value="priority">Ordenar: Prioridade</option>
            <option value="pillar">Ordenar: Pilar</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-2">
        {filtered.map(ev => {
          const statusConf = STATUS_CONFIG[ev.status]
          const pillarInfo = pillarMap[ev.pillarId]
          const daysSinceRequested = getDaysSince(ev.requestedAt)
          const overdue = isOverdue(ev)
          const expanded = expandedItems.has(ev.id)

          return (
            <div
              key={ev.id}
              className={cn(
                'glass-panel-hover p-3 space-y-2 transition-all',
                overdue && 'border-l-2 border-l-red-500'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpanded(ev.id)}
                      className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                    >
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <FileText size={14} className="text-slate-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-200 truncate">{ev.name}</span>
                    {pillarInfo && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex-shrink-0">
                        {pillarInfo.code}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 ml-[52px] line-clamp-1">{ev.description}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {overdue && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-medium">
                      VENCIDA
                    </span>
                  )}
                  <div className={cn('severity-badge', statusConf.color)}>
                    {statusConf.icon}
                    <span>{statusConf.label}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-500 ml-[52px] flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {daysSinceRequested}d atrás
                </span>

                {ev.dueDate && (
                  <span className={cn('flex items-center gap-1', overdue && 'text-red-400')}>
                    <AlertTriangle size={10} />
                    Vence: {new Date(ev.dueDate).toLocaleDateString('pt-BR')}
                  </span>
                )}

                {ev.priority && (
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full border',
                    ev.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    ev.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  )}>
                    {ev.priority === 'high' ? 'Alta' : ev.priority === 'medium' ? 'Média' : 'Baixa'}
                  </span>
                )}
              </div>

              {expanded && (
                <div className="ml-[52px] space-y-3 pt-2 border-t border-[var(--ln-1)]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Data Limite</label>
                      <input
                        type="date"
                        value={ev.dueDate?.split('T')[0] || ''}
                        onChange={e => updateEvidenceDueDate(auditId, ev.id, e.target.value)}
                        className="input-field text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Prioridade</label>
                      <select
                        value={ev.priority || 'medium'}
                        onChange={e => updateEvidencePriority(auditId, ev.id, e.target.value as 'high' | 'medium' | 'low')}
                        className="select-field text-xs w-full"
                      >
                        <option value="high">Alta</option>
                        <option value="medium">Média</option>
                        <option value="low">Baixa</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    {ev.status === 'requested' && (
                      <>
                        <button
                          onClick={() => handleUpload(ev)}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                        >
                          <Upload size={11} />
                          Enviar Arquivo
                        </button>
                        <button
                          onClick={() => updateEvidenceStatus(auditId, ev.id, 'received')}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all"
                        >
                          <CheckCircle size={11} />
                          Marcar Recebida
                        </button>
                      </>
                    )}
                    {ev.status === 'received' && (
                      <>
                        <button
                          onClick={() => updateEvidenceStatus(auditId, ev.id, 'under_review')}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all"
                        >
                          <Eye size={11} />
                          Iniciar Revisão
                        </button>
                        <button
                          onClick={() => updateEvidenceStatus(auditId, ev.id, 'accepted')}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all"
                        >
                          Aceitar
                        </button>
                        <button
                          onClick={() => updateEvidenceStatus(auditId, ev.id, 'rejected')}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                        >
                          Rejeitar
                        </button>
                      </>
                    )}
                    {ev.status === 'under_review' && (
                      <>
                        <button
                          onClick={() => updateEvidenceStatus(auditId, ev.id, 'accepted')}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all"
                        >
                          <CheckCircle size={11} />
                          Aceitar
                        </button>
                        <button
                          onClick={() => updateEvidenceStatus(auditId, ev.id, 'rejected')}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                        >
                          <X size={11} />
                          Rejeitar
                        </button>
                        <button
                          onClick={() => updateEvidenceStatus(auditId, ev.id, 'pending_clarification')}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-all"
                        >
                          <AlertTriangle size={11} />
                          Pedir Esclarecimento
                        </button>
                      </>
                    )}
                    {ev.status === 'pending_clarification' && (
                      <button
                        onClick={() => updateEvidenceStatus(auditId, ev.id, 'received')}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                      >
                        <CheckCircle size={11} />
                        Esclarecimento Recebido
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && allEvidence.length > 0 && (
          <div className="text-center py-8">
            <Filter size={20} className="mx-auto text-slate-600 mb-2" />
            <p className="text-xs text-slate-500">Nenhuma evidência corresponde aos filtros</p>
          </div>
        )}

        {allEvidence.length === 0 && (
          <div className="text-center py-12 max-w-xs mx-auto">
            <Target size={32} className="mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-300 font-medium mb-1">Nenhuma solicitação registrada</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Use o chat com o ARGUS ou o painel de evidências para criar solicitações PBC.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
