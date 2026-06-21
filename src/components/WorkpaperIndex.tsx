'use client'

import { useMemo, useState, useCallback } from 'react'
import { useAuditStore } from '@/lib/store'
import { WorkpaperRef, Pillar } from '@/lib/types'
import { FileText, Search, Filter, CheckCircle, Edit3, Save, ChevronDown, Target, AlertTriangle, BookOpen, Hash, Users, X, Loader2, ClipboardList } from '@/components/Icons'
import { cn, generateId } from '@/lib/utils'

type WpStatus = WorkpaperRef['status']
type WpType = WorkpaperRef['type']

interface WpOverride {
  status?: WpStatus
  preparedBy?: string
  reviewedBy?: string
}

const STATUS_COLORS: Record<WpStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  prepared: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  reviewed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  signed_off: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

const STATUS_LABELS: Record<WpStatus, string> = {
  draft: 'Draft',
  prepared: 'Prepared',
  reviewed: 'Reviewed',
  signed_off: 'Signed Off',
}

const TYPE_ICONS: Record<WpType, typeof FileText> = {
  test: Target,
  finding: AlertTriangle,
  memo: BookOpen,
  interview: Users,
  sample: Hash,
  analytics: ClipboardList,
}

export default function WorkpaperIndex({ auditId }: { auditId: string }) {
  const audit = useAuditStore(s => s.audits.find(a => a.id === auditId))

  const [overrides, setOverrides] = useState<Record<string, WpOverride>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPillar, setFilterPillar] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<WpOverride>({})
  const [selectedCrossRef, setSelectedCrossRef] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const workpapers = useMemo<WorkpaperRef[]>(() => {
    if (!audit) return []
    const wps: WorkpaperRef[] = []

    audit.pillars.forEach(pillar => {
      pillar.subAreas.forEach(subArea => {
        subArea.testProcedures.forEach((tp, idx) => {
          wps.push({
            id: tp.id,
            code: `WP-${pillar.code}-${subArea.code}-T${idx + 1}`,
            pillarId: pillar.id,
            subAreaId: subArea.id,
            testProcedureId: tp.id,
            title: tp.description,
            type: 'test',
            status: 'draft',
          })
        })
      })
    })

    audit.findings.forEach((finding, idx) => {
      const pillar = audit.pillars.find(p => p.id === finding.pillarId)
      wps.push({
        id: finding.id,
        code: `WP-${pillar?.code || 'UNK'}-F${idx + 1}`,
        pillarId: finding.pillarId,
        subAreaId: finding.subAreaId,
        findingId: finding.id,
        title: finding.title,
        type: 'finding',
        status: 'draft',
      })
    })

    ;(audit.pillarMemos || []).forEach(memo => {
      const pillar = audit.pillars.find(p => p.id === memo.pillarId)
      wps.push({
        id: `memo-${memo.pillarId}`,
        code: `WP-${pillar?.code || 'UNK'}-MEMO`,
        pillarId: memo.pillarId,
        title: `Pillar Memo - ${pillar?.name || 'Unknown'}`,
        type: 'memo',
        status: 'draft',
      })
    })

    ;(audit.interviews || []).forEach((interview, idx) => {
      const pillar = audit.pillars.find(p => p.id === interview.pillarId)
      wps.push({
        id: interview.id,
        code: `WP-${pillar?.code || 'UNK'}-INT${idx + 1}`,
        pillarId: interview.pillarId,
        subAreaId: interview.subAreaId,
        title: `Interview - ${interview.interviewee} (${interview.role})`,
        type: 'interview',
        status: 'draft',
      })
    })

    audit.samples.forEach((sample, idx) => {
      const pillar = audit.pillars.find(p => p.id === sample.pillarId)
      wps.push({
        id: sample.id,
        code: `WP-${pillar?.code || 'UNK'}-S${idx + 1}`,
        pillarId: sample.pillarId,
        subAreaId: sample.subAreaId,
        testProcedureId: sample.testProcedureId,
        title: sample.description,
        type: 'sample',
        status: 'draft',
      })
    })

    return wps
  }, [audit])

  const filteredWorkpapers = useMemo(() => {
    return workpapers.filter(wp => {
      const override = overrides[wp.code]
      const status = override?.status || wp.status

      if (filterPillar !== 'all' && wp.pillarId !== filterPillar) return false
      if (filterType !== 'all' && wp.type !== filterType) return false
      if (filterStatus !== 'all' && status !== filterStatus) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!wp.code.toLowerCase().includes(q) && !wp.title.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [workpapers, overrides, filterPillar, filterType, filterStatus, searchQuery])

  const stats = useMemo(() => {
    const total = workpapers.length
    const byStatus = { draft: 0, prepared: 0, reviewed: 0, signed_off: 0 }
    workpapers.forEach(wp => {
      const s = overrides[wp.code]?.status || wp.status
      byStatus[s]++
    })
    const completed = byStatus.reviewed + byStatus.signed_off
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, byStatus, completionPct }
  }, [workpapers, overrides])

  const crossReferences = useMemo(() => {
    if (!selectedCrossRef || !audit) return []
    const wp = workpapers.find(w => w.code === selectedCrossRef)
    if (!wp) return []

    return workpapers.filter(other => {
      if (other.code === wp.code) return false
      if (other.pillarId === wp.pillarId && other.subAreaId && other.subAreaId === wp.subAreaId) return true
      if (wp.type === 'finding' && other.type === 'test' && other.pillarId === wp.pillarId) return true
      if (wp.type === 'test' && other.type === 'sample' && other.testProcedureId === wp.testProcedureId) return true
      if (wp.type === 'sample' && other.type === 'test' && other.testProcedureId === wp.testProcedureId) return true
      return false
    })
  }, [selectedCrossRef, workpapers, audit])

  const startEdit = useCallback((wp: WorkpaperRef) => {
    const override = overrides[wp.code]
    setEditingRow(wp.code)
    setEditValues({
      status: override?.status || wp.status,
      preparedBy: override?.preparedBy || wp.preparedBy || '',
      reviewedBy: override?.reviewedBy || wp.reviewedBy || '',
    })
  }, [overrides])

  const saveEdit = useCallback((code: string) => {
    setOverrides(prev => ({ ...prev, [code]: { ...prev[code], ...editValues } }))
    setEditingRow(null)
    setEditValues({})
  }, [editValues])

  const getPillarName = useCallback((pillarId: string) => {
    return audit?.pillars.find(p => p.id === pillarId)?.name || 'Unknown'
  }, [audit])

  if (!audit) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-secondary)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Summary Bar */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
              Workpaper Index
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Total: <span className="font-bold">{stats.total}</span>
            </span>
            <span className={cn('px-2 py-0.5 rounded-full', STATUS_COLORS.draft)}>
              Draft: {stats.byStatus.draft}
            </span>
            <span className={cn('px-2 py-0.5 rounded-full', STATUS_COLORS.prepared)}>
              Prepared: {stats.byStatus.prepared}
            </span>
            <span className={cn('px-2 py-0.5 rounded-full', STATUS_COLORS.reviewed)}>
              Reviewed: {stats.byStatus.reviewed}
            </span>
            <span className={cn('px-2 py-0.5 rounded-full', STATUS_COLORS.signed_off)}>
              Signed Off: {stats.byStatus.signed_off}
            </span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Completion: <span className="font-bold">{stats.completionPct}%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-panel p-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50" />
            <input
              type="text"
              placeholder="Search by WP ref or title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border bg-transparent focus:outline-none focus:ring-1"
              style={{ borderColor: 'var(--ln-1)', color: 'var(--text-primary)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('btn-ghost flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md', showFilters && 'ring-1')}
            style={{ color: 'var(--text-secondary)' }}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            <ChevronDown className={cn('w-3 h-3 transition-transform', showFilters && 'rotate-180')} />
          </button>
        </div>

        {showFilters && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t" style={{ borderColor: 'var(--ln-1)' }}>
            <div className="flex items-center gap-1.5">
              <label className="text-xs opacity-60">Pillar:</label>
              <select
                value={filterPillar}
                onChange={e => setFilterPillar(e.target.value)}
                className="text-xs rounded px-2 py-1 border bg-transparent"
                style={{ borderColor: 'var(--ln-1)', color: 'var(--text-primary)' }}
              >
                <option value="all">All</option>
                {audit.pillars.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs opacity-60">Type:</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="text-xs rounded px-2 py-1 border bg-transparent"
                style={{ borderColor: 'var(--ln-1)', color: 'var(--text-primary)' }}
              >
                <option value="all">All</option>
                <option value="test">Test</option>
                <option value="finding">Finding</option>
                <option value="memo">Memo</option>
                <option value="interview">Interview</option>
                <option value="sample">Sample</option>
                <option value="analytics">Analytics</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs opacity-60">Status:</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-xs rounded px-2 py-1 border bg-transparent"
                style={{ borderColor: 'var(--ln-1)', color: 'var(--text-primary)' }}
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="prepared">Prepared</option>
                <option value="reviewed">Reviewed</option>
                <option value="signed_off">Signed Off</option>
              </select>
            </div>
            {(filterPillar !== 'all' || filterType !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => { setFilterPillar('all'); setFilterType('all'); setFilterStatus('all') }}
                className="btn-ghost text-xs px-2 py-1 rounded flex items-center gap-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cross-Reference Panel */}
      {selectedCrossRef && (
        <div className="glass-panel p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>
                Cross-References for <span className="font-mono">{selectedCrossRef}</span>
              </span>
            </div>
            <button onClick={() => setSelectedCrossRef(null)} className="btn-ghost p-1 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {crossReferences.length === 0 ? (
            <p className="text-xs opacity-60">No cross-references found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {crossReferences.map(ref => {
                const Icon = TYPE_ICONS[ref.type]
                return (
                  <button
                    key={ref.code}
                    onClick={() => setSelectedCrossRef(ref.code)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-xs border hover:opacity-80 transition-opacity"
                    style={{ borderColor: 'var(--ln-1)', color: 'var(--text-secondary)' }}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="font-mono">{ref.code}</span>
                    <span className="opacity-60 truncate max-w-[150px]">{ref.title}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="glass-panel flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--sf-1)' }}>
              <tr className="border-b" style={{ borderColor: 'var(--ln-1)' }}>
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>WP Ref</th>
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>Pillar</th>
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>Type</th>
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>Title / Description</th>
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>Prepared By</th>
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>Reviewed By</th>
                <th className="text-center px-3 py-2 font-semibold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>X-Ref</th>
                <th className="text-center px-3 py-2 font-semibold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkpapers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 opacity-50">
                    No workpapers match the current filters.
                  </td>
                </tr>
              ) : (
                filteredWorkpapers.map(wp => {
                  const override = overrides[wp.code]
                  const status = override?.status || wp.status
                  const preparedBy = override?.preparedBy || wp.preparedBy || ''
                  const reviewedBy = override?.reviewedBy || wp.reviewedBy || ''
                  const isEditing = editingRow === wp.code
                  const Icon = TYPE_ICONS[wp.type]

                  return (
                    <tr
                      key={wp.code}
                      className="border-b hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                      style={{ borderColor: 'var(--ln-1)' }}
                    >
                      <td className="px-3 py-2">
                        <span className="font-mono font-medium" style={{ color: 'var(--text-heading)' }}>
                          {wp.code}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                        {getPillarName(wp.pillarId)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1 capitalize" style={{ color: 'var(--text-secondary)' }}>
                          <Icon className="w-3 h-3" />
                          {wp.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[300px] truncate" style={{ color: 'var(--text-primary)' }}>
                        {wp.title}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <select
                            value={editValues.status || status}
                            onChange={e => setEditValues(v => ({ ...v, status: e.target.value as WpStatus }))}
                            className="text-xs rounded px-1.5 py-0.5 border bg-transparent"
                            style={{ borderColor: 'var(--ln-1)' }}
                          >
                            <option value="draft">Draft</option>
                            <option value="prepared">Prepared</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="signed_off">Signed Off</option>
                          </select>
                        ) : (
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', STATUS_COLORS[status])}>
                            {STATUS_LABELS[status]}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.preparedBy || ''}
                            onChange={e => setEditValues(v => ({ ...v, preparedBy: e.target.value }))}
                            placeholder="Name..."
                            className="text-xs rounded px-1.5 py-0.5 border bg-transparent w-24"
                            style={{ borderColor: 'var(--ln-1)' }}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>{preparedBy || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.reviewedBy || ''}
                            onChange={e => setEditValues(v => ({ ...v, reviewedBy: e.target.value }))}
                            placeholder="Name..."
                            className="text-xs rounded px-1.5 py-0.5 border bg-transparent w-24"
                            style={{ borderColor: 'var(--ln-1)', color: 'var(--text-primary)' }}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>{reviewedBy || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => setSelectedCrossRef(wp.code === selectedCrossRef ? null : wp.code)}
                          className={cn(
                            'btn-ghost p-1 rounded transition-colors',
                            selectedCrossRef === wp.code && 'ring-1'
                          )}
                          style={{ color: 'var(--text-secondary)' }}
                          title="Show cross-references"
                        >
                          <Target className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {isEditing ? (
                          <button
                            onClick={() => saveEdit(wp.code)}
                            className="btn-ghost p-1 rounded text-green-600 hover:text-green-700"
                            title="Save"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => startEdit(wp)}
                            className="btn-ghost p-1 rounded"
                            style={{ color: 'var(--text-secondary)' }}
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="border-t px-3 py-2 flex items-center justify-between" style={{ borderColor: 'var(--ln-1)' }}>
          <span className="text-xs opacity-60">
            Showing {filteredWorkpapers.length} of {workpapers.length} workpapers
          </span>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {stats.completionPct}% complete
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
