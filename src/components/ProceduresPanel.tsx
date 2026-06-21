'use client'

import { useState } from 'react'
import { useAuditStore } from '@/lib/store'
import { Pillar, TestResult, Rating } from '@/lib/types'
import { RATING_CONFIG } from '@/lib/audit-framework'
import { ChevronDown, ChevronRight, CheckCircle, X, AlertTriangle, CircleDot, ClipboardList, Sparkles, Loader2 } from './Icons'
import { cn } from '@/lib/utils'

interface Props {
  auditId: string
  pillar: Pillar
}

interface ChecklistItem {
  requirement: string
  regulatoryRef: string
  status: 'pass' | 'fail' | 'partial' | 'not_found'
  details: string
  location: string
}

interface TestExecResult {
  procedureCode: string
  overallResult: 'pass' | 'fail' | 'partial'
  checklist: ChecklistItem[]
  summary: string
  observations: string
  recommendation: string
}

const RESULT_CONFIG: Record<TestResult, { label: string; color: string; icon: React.ReactNode }> = {
  pass: { label: 'Aprovado', color: 'text-green-400', icon: <CheckCircle size={14} className="text-green-400" /> },
  fail: { label: 'Reprovado', color: 'text-red-400', icon: <X size={14} className="text-red-400" /> },
  partial: { label: 'Parcial', color: 'text-yellow-400', icon: <AlertTriangle size={14} className="text-yellow-400" /> },
  not_tested: { label: 'Não Testado', color: 'text-slate-500', icon: <CircleDot size={14} className="text-slate-500" /> },
  not_applicable: { label: 'N/A', color: 'text-slate-600', icon: <span className="text-slate-600 text-xs">N/A</span> },
}

const CHECK_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pass: { bg: 'bg-green-500/10 border-green-500/20', text: 'text-green-400', label: 'OK' },
  fail: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', label: 'FALHA' },
  partial: { bg: 'bg-yellow-500/10 border-yellow-500/20', text: 'text-yellow-400', label: 'PARCIAL' },
  not_found: { bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-400', label: 'N/E' },
}

