'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuditStore } from '@/lib/store'
import { ImportedDataset, Severity } from '@/lib/types'
import {
  Database, Upload, Loader2, FileText, Hash, X, ChevronDown, ChevronRight,
  Activity, AlertTriangle, CheckCircle, Plus, Sparkles,
} from './Icons'
import { cn, formatDate } from '@/lib/utils'

interface Props {
  auditId: string
  pillarId: string
}

interface RuleFinding {
  ruleId: string
  ruleName: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  totalIssues: number
  sampleRecords: Record<string, string>[]
}

interface AnalyticsResult {
  findings: RuleFinding[]
  totalRowsAnalyzed: number
  columnMapping: Record<string, string>
  rulesEvaluated: number
  timestamp: string
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: 'text-red-400' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', icon: 'text-orange-400' },
  medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: 'text-yellow-400' },
  low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: 'text-blue-400' },
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
}

export default function DataImport({ auditId, pillarId }: Props) {
  const { getCurrentAudit, addDataset, addFinding } = useAuditStore()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyticsResults, setAnalyticsResults] = useState<Record<string, AnalyticsResult>>({})
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({})
  const [createdFindings, setCreatedFindings] = useState<Set<string>>(new Set())

  const audit = getCurrentAudit()
  const datasets = (audit?.datasets || []).filter(d => d.pillarId === pillarId)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      setIsUploading(true)
      setError('')
      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/import', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Falha no import')

        const data = await res.json()
        addDataset(auditId, {
          name: file.name,
          pillarId,
          headers: data.headers,
          rows: data.rows.slice(0, 500),
          totalRows: data.totalRows,
          source: file.name,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro no import')
      } finally {
        setIsUploading(false)
      }
    }
  }, [auditId, pillarId, addDataset])

  const runAnalysis = async (dataset: ImportedDataset) => {
    setIsAnalyzing(true)
    setError('')
    try {
      const res = await fetch('/api/data-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers: dataset.headers,
          rows: dataset.rows,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Erro na análise' }))
        throw new Error(errData.error || 'Erro na análise')
      }
      const result: AnalyticsResult = await res.json()
      setAnalyticsResults(prev => ({ ...prev, [dataset.id]: result }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao executar análise')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const createFindingFromRule = (finding: RuleFinding) => {
    const key = `${finding.ruleId}-${pillarId}`
    if (createdFindings.has(key)) return

    addFinding(auditId, {
      pillarId,
      title: finding.ruleName,
      severity: finding.severity as Severity,
      status: 'draft',
      condition: `Foram identificados ${finding.totalIssues} registros com a seguinte deficiência: ${finding.description}`,
      criteria: getCriteriaForRule(finding.ruleId),
      cause: 'A ser investigado durante os trabalhos de campo.',
      effect: getEffectForRule(finding.ruleId, finding.totalIssues),
      recommendation: getRecommendationForRule(finding.ruleId),
      regulatoryReference: getRegulatoryRefForRule(finding.ruleId),
      isAiGenerated: true,
      managementResponse: undefined,
      subAreaId: undefined,
    })

    setCreatedFindings(prev => new Set(prev).add(key))
  }

  const toggleFinding = (findingKey: string) => {
    setExpandedFindings(prev => ({ ...prev, [findingKey]: !prev[findingKey] }))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
  })

  return (
    <div className="h-full overflow-y-auto scroll-thin p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Database size={16} className="text-purple-400" />
          <span className="text-sm font-semibold text-slate-200">Data Analytics</span>
          <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{datasets.length} datasets</span>
        </div>

        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer',
            isDragActive ? 'border-purple-500/50 bg-purple-500/5' : 'border-[var(--ln-1)] hover:border-slate-600',
            isUploading && 'opacity-50 pointer-events-none'
          )}
        >
          <input {...getInputProps()} />
          {isUploading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 size={18} className="text-purple-400 animate-spin" />
              <span className="text-xs text-slate-400">Importando dados...</span>
            </div>
          ) : (
            <>
              <Upload size={20} className="mx-auto text-slate-500 mb-2" />
              <p className="text-xs text-slate-400">Arraste um arquivo CSV ou Excel para análise automatizada</p>
              <p className="text-[10px] text-slate-600 mt-1">Suporta .csv, .xlsx, .xls</p>
            </>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
            <button onClick={() => setError('')} className="ml-auto">
              <X size={12} className="text-red-400 hover:text-red-300" />
            </button>
          </div>
        )}

        {/* Datasets */}
        {datasets.map(ds => {
          const isExpanded = expandedId === ds.id
          const result = analyticsResults[ds.id]

          return (
            <div key={ds.id} className="glass-panel overflow-hidden">
              {/* Dataset header */}
              <div className="flex items-center gap-2 p-3">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : ds.id)}
                  className="flex items-center gap-2 flex-1 text-left hover:bg-slate-800/30 rounded -m-1 p-1"
                >
                  {isExpanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
                  <FileText size={14} className="text-purple-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{ds.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-0.5"><Hash size={9} />{ds.totalRows.toLocaleString('pt-BR')} linhas</span>
                      <span>{ds.headers.length} colunas</span>
                      <span>{formatDate(ds.importedAt)}</span>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => runAnalysis(ds)}
                  disabled={isAnalyzing}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                    isAnalyzing
                      ? 'bg-purple-500/10 text-purple-400 cursor-wait'
                      : result
                        ? 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'
                        : 'bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20'
                  )}
                >
                  {isAnalyzing ? (
                    <><Loader2 size={12} className="animate-spin" /> Analisando...</>
                  ) : result ? (
                    <><Sparkles size={12} /> Re-analisar</>
                  ) : (
                    <><Sparkles size={12} /> Executar Análise</>
                  )}
                </button>
              </div>

              {/* Data preview */}
              {isExpanded && (
                <div className="border-t border-[var(--ln-1)] overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="bg-[var(--sf-2)]">
                        {ds.headers.slice(0, 8).map((h, i) => (
                          <th key={i} className="px-2 py-1.5 text-left font-medium text-slate-400 border-b border-[var(--ln-1)] whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                        {ds.headers.length > 8 && (
                          <th className="px-2 py-1.5 text-left text-slate-500 border-b border-[var(--ln-1)]">+{ds.headers.length - 8}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {ds.rows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          {ds.headers.slice(0, 8).map((h, j) => (
                            <td key={j} className="px-2 py-1 text-slate-400 border-b border-[var(--ln-1)] whitespace-nowrap max-w-[200px] truncate">
                              {row[h] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ds.rows.length > 10 && (
                    <p className="text-[10px] text-slate-500 p-2 text-center">Mostrando 10 de {ds.totalRows.toLocaleString('pt-BR')} linhas</p>
                  )}
                </div>
              )}

              {/* Analytics Results */}
              {result && (
                <div className="border-t border-[var(--ln-1)] p-3 space-y-3">
                  {/* Summary bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity size={13} className="text-purple-400" />
                      <span className="text-[11px] font-medium text-slate-300">Resultados da Análise</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span>{result.totalRowsAnalyzed.toLocaleString('pt-BR')} linhas analisadas</span>
                      <span>{result.rulesEvaluated} regras avaliadas</span>
                      <span>{result.findings.length} achados</span>
                    </div>
                  </div>

                  {result.findings.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                      <CheckCircle size={14} className="text-green-400" />
                      <span className="text-xs text-green-400">Nenhuma irregularidade detectada nas regras aplicáveis.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {result.findings.map((finding) => {
                        const style = SEVERITY_STYLES[finding.severity]
                        const findingKey = `${ds.id}-${finding.ruleId}`
                        const isFindingExpanded = expandedFindings[findingKey]
                        const findingCreated = createdFindings.has(`${finding.ruleId}-${pillarId}`)

                        return (
                          <div key={finding.ruleId} className={cn('rounded-lg border overflow-hidden', style.border, style.bg)}>
                            {/* Finding header */}
                            <button
                              onClick={() => toggleFinding(findingKey)}
                              className="w-full flex items-center gap-2 p-3 text-left"
                            >
                              {isFindingExpanded
                                ? <ChevronDown size={12} className="text-slate-500" />
                                : <ChevronRight size={12} className="text-slate-500" />
                              }
                              <AlertTriangle size={14} className={style.icon} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-slate-200">{finding.ruleName}</span>
                                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium', style.bg, style.text, 'border', style.border)}>
                                    {SEVERITY_LABELS[finding.severity]}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">{finding.description}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="text-right">
                                  <p className={cn('text-sm font-bold', style.text)}>{finding.totalIssues}</p>
                                  <p className="text-[9px] text-slate-500">ocorrências</p>
                                </div>
                              </div>
                            </button>

                            {/* Expanded: sample records + create finding button */}
                            {isFindingExpanded && (
                              <div className="border-t border-[var(--ln-1)] p-3 space-y-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-medium text-slate-400">
                                    Amostra ({Math.min(5, finding.sampleRecords.length)} de {finding.totalIssues} registros)
                                  </span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); createFindingFromRule(finding) }}
                                    disabled={findingCreated}
                                    className={cn(
                                      'flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-all',
                                      findingCreated
                                        ? 'bg-green-500/10 text-green-400 cursor-default'
                                        : 'bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20'
                                    )}
                                  >
                                    {findingCreated ? (
                                      <><CheckCircle size={10} /> Achado Criado</>
                                    ) : (
                                      <><Plus size={10} /> Criar Achado</>
                                    )}
                                  </button>
                                </div>

                                <div className="overflow-x-auto rounded border border-[var(--ln-1)]">
                                  <table className="w-full text-[10px]">
                                    <thead>
                                      <tr className="bg-[var(--sf-0)]">
                                        {Object.keys(finding.sampleRecords[0] || {}).slice(0, 6).map((col, i) => (
                                          <th key={i} className="px-2 py-1.5 text-left font-medium text-slate-500 whitespace-nowrap">
                                            {col}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {finding.sampleRecords.map((record, i) => (
                                        <tr key={i} className="hover:bg-slate-800/20">
                                          {Object.keys(record).slice(0, 6).map((col, j) => (
                                            <td key={j} className="px-2 py-1 text-slate-400 whitespace-nowrap max-w-[180px] truncate border-t border-[var(--ln-1)]">
                                              {record[col] || '—'}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {datasets.length === 0 && (
          <div className="text-center py-8">
            <Database size={28} className="mx-auto text-slate-700 mb-2" />
            <p className="text-xs text-slate-500">Importe um dataset para iniciar a análise automatizada</p>
            <p className="text-[10px] text-slate-600 mt-1">O sistema mapeia automaticamente as colunas e executa regras de auditoria PLD-FT</p>
          </div>
        )}
      </div>
    </div>
  )
}

function getCriteriaForRule(ruleId: string): string {
  const map: Record<string, string> = {
    risk_zero_clients: 'Circular BACEN 3.978/2020 Art. 15 — Todas as instituições devem classificar seus clientes por nível de risco de PLD/FT.',
    missing_screening: 'Circular BACEN 3.978/2020 Art. 21 — Triagem periódica contra listas restritivas e de PEPs deve ser realizada em intervalos não superiores a 12 meses.',
    incomplete_kyc: 'Circular BACEN 3.978/2020 Arts. 10-14 — Dados cadastrais mínimos (identificação, qualificação, classificação) devem estar completos e atualizados.',
    training_gaps: 'Circular BACEN 3.978/2020 Art. 56 — Programa de treinamento contínuo em PLD/FT para todos os colaboradores.',
    inactive_monitoring: 'Circular BACEN 3.978/2020 Art. 22 — Monitoramento contínuo de transações atípicas é obrigatório.',
    pep_without_edd: 'Circular BACEN 3.978/2020 Art. 19 — Pessoas Expostas Politicamente requerem procedimentos reforçados de Due Diligence.',
  }
  return map[ruleId] || ''
}

function getEffectForRule(ruleId: string, count: number): string {
  const map: Record<string, string> = {
    risk_zero_clients: `${count} clientes sem classificação de risco adequada, impossibilitando a aplicação de controles proporcionais ao risco.`,
    missing_screening: `${count} clientes com triagem desatualizada, aumentando exposição a operações com pessoas/entidades sancionadas.`,
    incomplete_kyc: `${count} registros com KYC incompleto, comprometendo a capacidade de identificação e conhecimento do cliente.`,
    training_gaps: `${count} colaboradores sem treinamento PLD atualizado, reduzindo a capacidade de detecção de operações suspeitas.`,
    inactive_monitoring: `${count} contas sem monitoramento recente, possibilitando a ocorrência de operações atípicas não detectadas.`,
    pep_without_edd: `${count} PEPs sem diligência reforçada, expondo a instituição a risco regulatório e reputacional significativo.`,
  }
  return map[ruleId] || `${count} registros com deficiências identificadas.`
}

function getRecommendationForRule(ruleId: string): string {
  const map: Record<string, string> = {
    risk_zero_clients: 'Implementar processo de revisão e atualização da classificação de risco para todos os clientes identificados, com priorização baseada em volume transacional.',
    missing_screening: 'Estabelecer rotina automatizada de triagem periódica e implementar alertas para vencimentos próximos.',
    incomplete_kyc: 'Realizar campanha de atualização cadastral e implementar controles preventivos no onboarding para garantir completude dos dados.',
    training_gaps: 'Implementar programa de treinamento obrigatório com controles de conclusão e prazos definidos.',
    inactive_monitoring: 'Revisar e atualizar as regras de monitoramento de transações, garantindo cobertura de toda a base ativa.',
    pep_without_edd: 'Aplicar imediatamente procedimentos de EDD a todos os PEPs identificados e revisar o processo de detecção de PEPs.',
  }
  return map[ruleId] || 'Implementar controles corretivos para os registros identificados.'
}

function getRegulatoryRefForRule(ruleId: string): string[] {
  const map: Record<string, string[]> = {
    risk_zero_clients: ['Circular BACEN 3.978/2020 Art. 15', 'Resolução CVM 50/2021 Art. 7'],
    missing_screening: ['Circular BACEN 3.978/2020 Art. 21', 'Lei 9.613/1998 Art. 10'],
    incomplete_kyc: ['Circular BACEN 3.978/2020 Arts. 10-14', 'Resolução CVM 50/2021 Arts. 3-5'],
    training_gaps: ['Circular BACEN 3.978/2020 Art. 56', 'COAF Resolução 40/2021'],
    inactive_monitoring: ['Circular BACEN 3.978/2020 Art. 22', 'Lei 9.613/1998 Art. 11'],
    pep_without_edd: ['Circular BACEN 3.978/2020 Art. 19', 'FATF Recomendação 12'],
  }
  return map[ruleId] || []
}
