'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAuditStore } from '@/lib/store'
import { PillarMemo, Pillar, Rating } from '@/lib/types'
import { FileText, Save, Sparkles, CheckCircle, AlertTriangle, Loader2, Edit3, BookOpen, Target, Hash } from '@/components/Icons'
import { cn, computePillarScore, computeSubAreaScore } from '@/lib/utils'
import { RATING_CONFIG, SEVERITY_CONFIG } from '@/lib/audit-framework'

type MemoStatus = 'draft' | 'reviewed' | 'final'

const STATUS_CONFIG: Record<MemoStatus, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  reviewed: { label: 'Revisado', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  final: { label: 'Final', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
}

const SECTION_META = [
  { key: 'scopeTested', label: 'Escopo Testado', icon: Target, hint: 'Descreva o que foi testado neste pilar.' },
  { key: 'evidenceSummary', label: 'Resumo de Evidências', icon: FileText, hint: 'Resumo quantitativo e qualitativo das evidências.' },
  { key: 'testingSummary', label: 'Resumo de Testes', icon: Hash, hint: 'Resultados dos procedimentos de teste.' },
  { key: 'findingsSummary', label: 'Resumo de Achados', icon: AlertTriangle, hint: 'Achados identificados com classificação de severidade.' },
  { key: 'ratingJustification', label: 'Justificativa do Rating', icon: BookOpen, hint: 'Justificativa para o rating atribuído ao pilar.' },
  { key: 'conclusion', label: 'Conclusão', icon: CheckCircle, hint: 'Conclusão geral sobre a efetividade do pilar.' },
] as const

type SectionKey = typeof SECTION_META[number]['key']

const textareaClass = 'w-full bg-[var(--sf-1)] border border-[var(--ln-1)] rounded-lg p-3 text-sm text-slate-200 resize-none focus:outline-none focus:border-blue-500/50'

export default function PillarMemoPanel({ auditId, pillarId }: { auditId: string; pillarId: string }) {
  const audit = useAuditStore(s => s.audits.find(a => a.id === auditId))
  const savePillarMemo = useAuditStore(s => s.savePillarMemo)

  const pillar = audit?.pillars.find(p => p.id === pillarId)
  const evidence = useMemo(() => audit?.evidence.filter(e => e.pillarId === pillarId) ?? [], [audit, pillarId])
  const findings = useMemo(() => audit?.findings.filter(f => f.pillarId === pillarId) ?? [], [audit, pillarId])
  const existingMemo = useMemo(() => (audit?.pillarMemos || []).find(m => m.pillarId === pillarId), [audit, pillarId])

  const pillarScore = useMemo(() => pillar ? computePillarScore(pillar) : { score: 0, rating: 'not_assessed' as Rating }, [pillar])

  const [status, setStatus] = useState<MemoStatus>('draft')
  const [isGenerating, setIsGenerating] = useState(false)
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null)
  const [saved, setSaved] = useState(false)
  const [preparedBy, setPreparedBy] = useState(existingMemo?.preparedBy || '')
  const [reviewedBy, setReviewedBy] = useState(existingMemo?.reviewedBy || '')

  const emptyMemo: PillarMemo = {
    pillarId,
    scopeTested: '',
    evidenceSummary: '',
    testingSummary: '',
    findingsSummary: '',
    ratingJustification: '',
    conclusion: '',
    generatedAt: '',
    isAiGenerated: false,
  }

  const [memo, setMemo] = useState<PillarMemo>(existingMemo ?? emptyMemo)

  const updateSection = useCallback((key: SectionKey, value: string) => {
    setMemo(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  const generateMemo = useCallback(() => {
    if (!pillar || !audit) return
    setIsGenerating(true)

    setTimeout(() => {
      const allTests = pillar.subAreas.flatMap(sa => sa.testProcedures)
      const testedCount = allTests.filter(t => t.result !== 'not_tested').length
      const passCount = allTests.filter(t => t.result === 'pass').length
      const failCount = allTests.filter(t => t.result === 'fail').length
      const partialCount = allTests.filter(t => t.result === 'partial').length
      const naCount = allTests.filter(t => t.result === 'not_applicable').length

      const subAreaDetails = pillar.subAreas.map(sa => {
        const saScore = computeSubAreaScore(pillar, sa.id)
        return `  - ${sa.code} ${sa.name}: ${RATING_CONFIG[saScore.rating].label} (${saScore.tested}/${saScore.total} testes executados, score ${saScore.score})`
      }).join('\n')

      const scopeTested = [
        `Pilar ${pillar.number} - ${pillar.name} (${pillar.code})`,
        `Base regulatória: ${pillar.regulatoryBasis.join('; ')}`,
        `\nSubáreas avaliadas (${pillar.subAreas.length}):`,
        subAreaDetails,
        `\nTotal de procedimentos de teste: ${allTests.length}`,
        `Procedimentos executados: ${testedCount}/${allTests.length} (${allTests.length > 0 ? Math.round((testedCount / allTests.length) * 100) : 0}%)`,
      ].join('\n')

      const evByStatus = {
        received: evidence.filter(e => e.status === 'received').length,
        accepted: evidence.filter(e => e.status === 'accepted').length,
        under_review: evidence.filter(e => e.status === 'under_review').length,
        rejected: evidence.filter(e => e.status === 'rejected').length,
        requested: evidence.filter(e => e.status === 'requested').length,
        pending_clarification: evidence.filter(e => e.status === 'pending_clarification').length,
      }

      const evidenceSummary = [
        `Total de evidências solicitadas: ${evidence.length}`,
        `  - Aceitas: ${evByStatus.accepted}`,
        `  - Recebidas (em revisão): ${evByStatus.received}`,
        `  - Em análise: ${evByStatus.under_review}`,
        `  - Aguardando recebimento: ${evByStatus.requested}`,
        `  - Pendente de esclarecimento: ${evByStatus.pending_clarification}`,
        `  - Rejeitadas: ${evByStatus.rejected}`,
        evidence.length > 0
          ? `\nTaxa de cobertura: ${Math.round(((evByStatus.accepted + evByStatus.received + evByStatus.under_review) / evidence.length) * 100)}% das evidências foram recebidas.`
          : '\nNenhuma evidência solicitada para este pilar.',
      ].join('\n')

      const testingSummary = [
        `Resultado dos procedimentos de teste (${testedCount}/${allTests.length} executados):`,
        `  - Aprovados (Pass): ${passCount}`,
        `  - Reprovados (Fail): ${failCount}`,
        `  - Parcial: ${partialCount}`,
        `  - Não Aplicável: ${naCount}`,
        `  - Não Testados: ${allTests.length - testedCount}`,
        testedCount > 0
          ? `\nTaxa de aprovação (excl. N/A): ${(() => { const applicable = passCount + failCount + partialCount; return applicable > 0 ? Math.round((passCount / applicable) * 100) : 0 })()}%`
          : '',
        `\nScore computado do pilar: ${pillarScore.score}/100 - ${RATING_CONFIG[pillarScore.rating].label}`,
      ].filter(Boolean).join('\n')

      const severityCounts = {
        critical: findings.filter(f => f.severity === 'critical').length,
        high: findings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length,
        low: findings.filter(f => f.severity === 'low').length,
      }

      const findingsSummary = findings.length > 0
        ? [
            `Total de achados identificados: ${findings.length}`,
            `  - ${SEVERITY_CONFIG.critical.label}: ${severityCounts.critical}`,
            `  - ${SEVERITY_CONFIG.high.label}: ${severityCounts.high}`,
            `  - ${SEVERITY_CONFIG.medium.label}: ${severityCounts.medium}`,
            `  - ${SEVERITY_CONFIG.low.label}: ${severityCounts.low}`,
            '\nPrincipais achados:',
            ...findings
              .sort((a, b) => { const ord: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }; return (ord[a.severity] ?? 4) - (ord[b.severity] ?? 4) })
              .slice(0, 5)
              .map(f => `  - [${SEVERITY_CONFIG[f.severity].label}] ${f.title}`),
          ].join('\n')
        : 'Nenhum achado identificado para este pilar até o momento.'

      const ratingLabel = RATING_CONFIG[pillarScore.rating].label
      const ratingDesc = RATING_CONFIG[pillarScore.rating].description
      const ratingJustification = [
        `Rating atribuído: ${ratingLabel} (score ${pillarScore.score}/100)`,
        `\nDefinição: ${ratingDesc}`,
        `\nFundamentação:`,
        `O pilar apresentou ${testedCount} de ${allTests.length} procedimentos executados.`,
        passCount > 0 ? `${passCount} procedimento(s) foram aprovados integralmente.` : '',
        failCount > 0 ? `${failCount} procedimento(s) apresentaram falhas.` : '',
        partialCount > 0 ? `${partialCount} procedimento(s) com resultado parcial.` : '',
        findings.length > 0 ? `Foram identificados ${findings.length} achado(s), dos quais ${severityCounts.critical + severityCounts.high} de severidade alta ou crítica.` : 'Não foram identificados achados.',
      ].filter(Boolean).join('\n')

      const conclusion = [
        `Com base nos procedimentos de teste executados, na análise das evidências obtidas e nos achados identificados, o pilar "${pillar.name}" foi avaliado como ${ratingLabel}.`,
        findings.length > 0
          ? `\nForam identificadas ${findings.length} deficiência(s) que requerem atenção da instituição, sendo ${severityCounts.critical + severityCounts.high} de severidade alta ou crítica.`
          : '\nNão foram identificadas deficiências significativas.',
        pillarScore.score >= 85
          ? '\nOs controles avaliados demonstram efetividade adequada, atendendo aos requisitos regulatórios aplicáveis.'
          : pillarScore.score >= 65
            ? '\nOs controles avaliados atendem à maioria dos requisitos, porém existem oportunidades de melhoria que devem ser endereçadas.'
            : pillarScore.score >= 40
              ? '\nOs controles avaliados apresentam deficiências significativas que comprometem a efetividade do programa nesta área. Recomenda-se ação prioritária.'
              : testedCount > 0
                ? '\nOs controles avaliados não atendem aos requisitos mínimos regulatórios. Ação imediata é requerida.'
                : '\nAvaliação inconclusiva - procedimentos de teste ainda não foram executados.',
      ].join('')

      setMemo({
        pillarId,
        scopeTested,
        evidenceSummary,
        testingSummary,
        findingsSummary,
        ratingJustification,
        conclusion,
        generatedAt: new Date().toISOString(),
        isAiGenerated: true,
      })

      setSaved(false)
      setIsGenerating(false)
    }, 600)
  }, [pillar, audit, evidence, findings, pillarScore, pillarId])

  const handleSave = useCallback(() => {
    savePillarMemo(auditId, {
      ...memo,
      preparedBy,
      reviewedBy,
      preparedAt: preparedBy ? new Date().toISOString() : undefined,
      status: status,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [auditId, memo, preparedBy, reviewedBy, status, savePillarMemo])

  const handleExport = useCallback(() => {
    if (!pillar) return
    const sections = SECTION_META.map(s => `## ${s.label}\n\n${memo[s.key] || '(vazio)'}`).join('\n\n---\n\n')
    const header = `# Memo do Pilar - ${pillar.name}\n\nGerado em: ${memo.generatedAt ? new Date(memo.generatedAt).toLocaleString('pt-BR') : 'N/A'}\nStatus: ${STATUS_CONFIG[status].label}\nScore: ${pillarScore.score}/100 - ${RATING_CONFIG[pillarScore.rating].label}\n\n---\n\n`
    const content = header + sections
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `memo-${pillar.code}-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [pillar, memo, status, pillarScore])

  if (!audit || !pillar) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p className="text-sm">Pilar não encontrado.</p>
      </div>
    )
  }

  const hasContent = SECTION_META.some(s => memo[s.key]?.trim())

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Memo do Pilar — {pillar.code} {pillar.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={e => setStatus(e.target.value as MemoStatus)}
              className="bg-[var(--sf-1)] border border-[var(--ln-1)] rounded-md px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-blue-500/50"
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border', STATUS_CONFIG[status].className)}>
              {STATUS_CONFIG[status].label}
            </span>
          </div>
        </div>

        {/* Score bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400">Score de Efetividade</span>
              <span className="text-xs font-medium" style={{ color: RATING_CONFIG[pillarScore.rating].color }}>
                {pillarScore.score}/100 — {RATING_CONFIG[pillarScore.rating].label}
              </span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pillarScore.score}%`, backgroundColor: RATING_CONFIG[pillarScore.rating].color }}
              />
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Evidências" value={evidence.length} sub={`${evidence.filter(e => e.status === 'accepted').length} aceitas`} />
          <StatCard label="Testes" value={pillar.subAreas.flatMap(sa => sa.testProcedures).length} sub={`${pillar.subAreas.flatMap(sa => sa.testProcedures).filter(t => t.result !== 'not_tested').length} executados`} />
          <StatCard label="Achados" value={findings.length} sub={`${findings.filter(f => f.severity === 'critical' || f.severity === 'high').length} alto/crítico`} />
          <StatCard label="Subáreas" value={pillar.subAreas.length} sub={`${pillar.subAreas.filter(sa => computeSubAreaScore(pillar, sa.id).rating !== 'not_assessed').length} avaliadas`} />
        </div>
      </div>

      {/* Preparer / Reviewer - ISA 230 */}
      <div className="grid grid-cols-2 gap-3 mt-4 p-3 rounded-lg bg-[var(--sf-1)] border border-[var(--ln-1)]">
        <div>
          <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Preparado por</label>
          <input
            value={preparedBy}
            onChange={e => setPreparedBy(e.target.value)}
            placeholder="Nome do auditor"
            className="input-field text-xs mt-1"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Revisado por</label>
          <input
            value={reviewedBy}
            onChange={e => setReviewedBy(e.target.value)}
            placeholder="Nome do revisor"
            className="input-field text-xs mt-1"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={generateMemo}
          disabled={isGenerating}
          className={cn('btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5', isGenerating && 'opacity-60 cursor-wait')}
        >
          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {isGenerating ? 'Gerando...' : 'Gerar Memo'}
        </button>

        <button
          onClick={handleSave}
          disabled={!hasContent}
          className={cn('btn-ghost flex items-center gap-1.5 text-xs px-3 py-1.5', !hasContent && 'opacity-40 cursor-not-allowed')}
        >
          <Save size={14} />
          {saved ? 'Salvo!' : 'Salvar'}
        </button>

        <button
          onClick={handleExport}
          disabled={!hasContent}
          className={cn('btn-ghost flex items-center gap-1.5 text-xs px-3 py-1.5', !hasContent && 'opacity-40 cursor-not-allowed')}
        >
          <FileText size={14} />
          Exportar .md
        </button>

        {memo.generatedAt && (
          <span className="ml-auto text-[11px] text-slate-500">
            {memo.isAiGenerated ? 'Gerado automaticamente' : 'Editado manualmente'} em{' '}
            {new Date(memo.generatedAt).toLocaleString('pt-BR')}
          </span>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTION_META.map(({ key, label, icon: Icon, hint }) => {
          const isEditing = editingSection === key
          const value = memo[key]

          return (
            <div key={key} className="glass-panel p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon size={14} className="text-slate-400" />
                  <h3 className="text-sm font-medium text-slate-100">{label}</h3>
                </div>
                <button
                  onClick={() => setEditingSection(isEditing ? null : key)}
                  className="btn-ghost p-1 rounded"
                  title={isEditing ? 'Fechar edição' : 'Editar seção'}
                >
                  <Edit3 size={13} className={cn(isEditing ? 'text-blue-400' : 'text-slate-500')} />
                </button>
              </div>

              {isEditing ? (
                <textarea
                  value={value}
                  onChange={e => updateSection(key, e.target.value)}
                  placeholder={hint}
                  rows={8}
                  className={textareaClass}
                  autoFocus
                />
              ) : value ? (
                <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{value}</pre>
              ) : (
                <p className="text-xs text-slate-500 italic">{hint}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="bg-[var(--sf-1)] border border-[var(--ln-1)] rounded-lg p-2 text-center">
      <p className="text-lg font-semibold text-slate-100">{value}</p>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
    </div>
  )
}
