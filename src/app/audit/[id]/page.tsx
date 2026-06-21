'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuditStore, type ActiveTab } from '@/lib/store'
import { RATING_CONFIG, PHASE_CONFIG, SEVERITY_CONFIG } from '@/lib/audit-framework'
import { calculateAuditStats, cn, formatDate } from '@/lib/utils'
import { Rating, AuditPhase } from '@/lib/types'
import PillarSidebar from '@/components/PillarSidebar'
import ChatPanel from '@/components/ChatPanel'
import EvidencePanel from '@/components/EvidencePanel'
import FindingsPanel from '@/components/FindingsPanel'
import ProceduresPanel from '@/components/ProceduresPanel'
import SamplesPanel from '@/components/SamplesPanel'
import DataImport from '@/components/DataImport'
import PBCTracker from '@/components/PBCTracker'
import PlanningPanel from '@/components/PlanningPanel'
import RiskMatrixPanel from '@/components/RiskMatrixPanel'
import AuditTimeline from '@/components/AuditTimeline'
import RegulatoryMatrix from '@/components/RegulatoryMatrix'
import InterviewsPanel from '@/components/InterviewsPanel'
import WorkpaperIndex from '@/components/WorkpaperIndex'
import PillarMemoPanel from '@/components/PillarMemoPanel'
import ExportPanel from '@/components/ExportPanel'
import { AuditCharts } from '@/components/AuditCharts'
import { ExportButton } from '@/components/ReportExport'
import GlobalSearch from '@/components/GlobalSearch'
import Toast from '@/components/Toast'
import { useTheme } from '@/components/ThemeProvider'
import {
  Eye, ChevronLeft, MessageSquare, FileText, AlertTriangle,
  Target, ClipboardList, Settings, TrendingUp, Shield,
  Activity, Sparkles, BookOpen, Printer, BarChart3, Search, Database,
  PanelLeftClose, PanelLeftOpen, Moon, Sun, Map, Calendar, Users, Download, Mic,
} from '@/components/Icons'