export default function ProceduresPanel({ auditId, pillar }: Props) {
  const { updateTestResult, updateSubAreaRating, updatePillarCompletion, updateTestWorkpaper, getCurrentAudit } = useAuditStore()
  const [expandedSubArea, setExpandedSubArea] = useState<string | null>(pillar.subAreas[0]?.id || null)
  const [editingTest, setEditingTest] = useState<string | null>(null)
  const [testObs, setTestObs] = useState('')
  const [editingWorkpaper, setEditingWorkpaper] = useState<string | null>(null)
  const [wpNotes, setWpNotes] = useState('')
  const [wpConclusion, setWpConclusion] = useState('')
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set())
  const [testResults, setTestResults] = useState<Record<string, TestExecResult>>({})

  const audit = getCurrentAudit()
  const evidenceForPillar = audit?.evidence.filter(e => e.pillarId === pillar.id) || []

  const executeTest = async (subAreaId: string, testId: string, testCode: string, testDesc: string, testMethod: string, regBasis: string[]) => {
    const linkedEvidence = evidenceForPillar.filter(e =>
      e.linkedTestProcedureIds?.includes(testId)
    )
    const allEvForPillar = evidenceForPillar.filter(e => e.status === 'received' || e.status === 'accepted')
    const relevantEvidence = linkedEvidence.length > 0 ? linkedEvidence : allEvForPillar

    if (relevantEvidence.length === 0) return

    setRunningTests(prev => new Set(prev).add(testId))

    try {
      const evidenceContent = relevantEvidence
        .map(e => `### ${e.name}\n${e.textPreview || '[Sem texto extraído]'}`)
        .join('\n\n---\n\n')

      const evidenceAnalysis = relevantEvidence
        .filter(e => e.aiAnalysis)
        .map(e => `### ${e.name}\n${e.aiAnalysis}`)
        .join('\n\n')

      const res = await fetch('/api/test-procedure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureCode: testCode,
          procedureDescription: testDesc,
          procedureMethodology: testMethod,
          regulatoryBasis: regBasis,
          evidenceContent,
          evidenceName: relevantEvidence.map(e => e.name).join(', '),
          evidenceAnalysis,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const result = data.result as TestExecResult
        setTestResults(prev => ({ ...prev, [testId]: result }))

        const mappedResult = result.overallResult as 'pass' | 'fail' | 'partial'
        updateTestResult(auditId, pillar.id, subAreaId, testId, mappedResult, result.summary)
        updateTestWorkpaper(auditId, pillar.id, subAreaId, testId, {
          workpaperNotes: result.observations,
          conclusion: result.recommendation,
        })
        updatePillarCompletion(auditId, pillar.id)
      }
    } catch (err) {
      console.error('Test execution error:', err)
    } finally {
      setRunningTests(prev => {
        const next = new Set(prev)
        next.delete(testId)
        return next
      })
    }
  }

  const handleTestResult = (subAreaId: string, testId: string, result: TestResult, observations: string) => {
    updateTestResult(auditId, pillar.id, subAreaId, testId, result as 'pass' | 'fail' | 'partial' | 'not_applicable', observations)
    updatePillarCompletion(auditId, pillar.id)
    setEditingTest(null)
    setTestObs('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--ln-1)]">
        <h3 className="text-sm font-semibold text-slate-200">Procedimentos de Teste</h3>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[11px] text-slate-500">{pillar.subAreas.length} sub-áreas | {pillar.subAreas.flatMap(sa => sa.testProcedures).length} procedimentos</span>
          {(() => {
            const all = pillar.subAreas.flatMap(sa => sa.testProcedures)
            const designCount = all.filter(t => (t as { testType?: string }).testType === 'design').length
            const opCount = all.filter(t => (t as { testType?: string }).testType === 'operating').length
            const bothCount = all.filter(t => (t as { testType?: string }).testType === 'both').length
            return (designCount + opCount + bothCount) > 0 ? (
              <span className="text-[10px] text-slate-500">
                <span className="text-indigo-400">{designCount}D</span> | <span className="text-amber-400">{opCount}O</span>{bothCount > 0 && <> | <span className="text-purple-400">{bothCount}A</span></>}
              </span>
            ) : null
          })()}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-3">
        {pillar.subAreas.map(subArea => {
          const isExpanded = expandedSubArea === subArea.id
          const completedTests = subArea.testProcedures.filter(tp => tp.result !== 'not_tested').length
          const totalTests = subArea.testProcedures.length
          const ratingConf = RATING_CONFIG[subArea.rating]

          return (
            <div key={subArea.id} className="glass-panel overflow-hidden">
              <button
                onClick={() => setExpandedSubArea(isExpanded ? null : subArea.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-800/30 transition-all"
              >
                {isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-blue-400 tracking-wider">{subArea.code}</span>
                    <span className="text-xs font-medium text-slate-200">{subArea.name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-slate-400">{completedTests}/{totalTests} testados</span>
                    <span className={cn('severity-badge text-[10px]', `rating-${subArea.rating}`)}>
                      {ratingConf.label}
                    </span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[var(--ln-1)]">
                  <div className="p-3 bg-[var(--sf-2)]">
                    <p className="text-[11px] text-slate-400 mb-2">{subArea.description}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] text-slate-400">Rating:</span>
                      <select
                        value={subArea.rating}
                        onChange={e => updateSubAreaRating(auditId, pillar.id, subArea.id, e.target.value as Rating)}
                        className="select-field text-[11px] w-auto py-0.5"
                      >
                        <option value="not_assessed">Não Avaliado</option>
                        <option value="effective">Efetivo</option>
                        <option value="largely_effective">Amplamente Efetivo</option>
                        <option value="partially_effective">Parcialmente Efetivo</option>
                        <option value="ineffective">Inefetivo</option>
                      </select>
                    </div>
                    {subArea.keyRisks.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {subArea.keyRisks.map((risk, i) => (
                          <span key={i} className="text-[10px] bg-red-500/5 text-red-400/70 border border-red-500/10 px-2 py-0.5 rounded">
                            {risk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {subArea.testProcedures.map(tp => {
                    const resultConf = RESULT_CONFIG[tp.result]
                    const isEditing = editingTest === tp.id

                    return (
                      <div key={tp.id} className="border-t border-[var(--ln-1)] p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          {resultConf.icon}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-slate-400">{tp.code}</span>
                              <span className={cn('text-[11px] font-medium', resultConf.color)}>{resultConf.label}</span>
                              {(tp as { testType?: string }).testType && (
                                <span className={cn(
                                  'text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider',
                                  (tp as { testType?: string }).testType === 'design'
                                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                    : (tp as { testType?: string }).testType === 'operating'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                )}>
                                  {(tp as { testType?: string }).testType === 'design' ? 'DESIGN' : (tp as { testType?: string }).testType === 'operating' ? 'OPERACIONAL' : 'AMBOS'}
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] text-slate-300 mt-0.5 leading-relaxed">{tp.description}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Metodologia: {tp.methodology}</p>
                            {tp.sampleSize && <p className="text-[11px] text-blue-400/70 mt-0.5">Amostra: {tp.sampleSize}</p>}
                            {tp.regulatoryBasis.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {tp.regulatoryBasis.map((ref, i) => (
                                  <span key={i} className="text-[10px] text-blue-400/60">§ {ref}</span>
                                ))}
                              </div>
                            )}
                            {tp.observations && <p className="text-[11px] text-slate-400 mt-1 italic">{tp.observations}</p>}
                          </div>
                        </div>

                        {tp.evidenceIds.length > 0 && (
                          <div className="ml-6 flex flex-wrap gap-1 mt-1">
                            <span className="text-[10px] text-slate-500">Evidências:</span>
                            {tp.evidenceIds.map(eId => {
                              const ev = evidenceForPillar.find(e => e.id === eId)
                              return ev ? (
                                <span key={eId} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full truncate max-w-[180px]">
                                  {ev.name}
                                </span>
                              ) : null
                            })}
                          </div>
                        )}

                        {isEditing ? (
                          <div className="ml-6 space-y-2">
                            <textarea
                              value={testObs}
                              onChange={e => setTestObs(e.target.value)}
                              placeholder="Observações do teste..."
                              className="textarea-field text-xs"
                              rows={2}
                            />
                            <div className="flex gap-1.5">
                              {(['pass', 'fail', 'partial', 'not_applicable'] as TestResult[]).map(r => (
                                <button
                                  key={r}
                                  onClick={() => handleTestResult(subArea.id, tp.id, r, testObs)}
                                  className={cn('btn-ghost text-[10px]', RESULT_CONFIG[r].color)}
                                >
                                  {RESULT_CONFIG[r].label}
                                </button>
                              ))}
                              <button onClick={() => setEditingTest(null)} className="btn-ghost text-[10px] text-slate-600">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div className="ml-6 flex gap-2 flex-wrap">
                            {evidenceForPillar.some(e => (e.status === 'received' || e.status === 'accepted')) && (
                              <button
                                onClick={() => executeTest(subArea.id, tp.id, tp.code, tp.description, tp.methodology, tp.regulatoryBasis)}
                                disabled={runningTests.has(tp.id)}
                                className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                              >
                                {runningTests.has(tp.id) ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : (
                                  <Sparkles size={10} />
                                )}
                                {runningTests.has(tp.id) ? 'Testando...' : 'Executar Teste com IA'}
                              </button>
                            )}
                            <button
                              onClick={() => { setEditingTest(tp.id); setTestObs(tp.observations) }}
                              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                            >
                              {tp.result === 'not_tested' ? 'Registrar Manual' : 'Alterar Resultado'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingWorkpaper(editingWorkpaper === tp.id ? null : tp.id)
                                setWpNotes(tp.workpaperNotes || '')
                                setWpConclusion(tp.conclusion || '')
                              }}
                              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all"
                            >
                              {tp.workpaperNotes ? 'Editar Workpaper' : 'Adicionar Workpaper'}
                            </button>
                          </div>
                        )}

                        {editingWorkpaper === tp.id && (
                          <div className="ml-6 mt-2 space-y-2 p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                            <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Working Paper</p>
                            <textarea
                              value={wpNotes}
                              onChange={e => setWpNotes(e.target.value)}
                              placeholder="Notas do workpaper: escopo, abordagem, resultados detalhados..."
                              className="textarea-field text-xs"
                              rows={4}
                            />
                            <textarea
                              value={wpConclusion}
                              onChange={e => setWpConclusion(e.target.value)}
                              placeholder="Conclusão do procedimento..."
                              className="textarea-field text-xs"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  updateTestWorkpaper(auditId, pillar.id, subArea.id, tp.id, { workpaperNotes: wpNotes, conclusion: wpConclusion })
                                  setEditingWorkpaper(null)
                                }}
                                className="btn-primary text-[10px]"
                              >
                                Salvar
                              </button>
                              <button onClick={() => setEditingWorkpaper(null)} className="btn-ghost text-[10px]">Cancelar</button>
                            </div>
                          </div>
                        )}

                        {tp.workpaperNotes && editingWorkpaper !== tp.id && (
                          <div className="ml-6 mt-1 p-2 bg-purple-500/5 border border-purple-500/10 rounded">
                            <p className="text-[9px] font-semibold text-purple-400 uppercase tracking-wider mb-1">Working Paper</p>
                            <p className="text-[11px] text-slate-400 whitespace-pre-wrap">{tp.workpaperNotes}</p>
                            {tp.conclusion && (
                              <p className="text-[11px] text-slate-300 mt-1 font-medium">Conclusão: {tp.conclusion}</p>
                            )}
                          </div>
                        )}

                        {testResults[tp.id] && (
                          <div className="ml-6 mt-2 border border-emerald-500/10 rounded-lg overflow-hidden">
                            <div className="p-2.5 bg-emerald-500/5 flex items-center gap-2">
                              <Sparkles size={12} className="text-emerald-400" />
                              <span className="text-[10px] font-semibold text-emerald-400">Resultado do Teste Automatizado</span>
                              <span className={cn(
                                'text-[9px] px-2 py-0.5 rounded-full border font-semibold',
                                testResults[tp.id].overallResult === 'pass' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                testResults[tp.id].overallResult === 'fail' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                              )}>
                                {testResults[tp.id].overallResult === 'pass' ? 'APROVADO' : testResults[tp.id].overallResult === 'fail' ? 'REPROVADO' : 'PARCIAL'}
                              </span>
                            </div>
                            <div className="p-2.5 text-[11px] text-slate-400">
                              {testResults[tp.id].summary}
                            </div>
                            <div className="divide-y divide-[var(--ln-1)]">
                              {testResults[tp.id].checklist.map((item, idx) => {
                                const style = CHECK_STATUS_STYLES[item.status] || CHECK_STATUS_STYLES.not_found
                                return (
                                  <div key={idx} className="px-2.5 py-2 flex items-start gap-2">
                                    <span className={cn('text-[8px] px-1.5 py-0.5 rounded border font-bold flex-shrink-0 mt-0.5', style.bg, style.text)}>
                                      {style.label}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] text-slate-300 font-medium">{item.requirement}</p>
                                      <p className="text-[10px] text-slate-500 mt-0.5">{item.details}</p>
                                      <div className="flex gap-3 mt-0.5">
                                        {item.regulatoryRef && (
                                          <span className="text-[9px] text-blue-400/60">§ {item.regulatoryRef}</span>
                                        )}
                                        {item.location && item.location !== '-' && (
                                          <span className="text-[9px] text-slate-600">📍 {item.location}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            {testResults[tp.id].recommendation && (
                              <div className="p-2.5 bg-blue-500/5 border-t border-[var(--ln-1)]">
                                <p className="text-[9px] font-semibold text-blue-400 uppercase tracking-wider mb-0.5">Próximos Passos</p>
                                <p className="text-[11px] text-slate-400">{testResults[tp.id].recommendation}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {runningTests.has(tp.id) && (
                          <div className="ml-6 mt-2 flex items-center gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                            <Loader2 size={14} className="animate-spin text-emerald-400" />
                            <span className="text-[11px] text-emerald-300">ARGUS executando teste automatizado sobre as evidências...</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {pillar.subAreas.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList size={24} className="mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">Nenhum procedimento definido</p>
          </div>
        )}
      </div>
    </div>
  )
}
