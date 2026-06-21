'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuditStore } from '@/lib/store'
import { RATING_CONFIG, PHASE_CONFIG } from '@/lib/audit-framework'
import { calculateAuditStats, cn, formatDate } from '@/lib/utils'
import NewAuditModal from '@/components/NewAuditModal'
import { useTheme } from '@/components/ThemeProvider'
import {
  Eye, Plus, Shield, BarChart3, AlertTriangle, FileText,
  Target, Clock, ArrowRight, TrendingUp, Sparkles, Activity,
  Moon, Sun,
} from '@/components/Icons'

export default function Dashboard() {
  const router = useRouter()
  const { audits } = useAuditStore()
  const { theme, toggleTheme } = useTheme()
  const [showNewAudit, setShowNewAudit] = useState(false)

  const handleCreated = (id: string) => {
    router.push(`/audit/${id}`)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--ln-1)] bg-[var(--header-bg-home)] backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                <Eye size={22} className="text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--sf-0)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">ARGUS</h1>
              <p className="text-[11px] text-slate-500 uppercase tracking-[0.2em]">Advanced Risk Governance & Unified Surveillance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="btn-ghost text-xs p-1.5" title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={() => setShowNewAudit(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Nova Auditoria
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero section when no audits */}
        {audits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-700/20 border border-blue-500/20 flex items-center justify-center animate-pulse-glow">
                <Eye size={44} className="text-blue-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/20 flex items-center justify-center">
                <Sparkles size={18} className="text-amber-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">ARGUS — Sistema de Auditoria PLD-FT</h2>
            <p className="text-slate-400 text-sm mb-1 max-w-lg text-center">
              Plataforma avançada de auditoria de programas de Prevenção à Lavagem de Dinheiro
              e Financiamento ao Terrorismo com inteligência artificial.
            </p>
            <p className="text-slate-500 text-xs mb-8 max-w-lg text-center">
              Metodologia baseada em Circular BACEN 3.978/2020, Lei 9.613/1998 e Recomendações GAFI/FATF.
              16 pilares de avaliação, 100+ procedimentos de teste, análise por IA com GPT-4o Vision.
            </p>

            <button onClick={() => setShowNewAudit(true)} className="btn-primary text-base px-8 py-3 flex items-center gap-3">
              <Sparkles size={18} />
              Iniciar Primeira Auditoria
            </button>

            <div className="grid grid-cols-4 gap-6 mt-16 max-w-3xl w-full">
              {[
                { icon: Shield, label: '16 Pilares', desc: 'Cobertura completa do programa PLD-FT' },
                { icon: BarChart3, label: '100+ Testes', desc: 'Procedimentos de teste estruturados' },
                { icon: Sparkles, label: 'IA Auditora', desc: 'LLM como auditor sênior Big Four' },
                { icon: FileText, label: 'Relatório Final', desc: 'Relatório profissional automatizado' },
              ].map((item, i) => (
                <div key={i} className="glass-panel p-4 text-center">
                  <item.icon size={24} className="text-blue-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-200">{item.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Stats overview */}
            <div className="grid grid-cols-5 gap-4 mb-8">
              <div className="stat-card">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Auditorias</p>
                <p className="text-2xl font-bold text-white mt-1">{audits.length}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">em andamento ou concluídas</p>
              </div>
              <div className="stat-card">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Achados Totais</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {audits.reduce((sum, a) => sum + a.findings.length, 0)}
                </p>
                <p className="text-[11px] text-red-400 mt-0.5">
                  {audits.reduce((sum, a) => sum + a.findings.filter(f => f.severity === 'critical').length, 0)} críticos
                </p>
              </div>
              <div className="stat-card">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Evidências</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {audits.reduce((sum, a) => sum + a.evidence.length, 0)}
                </p>
                <p className="text-[11px] text-blue-400 mt-0.5">coletadas ou pendentes</p>
              </div>
              <div className="stat-card">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Amostras</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {audits.reduce((sum, a) => sum + a.samples.length, 0)}
                </p>
                <p className="text-[11px] text-green-400 mt-0.5">
                  {audits.reduce((sum, a) => sum + a.samples.filter(s => s.status === 'tested').length, 0)} testadas
                </p>
              </div>
              <div className="stat-card">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Interações IA</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {audits.reduce((sum, a) => sum + a.conversations.reduce((s, c) => s + c.messages.length, 0), 0)}
                </p>
                <p className="text-[11px] text-purple-400 mt-0.5">mensagens trocadas</p>
              </div>
            </div>

            {/* Audit list */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Auditorias</h2>
              {audits.map(audit => {
                const stats = calculateAuditStats(audit)
                const phaseConf = PHASE_CONFIG[audit.phase]
                const ratingConf = RATING_CONFIG[audit.overallRating]

                return (
                  <div
                    key={audit.id}
                    onClick={() => router.push(`/audit/${audit.id}`)}
                    className="glass-panel-hover p-5 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-semibold text-slate-100 group-hover:text-white transition-colors">
                            {audit.name}
                          </h3>
                          <span className={cn('severity-badge text-[10px]', `rating-${audit.overallRating}`)}>
                            {ratingConf.label}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            {phaseConf.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                          <span>{audit.institution.name}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(audit.updatedAt)}</span>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-slate-600 group-hover:text-blue-400 transition-colors mt-1" />
                    </div>

                    <div className="grid grid-cols-5 gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <Activity size={14} className="text-blue-400" />
                        <div>
                          <p className="text-[11px] text-slate-400">Progresso</p>
                          <p className="text-xs font-medium text-slate-300">{stats.overallProgress}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-green-400" />
                        <div>
                          <p className="text-[11px] text-slate-400">Pilares</p>
                          <p className="text-xs font-medium text-slate-300">{stats.assessedPillars}/{stats.totalPillars}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-red-400" />
                        <div>
                          <p className="text-[11px] text-slate-400">Achados</p>
                          <p className="text-xs font-medium text-slate-300">{stats.totalFindings}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-yellow-400" />
                        <div>
                          <p className="text-[11px] text-slate-400">Evidências</p>
                          <p className="text-xs font-medium text-slate-300">{stats.receivedEvidence}/{stats.totalEvidence}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target size={14} className="text-purple-400" />
                        <div>
                          <p className="text-[11px] text-slate-400">Amostras</p>
                          <p className="text-xs font-medium text-slate-300">{stats.testedSamples}/{stats.totalSamples}</p>
                        </div>
                      </div>
                    </div>

                    <div className="progress-bar mt-3">
                      <div
                        className="progress-fill bg-gradient-to-r from-blue-500 to-indigo-500"
                        style={{ width: `${stats.overallProgress}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>

      <NewAuditModal
        isOpen={showNewAudit}
        onClose={() => setShowNewAudit(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