export default function AuditWorkspace() {
  const params = useParams()
  const router = useRouter()
  const auditId = params.id as string
  const [showOverview, setShowOverview] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportContent, setReportContent] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const {
    audits,
    setCurrentAudit,
    activePillarId,
    setActivePillar,
    activeTab,
    setActiveTab,
    updateAuditPhase,
    updatePillarRating,
    saveReportContent,
  } = useAuditStore()

  const audit = audits.find(a => a.id === auditId)

  useEffect(() => {
    if (auditId) {
      setCurrentAudit(auditId)
      if (!activePillarId && audit?.pillars.length) {
        setActivePillar(audit.pillars[0].id)
      }
      if (audit?.reportContent && !reportContent) {
        setReportContent(audit.reportContent)
      }
    }
  }, [auditId, setCurrentAudit, activePillarId, setActivePillar, audit?.pillars, audit?.reportContent, reportContent])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!audit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Auditoria não encontrada.</p>
      </div>
    )
  }

  const activePillar = audit.pillars.find(p => p.id === activePillarId)
  const stats = calculateAuditStats(audit)
  const phaseConf = PHASE_CONFIG[audit.phase]

  const generateReport = async () => {
    setReportLoading(true)
    try {
      const { buildReportPrompt } = await import('@/lib/prompts')
      const prompt = buildReportPrompt(audit)
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await response.json()
      const content = data.content || data.error
      setReportContent(content)
      setShowReport(true)
      if (data.content) {
        saveReportContent(auditId, content)
      }
    } catch {
      setReportContent('Erro ao gerar relatório. Verifique se a API key está configurada.')
    } finally {
      setReportLoading(false)
    }
  }

  const pillarTabs: { id: ActiveTab; label: string; icon: typeof MessageSquare; color: string }[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare, color: 'text-blue-400' },
    { id: 'procedures', label: 'Testes', icon: ClipboardList, color: 'text-purple-400' },
    { id: 'evidence', label: 'Evidências', icon: FileText, color: 'text-yellow-400' },
    { id: 'findings', label: 'Achados', icon: AlertTriangle, color: 'text-red-400' },
    { id: 'samples', label: 'Amostras', icon: Target, color: 'text-green-400' },
    { id: 'data', label: 'Analytics', icon: Database, color: 'text-cyan-400' },
    { id: 'interviews', label: 'Entrevistas', icon: Mic, color: 'text-teal-400' },
    { id: 'memo', label: 'Memo', icon: BookOpen, color: 'text-amber-400' },
  ]

  const globalTabs: { id: ActiveTab; label: string; icon: typeof MessageSquare; color: string }[] = [
    { id: 'pbc', label: 'PBC', icon: ClipboardList, color: 'text-orange-400' },
    { id: 'planning', label: 'Planej.', icon: Settings, color: 'text-indigo-400' },
    { id: 'risk_matrix', label: 'Risco', icon: Map, color: 'text-rose-400' },
    { id: 'timeline', label: 'Timeline', icon: Calendar, color: 'text-sky-400' },
    { id: 'regulatory', label: 'Regulat.', icon: Shield, color: 'text-violet-400' },
    { id: 'workpapers', label: 'WP Index', icon: FileText, color: 'text-lime-400' },
  ]

  const tabs = [...pillarTabs, ...globalTabs.map(t => ({ ...t, global: true as const }))]

  const findingsBySeverity = {
    critical: audit.findings.filter(f => f.severity === 'critical').length,
    high: audit.findings.filter(f => f.severity === 'high').length,
    medium: audit.findings.filter(f => f.severity === 'medium').length,
    low: audit.findings.filter(f => f.severity === 'low').length,
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-[52px] border-b border-[var(--ln-1)] bg-[var(--header-bg)] backdrop-blur-xl flex items-center px-3 gap-2 flex-shrink-0 z-30">
        <button onClick={() => router.push('/')} className="btn-ghost flex items-center gap-1.5 text-xs flex-shrink-0">
          <ChevronLeft size={14} />
          <Eye size={16} className="text-blue-400" />
          <span className="font-bold hidden lg:inline">ARGUS</span>
        </button>

        <div className="h-6 w-px bg-[var(--ln-1)] flex-shrink-0" />

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="btn-ghost text-xs flex-shrink-0 p-1.5"
          title={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[13px] font-semibold text-slate-100 truncate max-w-[45vw]" title={audit.name}>{audit.name}</h1>
            <span className={cn('severity-badge text-[10px] flex-shrink-0', `rating-${audit.overallRating}`)}>
              {RATING_CONFIG[audit.overallRating].label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-slate-400">{audit.institution.name} • {phaseConf.label}</p>
            <div className="w-20 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sf-h)' }}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${stats.overallProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-blue-400 font-medium">{stats.overallProgress}%</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2 mr-1">
            {Object.entries(findingsBySeverity).map(([sev, count]) => count > 0 && (
              <div key={sev} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_CONFIG[sev as keyof typeof SEVERITY_CONFIG].color }} />
                <span className="text-[11px] text-slate-400">{count}</span>
              </div>
            ))}
          </div>

          <select
            value={audit.phase}
            onChange={e => updateAuditPhase(auditId, e.target.value as AuditPhase)}
            className="select-field text-[11px] w-auto py-1 px-2"
          >
            <option value="planning">Planejamento</option>
            <option value="fieldwork">Trabalho de Campo</option>
            <option value="testing">Testes</option>
            <option value="reporting">Relatório</option>
            <option value="completed">Concluído</option>
          </select>

          <button onClick={toggleTheme} className="btn-ghost text-xs p-1.5" title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <button onClick={() => setShowSearch(true)} className="btn-ghost text-xs flex items-center gap-1.5" title="Buscar (⌘K)">
            <Search size={14} />
            <kbd className="text-[10px] text-slate-500 bg-slate-800 px-1 py-0.5 rounded border border-slate-700 hidden xl:inline">⌘K</kbd>
          </button>

          <button onClick={() => setShowOverview(!showOverview)} className={cn('btn-ghost text-xs', showOverview && 'bg-[var(--sf-h)]')}>
            <BarChart3 size={14} />
          </button>

          <button onClick={() => setShowExport(!showExport)} className={cn('btn-ghost text-xs', showExport && 'bg-[var(--sf-h)]')}>
            <Download size={14} />
          </button>

          <button onClick={generateReport} disabled={reportLoading} className="btn-primary text-xs py-1.5 flex items-center gap-1.5">
            {reportLoading ? <Activity size={12} className="animate-spin" /> : <Printer size={12} />}
            {reportLoading ? 'Gerando...' : 'Relatório'}
          </button>
        </div>
      </header>

      {/* Overview Panel */}
      {showOverview && (
        <div className="border-b border-[var(--ln-1)] bg-[var(--sf-2)] p-4 flex-shrink-0 animate-fade-in max-h-[70vh] overflow-y-auto scroll-thin">
          <div className="max-w-full">
            <div className="grid grid-cols-6 gap-3 mb-4">
              {[
                { label: 'Progresso', value: `${stats.overallProgress}%`, color: 'text-white' },
                { label: 'Pilares', value: `${stats.assessedPillars}/${stats.totalPillars}`, color: 'text-white' },
                { label: 'Evidências', value: `${stats.receivedEvidence}/${stats.totalEvidence}`, color: 'text-white' },
                { label: 'Achados', value: `${stats.totalFindings}`, color: 'text-white' },
                { label: 'Críticos', value: `${stats.criticalFindings}`, color: 'text-red-400' },
                { label: 'Amostras', value: `${stats.testedSamples}/${stats.totalSamples}`, color: 'text-white' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">{s.label}</p>
                  <p className={cn('text-xl font-bold mt-0.5', s.color)}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap mb-4">
              {audit.pillars.map(p => {
                const rConf = RATING_CONFIG[p.overallRating]
                return (
                  <button
                    key={p.id}
                    onClick={() => { setActivePillar(p.id); setShowOverview(false) }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all',
                      activePillarId === p.id ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'border-[var(--ln-1)] text-slate-400 hover:border-slate-600'
                    )}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: rConf.color }} />
                    <span className="font-mono text-[11px] text-slate-400">{p.code}</span>
                    <span>{p.completionPercent}%</span>
                    <select
                      value={p.overallRating}
                      onChange={e => { e.stopPropagation(); updatePillarRating(auditId, p.id, e.target.value as Rating) }}
                      onClick={e => e.stopPropagation()}
                      className="bg-transparent text-[11px] text-slate-400 border-none focus:outline-none cursor-pointer"
                    >
                      <option value="not_assessed">N/A</option>
                      <option value="effective">Efetivo</option>
                      <option value="largely_effective">Ampl. Efetivo</option>
                      <option value="partially_effective">Parc. Efetivo</option>
                      <option value="ineffective">Inefetivo</option>
                    </select>
                  </button>
                )
              })}
            </div>

            <AuditCharts audit={audit} />
          </div>
        </div>
      )}

      {/* Export Panel */}
      {showExport && (
        <div className="border-b border-[var(--ln-1)] bg-[var(--sf-2)] flex-shrink-0 animate-fade-in max-h-[60vh] overflow-y-auto scroll-thin">
          <ExportPanel auditId={auditId} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Pillar Sidebar */}
        <PillarSidebar
          pillars={audit.pillars}
          activePillarId={activePillarId}
          onSelect={setActivePillar}
          collapsed={sidebarCollapsed}
        />

        {/* Work Area */}
        <div className="flex-1 flex flex-col overflow-hidden border-l border-[var(--ln-1)]">
          {activePillar ? (
            <>
              {/* Pillar header + Tabs */}
              <div className="flex-shrink-0 border-b border-[var(--ln-1)] bg-[var(--sf-2)]">
                <div className="px-4 pt-3 pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-400">{activePillar.number}</span>
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-slate-100 truncate">{activePillar.code} — {activePillar.name}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn('severity-badge text-[10px]', `rating-${activePillar.overallRating}`)}>
                            {RATING_CONFIG[activePillar.overallRating].label}
                          </span>
                          <span className="text-[11px] text-slate-400">Peso: {activePillar.weight}%</span>
                          <span className="text-[11px] text-slate-500">•</span>
                          <span className="text-[11px] text-slate-400">{activePillar.completionPercent}% concluído</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs: pillar-specific + global */}
                  <div className="flex overflow-x-auto scroll-thin">
                    {tabs.map((tab, idx) => {
                      const Icon = tab.icon
                      const isActive = activeTab === tab.id
                      const isFirstGlobal = idx === pillarTabs.length
                      let count = 0
                      if (tab.id === 'evidence') count = audit.evidence.filter(e => e.pillarId === activePillarId).length
                      if (tab.id === 'findings') count = audit.findings.filter(f => f.pillarId === activePillarId).length
                      if (tab.id === 'samples') count = audit.samples.filter(s => s.pillarId === activePillarId).length
                      if (tab.id === 'chat') count = audit.conversations.find(c => c.pillarId === activePillarId)?.messages.length || 0
                      if (tab.id === 'data') count = audit.datasets.filter(d => d.pillarId === activePillarId).length
                      if (tab.id === 'interviews') count = (audit.interviews || []).filter(i => i.pillarId === activePillarId).length
                      if (tab.id === 'memo') count = (audit.pillarMemos || []).filter(m => m.pillarId === activePillarId).length
                      if (tab.id === 'pbc') count = audit.evidence.filter(e => e.status === 'requested').length
                      if (tab.id === 'planning') count = audit.planning?.priorFindings?.length || 0
                      if (tab.id === 'risk_matrix') count = (audit.riskMatrixItems || []).length
                      if (tab.id === 'timeline') count = (audit.milestones || []).length

                      return (
                        <div key={tab.id} className="flex items-center">
                          {isFirstGlobal && <div className="w-px h-4 bg-[var(--ln-1)] mx-1 flex-shrink-0" />}
                          <button
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                              'flex items-center gap-1 px-2 py-2 text-[11px] font-medium border-b-2 -mb-px whitespace-nowrap transition-all',
                              isActive ? 'text-blue-400 border-blue-400' : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600'
                            )}
                          >
                            <Icon size={12} className={isActive ? tab.color : ''} />
                            <span className="hidden sm:inline">{tab.label}</span>
                            {count > 0 && (
                              <span className={cn(
                                'text-[9px] px-1 py-0 rounded-full min-w-[14px] text-center',
                                isActive ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500'
                              )} style={{ backgroundColor: isActive ? undefined : 'var(--sf-h)' }}>
                                {count}
                              </span>
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'chat' && <ChatPanel auditId={auditId} pillar={activePillar} />}
                {activeTab === 'procedures' && <ProceduresPanel auditId={auditId} pillar={activePillar} />}
                {activeTab === 'evidence' && <EvidencePanel auditId={auditId} pillarId={activePillar.id} />}
                {activeTab === 'findings' && <FindingsPanel auditId={auditId} pillarId={activePillar.id} />}
                {activeTab === 'samples' && <SamplesPanel auditId={auditId} pillarId={activePillar.id} />}
                {activeTab === 'data' && <DataImport auditId={auditId} pillarId={activePillar.id} />}
                {activeTab === 'interviews' && <InterviewsPanel auditId={auditId} pillarId={activePillar.id} />}
                {activeTab === 'memo' && <PillarMemoPanel auditId={auditId} pillarId={activePillar.id} />}
                {activeTab === 'pbc' && <PBCTracker auditId={auditId} />}
                {activeTab === 'planning' && <PlanningPanel auditId={auditId} />}
                {activeTab === 'risk_matrix' && <RiskMatrixPanel auditId={auditId} />}
                {activeTab === 'timeline' && <AuditTimeline auditId={auditId} />}
                {activeTab === 'regulatory' && <RegulatoryMatrix auditId={auditId} />}
                {activeTab === 'workpapers' && <WorkpaperIndex auditId={auditId} />}
              </div>
            </>
          ) : globalTabs.some(g => g.id === activeTab) ? (
            <>
              <div className="flex-shrink-0 border-b border-[var(--ln-1)] bg-[var(--sf-2)] px-4 pt-3 pb-0">
                <div className="flex">
                  {globalTabs.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-2 text-[12px] font-medium border-b-2 -mb-px whitespace-nowrap transition-all',
                          isActive ? 'text-blue-400 border-blue-400' : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600'
                        )}
                      >
                        <Icon size={13} className={isActive ? tab.color : ''} />
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                {activeTab === 'pbc' && <PBCTracker auditId={auditId} />}
                {activeTab === 'planning' && <PlanningPanel auditId={auditId} />}
                {activeTab === 'risk_matrix' && <RiskMatrixPanel auditId={auditId} />}
                {activeTab === 'timeline' && <AuditTimeline auditId={auditId} />}
                {activeTab === 'regulatory' && <RegulatoryMatrix auditId={auditId} />}
                {activeTab === 'workpapers' && <WorkpaperIndex auditId={auditId} />}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-sm">
                <Shield size={36} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-300 text-sm font-medium mb-1">Selecione um pilar</p>
                <p className="text-slate-500 text-xs">Escolha um dos 16 pilares na barra lateral para iniciar a auditoria deste item.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <Toast />

      {/* Global Search */}
      <GlobalSearch
        audit={audit}
        onNavigate={(pillarId, tab) => {
          setActivePillar(pillarId)
          setActiveTab(tab)
          setShowOverview(false)
        }}
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
      />

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col glow-border">
            <div className="flex items-center justify-between p-4 border-b border-[var(--ln-1)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <BookOpen size={16} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">Relatório Final de Auditoria PLD-FT</h2>
                  <p className="text-[11px] text-slate-400">{audit.institution.name} • Gerado por ARGUS</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ExportButton audit={audit} reportContent={reportContent} />
                <button onClick={() => setShowReport(false)} className="btn-ghost">
                  <span className="text-xs">Fechar</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scroll-thin p-6">
              <div className="markdown-content prose prose-invert max-w-none">
                {reportContent ? (
                  (() => {
                    const ReactMarkdownDynamic = require('react-markdown').default
                    const remarkGfmDynamic = require('remark-gfm').default
                    return <ReactMarkdownDynamic remarkPlugins={[remarkGfmDynamic]}>{reportContent}</ReactMarkdownDynamic>
                  })()
                ) : (
                  <p className="text-slate-400">Gerando relatório...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
