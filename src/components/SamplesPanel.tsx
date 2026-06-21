'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useAuditStore } from '@/lib/store'
import { Sample, SampleItem, TestResult } from '@/lib/types'
import {
  Target, ChevronDown, ChevronRight, Plus, Hash, Percent,
  CheckCircle, X, AlertTriangle, FileText, Save,
} from './Icons'
import { cn, generateId } from '@/lib/utils'

interface Props {
  auditId: string
  pillarId: string
}

const METHOD_LABELS: Record<string, string> = {
  random: 'Aleatória',
  stratified: 'Estratificada',
  judgmental: 'Julgamental',
  monetary_unit: 'Unidade Monetária (MUS)',
}

const CONFIDENCE_LEVELS = [
  { label: '90%', value: 90 },
  { label: '95%', value: 95 },
  { label: '99%', value: 99 },
]

function calculateSampleSize(confidence: number, ter: number, populationSize: number, expectedErrorRate: number = 0): number {
  if (ter <= 0 || ter >= 100 || populationSize <= 0) return 0
  if (expectedErrorRate >= ter) return populationSize
  const adjustedTer = ter - expectedErrorRate
  const raw = Math.ceil(Math.log(1 - confidence / 100) / Math.log(1 - adjustedTer / 100))
  const adjusted = Math.ceil(raw / (1 + (raw - 1) / populationSize))
  return Math.min(adjusted, populationSize)
}

function buildComparisonTable(populationSize: number, expectedErrorRate: number) {
  const tiers = [90, 95, 99]
  const ters = [1, 2, 3, 5, 10]
  return tiers.map(conf => ({
    confidence: conf,
    sizes: ters.map(ter => ({
      ter,
      size: calculateSampleSize(conf, ter, populationSize, expectedErrorRate),
    })),
  }))
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function generateRandomIndices(populationSize: number, sampleSize: number, seed: number): number[] {
  const rng = seededRandom(seed)
  const indices = new Set<number>()
  let attempts = 0
  while (indices.size < Math.min(sampleSize, populationSize) && attempts < sampleSize * 10) {
    indices.add(Math.floor(rng() * populationSize) + 1)
    attempts++
  }
  return Array.from(indices).sort((a, b) => a - b)
}

export default function SamplesPanel({ auditId, pillarId }: Props) {
  const { getCurrentAudit, updateSample, addSample } = useAuditStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newItemRef, setNewItemRef] = useState('')
  const [newItemDesc, setNewItemDesc] = useState('')

  const [calcOpen, setCalcOpen] = useState(false)
  const [calcPopulation, setCalcPopulation] = useState(1000)
  const [calcConfidence, setCalcConfidence] = useState(95)
  const [calcTER, setCalcTER] = useState(5)
  const [calcExpectedRate, setCalcExpectedRate] = useState(0)
  const [calcShowTable, setCalcShowTable] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [formDesc, setFormDesc] = useState('')
  const [formPopDesc, setFormPopDesc] = useState('')
  const [formPopSize, setFormPopSize] = useState(0)
  const [formMethod, setFormMethod] = useState<Sample['selectionMethod']>('random')
  const [formSampleSize, setFormSampleSize] = useState(0)
  const [formSubAreaId, setFormSubAreaId] = useState('')
  const [formTestProcId, setFormTestProcId] = useState('')

  const [randomSeed, setRandomSeed] = useState(() => Math.floor(Math.random() * 100000))
  const [randomColumn, setRandomColumn] = useState('')
  const [randomResults, setRandomResults] = useState<number[]>([])

  const [bulkCsvText, setBulkCsvText] = useState('')
  const [bulkTarget, setBulkTarget] = useState<string | null>(null)

  const csvInputRef = useRef<HTMLInputElement>(null)

  const audit = getCurrentAudit()
  const pillar = audit?.pillars.find(p => p.id === pillarId)
  const samples = audit?.samples.filter(s => s.pillarId === pillarId) || []
  const datasets = audit?.datasets.filter(d => d.pillarId === pillarId) || []

  const calcSampleSize = useMemo(
    () => calculateSampleSize(calcConfidence, calcTER, calcPopulation, calcExpectedRate),
    [calcConfidence, calcTER, calcPopulation, calcExpectedRate]
  )

  const comparisonTable = useMemo(
    () => buildComparisonTable(calcPopulation, calcExpectedRate),
    [calcPopulation, calcExpectedRate]
  )

  const stats = useMemo(() => {
    const total = samples.length
    const tested = samples.filter(s => s.status === 'tested').length
    const withExceptions = samples.filter(s => (s.exceptionRate ?? 0) > 0).length
    const rates = samples.filter(s => s.exceptionRate !== undefined).map(s => s.exceptionRate!)
    const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0
    return { total, tested, withExceptions, avgRate }
  }, [samples])

  const subAreas = pillar?.subAreas || []
  const testProcedures = subAreas.flatMap(sa => sa.testProcedures.map(tp => ({ ...tp, subAreaId: sa.id, subAreaName: sa.name })))

  const addSampleItem = useCallback((sampleId: string) => {
    if (!newItemRef.trim()) return
    const sample = samples.find(s => s.id === sampleId)
    if (!sample) return

    const newItem: SampleItem = {
      id: generateId(),
      reference: newItemRef,
      description: newItemDesc,
      result: 'not_tested',
    }

    updateSample(auditId, sampleId, {
      items: [...sample.items, newItem],
    })
    setNewItemRef('')
    setNewItemDesc('')
  }, [newItemRef, newItemDesc, samples, updateSample, auditId])

  const updateItemResult = useCallback((sampleId: string, itemId: string, result: TestResult, exception?: string) => {
    const sample = samples.find(s => s.id === sampleId)
    if (!sample) return

    const updatedItems = sample.items.map(item =>
      item.id === itemId ? { ...item, result, exception } : item
    )

    const testedItems = updatedItems.filter(i => i.result !== 'not_tested')
    const exceptions = updatedItems.filter(i => i.result === 'fail')
    const exceptionRate = testedItems.length > 0 ? (exceptions.length / testedItems.length) * 100 : 0
    const allTested = updatedItems.length > 0 && updatedItems.every(i => i.result !== 'not_tested')

    updateSample(auditId, sampleId, {
      items: updatedItems,
      exceptionRate,
      status: exceptions.length > 0 ? 'exception_found' : allTested ? 'tested' : 'testing',
    })
  }, [samples, updateSample, auditId])

  const handleCreateSample = () => {
    if (!formDesc.trim() || formPopSize <= 0 || formSampleSize <= 0) return

    const newSample: Omit<Sample, 'id'> = {
      pillarId,
      subAreaId: formSubAreaId,
      testProcedureId: formTestProcId,
      description: formDesc,
      population: formPopDesc,
      populationSize: formPopSize,
      sampleSize: formSampleSize,
      selectionMethod: formMethod,
      items: [],
      status: 'selected',
    }

    if (formMethod === 'random' && randomResults.length > 0) {
      const dataset = datasets.find(() => true)
      newSample.items = randomResults.map(idx => {
        const row = dataset?.rows[idx - 1]
        const ref = randomColumn && row ? row[randomColumn] : `Item #${idx}`
        return {
          id: generateId(),
          reference: ref || `Item #${idx}`,
          description: `Selecionado aleatoriamente (índice ${idx})`,
          result: 'not_tested' as TestResult,
        }
      })
    }

    addSample(auditId, newSample)
    setFormOpen(false)
    setFormDesc('')
    setFormPopDesc('')
    setFormPopSize(0)
    setFormSampleSize(0)
    setFormMethod('random')
    setFormSubAreaId('')
    setFormTestProcId('')
    setRandomResults([])
    setRandomColumn('')
  }

  const handleApplyCalcToForm = () => {
    setFormPopSize(calcPopulation)
    setFormSampleSize(calcSampleSize)
    setFormOpen(true)
  }

  const handleGenerateRandom = () => {
    if (formPopSize > 0 && formSampleSize > 0) {
      setRandomResults(generateRandomIndices(formPopSize, formSampleSize, randomSeed))
    }
  }

  const handleBulkAdd = (sampleId: string) => {
    const sample = samples.find(s => s.id === sampleId)
    if (!sample || !bulkCsvText.trim()) return

    const lines = bulkCsvText.split('\n').filter(l => l.trim())
    const newItems: SampleItem[] = lines.map(line => {
      const parts = line.split(/[,;\t]/).map(p => p.trim())
      return {
        id: generateId(),
        reference: parts[0] || '',
        description: parts[1] || '',
        result: 'not_tested' as TestResult,
      }
    })

    updateSample(auditId, sampleId, {
      items: [...sample.items, ...newItems],
    })
    setBulkCsvText('')
    setBulkTarget(null)
  }

  const handleConclusionSave = (sampleId: string, conclusion: string) => {
    updateSample(auditId, sampleId, { conclusion })
  }

  const linkedProcedure = (tpId: string) => {
    for (const sa of subAreas) {
      const tp = sa.testProcedures.find(t => t.id === tpId)
      if (tp) return tp
    }
    return null
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--ln-1)]">
        <h3 className="text-sm font-semibold text-slate-200">Amostragem</h3>
        <p className="text-[11px] text-slate-500">{samples.length} amostras selecionadas</p>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-3">
        {stats.total > 0 && (
          <div className="grid grid-cols-4 gap-2">
            <div className="stat-card text-center py-2 px-1">
              <p className="text-lg font-bold text-slate-200">{stats.total}</p>
              <p className="text-[10px] text-slate-500">Total</p>
            </div>
            <div className="stat-card text-center py-2 px-1">
              <p className="text-lg font-bold text-green-400">{stats.tested}</p>
              <p className="text-[10px] text-slate-500">Testadas</p>
            </div>
            <div className="stat-card text-center py-2 px-1">
              <p className="text-lg font-bold text-red-400">{stats.withExceptions}</p>
              <p className="text-[10px] text-slate-500">Com Exceções</p>
            </div>
            <div className="stat-card text-center py-2 px-1">
              <p className="text-lg font-bold text-amber-400">{stats.avgRate.toFixed(1)}%</p>
              <p className="text-[10px] text-slate-500">Taxa Média</p>
            </div>
          </div>
        )}

        <div className="glass-panel overflow-hidden">
          <button
            onClick={() => setCalcOpen(!calcOpen)}
            className="w-full flex items-center gap-2 p-3 text-left hover:bg-slate-800/30 transition-all"
          >
            {calcOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
            <Hash size={14} className="text-cyan-400" />
            <span className="text-xs font-medium text-slate-200">Calculadora de Tamanho Amostral</span>
          </button>

          {calcOpen && (
            <div className="border-t border-[var(--ln-1)] p-3 space-y-3 bg-[var(--sf-2)]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Tamanho da População</label>
                  <input
                    type="number"
                    value={calcPopulation}
                    onChange={e => setCalcPopulation(Math.max(1, parseInt(e.target.value) || 0))}
                    className="input-field text-xs w-full"
                    min={1}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Nível de Confiança</label>
                  <select
                    value={calcConfidence}
                    onChange={e => setCalcConfidence(Number(e.target.value))}
                    className="select-field text-xs w-full"
                  >
                    {CONFIDENCE_LEVELS.map(cl => (
                      <option key={cl.value} value={cl.value}>{cl.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Taxa de Erro Tolerável (TER %)</label>
                  <input
                    type="number"
                    value={calcTER}
                    onChange={e => setCalcTER(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    className="input-field text-xs w-full"
                    min={1}
                    max={10}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Taxa de Erro Esperada (%)</label>
                  <input
                    type="number"
                    value={calcExpectedRate}
                    onChange={e => setCalcExpectedRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="input-field text-xs w-full"
                    min={0}
                    step={0.1}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <div>
                  <p className="text-[10px] text-cyan-400/80">Tamanho da Amostra Calculado</p>
                  <p className="text-lg font-bold text-cyan-400">{calcSampleSize}</p>
                </div>
                <button
                  onClick={handleApplyCalcToForm}
                  className="btn-primary text-[11px] px-3 py-1.5"
                >
                  Usar na Amostra
                </button>
              </div>

              <div className="text-[10px] text-slate-500 leading-relaxed">
                Fórmula: n = ⌈ln(1 − confiança) / ln(1 − TER)⌉, limitado ao tamanho da população.
              </div>

              <button
                onClick={() => setCalcShowTable(!calcShowTable)}
                className="btn-ghost text-[10px] flex items-center gap-1"
              >
                {calcShowTable ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                Tabela Comparativa
              </button>

              {calcShowTable && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-[var(--ln-1)]">
                        <th className="text-left py-1 px-1.5 text-slate-500">Confiança</th>
                        {[1, 2, 3, 5, 10].map(ter => (
                          <th key={ter} className="text-center py-1 px-1.5 text-slate-500">TER {ter}%</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonTable.map(row => (
                        <tr key={row.confidence} className="border-b border-[var(--ln-1)]/50">
                          <td className="py-1 px-1.5 text-slate-400">{row.confidence}%</td>
                          {row.sizes.map(cell => (
                            <td
                              key={cell.ter}
                              className={cn(
                                'text-center py-1 px-1.5',
                                cell.ter === calcTER && row.confidence === calcConfidence
                                  ? 'text-cyan-400 font-bold bg-cyan-500/10'
                                  : 'text-slate-400'
                              )}
                            >
                              {cell.size}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass-panel overflow-hidden">
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="w-full flex items-center gap-2 p-3 text-left hover:bg-slate-800/30 transition-all"
          >
            {formOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
            <Plus size={14} className="text-emerald-400" />
            <span className="text-xs font-medium text-slate-200">Criar Nova Amostra</span>
          </button>

          {formOpen && (
            <div className="border-t border-[var(--ln-1)] p-3 space-y-3 bg-[var(--sf-2)]">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Descrição da Amostra</label>
                <input
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Ex: Dossiês de clientes PEP"
                  className="input-field text-xs w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Descrição da População</label>
                  <input
                    value={formPopDesc}
                    onChange={e => setFormPopDesc(e.target.value)}
                    placeholder="Ex: Total de clientes PEP ativos"
                    className="input-field text-xs w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Tamanho da População</label>
                  <input
                    type="number"
                    value={formPopSize || ''}
                    onChange={e => setFormPopSize(parseInt(e.target.value) || 0)}
                    className="input-field text-xs w-full"
                    min={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Método de Seleção</label>
                  <select
                    value={formMethod}
                    onChange={e => setFormMethod(e.target.value as Sample['selectionMethod'])}
                    className="select-field text-xs w-full"
                  >
                    <option value="random">Aleatória</option>
                    <option value="stratified">Estratificada</option>
                    <option value="judgmental">Julgamental</option>
                    <option value="monetary_unit">Unidade Monetária (MUS)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Tamanho da Amostra</label>
                  <input
                    type="number"
                    value={formSampleSize || ''}
                    onChange={e => setFormSampleSize(parseInt(e.target.value) || 0)}
                    className="input-field text-xs w-full"
                    min={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Sub-área</label>
                  <select
                    value={formSubAreaId}
                    onChange={e => setFormSubAreaId(e.target.value)}
                    className="select-field text-xs w-full"
                  >
                    <option value="">Selecione...</option>
                    {subAreas.map(sa => (
                      <option key={sa.id} value={sa.id}>{sa.code} – {sa.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Procedimento de Teste</label>
                  <select
                    value={formTestProcId}
                    onChange={e => setFormTestProcId(e.target.value)}
                    className="select-field text-xs w-full"
                  >
                    <option value="">Selecione...</option>
                    {testProcedures.map(tp => (
                      <option key={tp.id} value={tp.id}>{tp.code} – {tp.description.substring(0, 50)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formMethod === 'random' && datasets.length > 0 && formPopSize > 0 && formSampleSize > 0 && (
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-2">
                  <p className="text-[10px] font-medium text-blue-400">Seleção Aleatória</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Coluna Identificadora</label>
                      <select
                        value={randomColumn}
                        onChange={e => setRandomColumn(e.target.value)}
                        className="select-field text-[10px] w-full"
                      >
                        <option value="">Índice numérico</option>
                        {datasets[0]?.headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Semente (seed)</label>
                      <input
                        type="number"
                        value={randomSeed}
                        onChange={e => setRandomSeed(parseInt(e.target.value) || 0)}
                        className="input-field text-[10px] w-full"
                      />
                    </div>
                  </div>
                  <button onClick={handleGenerateRandom} className="btn-secondary text-[10px] w-full py-1.5">
                    Gerar Seleção ({formSampleSize} itens)
                  </button>
                  {randomResults.length > 0 && (
                    <div className="max-h-24 overflow-y-auto scroll-thin text-[10px] text-slate-400 p-1 bg-slate-900/50 rounded">
                      Índices: {randomResults.join(', ')}
                    </div>
                  )}
                </div>
              )}

              <button onClick={handleCreateSample} className="btn-primary text-xs w-full py-2">
                <Plus size={12} className="mr-1" /> Criar Amostra
              </button>
            </div>
          )}
        </div>

        {samples.map(sample => {
          const isExpanded = expandedId === sample.id
          const testedCount = sample.items.filter(i => i.result !== 'not_tested').length
          const exceptionsCount = sample.items.filter(i => i.result === 'fail').length
          const proc = linkedProcedure(sample.testProcedureId)
          const projectedExceptions = sample.exceptionRate !== undefined && sample.exceptionRate > 0
            ? Math.round((sample.exceptionRate / 100) * sample.populationSize)
            : 0

          return (
            <div key={sample.id} className="glass-panel overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : sample.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-800/30 transition-all"
              >
                {isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                <Target size={16} className="text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{sample.description}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Hash size={10} /> {sample.items.length}/{sample.sampleSize}
                    </span>
                    <span className="text-[11px] text-slate-400">{METHOD_LABELS[sample.selectionMethod]}</span>
                    {proc && (
                      <span className="text-[11px] text-blue-400/70 flex items-center gap-1">
                        <FileText size={10} /> {proc.code}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Percent size={10} />
                      {sample.exceptionRate !== undefined ? `${sample.exceptionRate.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </div>
                <div className={cn(
                  'severity-badge text-[10px] flex-shrink-0',
                  sample.status === 'tested' ? 'severity-low' :
                  sample.status === 'exception_found' ? 'severity-critical' :
                  sample.status === 'testing' ? 'severity-medium' : 'severity-high'
                )}>
                  {sample.status === 'tested' ? 'Testada' :
                   sample.status === 'exception_found' ? 'Exceção' :
                   sample.status === 'testing' ? 'Em Teste' : 'Selecionada'}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[var(--ln-1)]">
                  <div className="p-3 bg-[var(--sf-2)]">
                    <div className="grid grid-cols-3 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-500">População:</span>
                        <p className="text-slate-300">{sample.population}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Tamanho Pop.:</span>
                        <p className="text-slate-300">{sample.populationSize.toLocaleString('pt-BR')}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Tamanho Amostra:</span>
                        <p className="text-slate-300">{sample.sampleSize}</p>
                      </div>
                    </div>
                    {proc && (
                      <div className="mt-2 text-[11px]">
                        <span className="text-slate-500">Procedimento:</span>
                        <p className="text-blue-400">{proc.code} – {proc.description}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-[11px]">
                      <span className="text-green-400">{testedCount} testados</span>
                      <span className="text-red-400">{exceptionsCount} exceções</span>
                      <span className="text-slate-500">{sample.items.length - testedCount} pendentes</span>
                    </div>
                  </div>

                  {exceptionsCount > 0 && sample.exceptionRate !== undefined && (
                    <div className="p-3 bg-red-500/5 border-t border-[var(--ln-1)]">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="text-[11px] space-y-1">
                          <p className="text-red-400 font-medium">Projeção de Exceções</p>
                          <p className="text-slate-300">
                            {exceptionsCount} exceções em {testedCount} itens = <span className="text-red-400 font-bold">{sample.exceptionRate.toFixed(1)}%</span> taxa de exceção
                          </p>
                          <p className="text-slate-400">
                            Impacto projetado na população: {sample.exceptionRate.toFixed(1)}% de {sample.populationSize.toLocaleString('pt-BR')} ≈{' '}
                            <span className="text-red-400 font-bold">{projectedExceptions.toLocaleString('pt-BR')} itens afetados</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="divide-y divide-[var(--ln-1)]">
                    {sample.items.map(item => (
                      <div key={item.id} className="p-3 flex items-center gap-3">
                        {item.result === 'pass' ? (
                          <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                        ) : item.result === 'fail' ? (
                          <X size={14} className="text-red-400 flex-shrink-0" />
                        ) : item.result === 'partial' ? (
                          <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300 truncate">{item.reference}</p>
                          {item.description && <p className="text-[10px] text-slate-500 truncate">{item.description}</p>}
                          {item.exception && <p className="text-[10px] text-red-400/70 mt-0.5">Exceção: {item.exception}</p>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => updateItemResult(sample.id, item.id, 'pass')} className="btn-ghost text-[9px] text-green-500 py-0.5 px-1.5">OK</button>
                          <button onClick={() => updateItemResult(sample.id, item.id, 'fail', 'Exceção identificada')} className="btn-ghost text-[9px] text-red-500 py-0.5 px-1.5">NOK</button>
                          <button onClick={() => updateItemResult(sample.id, item.id, 'partial')} className="btn-ghost text-[9px] text-yellow-500 py-0.5 px-1.5">Parcial</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 border-t border-[var(--ln-1)] space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={newItemRef}
                        onChange={e => setNewItemRef(e.target.value)}
                        placeholder="Referência (ex: Cliente #12345)"
                        className="input-field text-xs flex-1"
                        onKeyDown={e => e.key === 'Enter' && addSampleItem(sample.id)}
                      />
                      <input
                        value={newItemDesc}
                        onChange={e => setNewItemDesc(e.target.value)}
                        placeholder="Descrição"
                        className="input-field text-xs flex-1"
                        onKeyDown={e => e.key === 'Enter' && addSampleItem(sample.id)}
                      />
                      <button onClick={() => addSampleItem(sample.id)} className="btn-primary text-xs px-3">
                        <Plus size={12} />
                      </button>
                    </div>

                    {bulkTarget === sample.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={bulkCsvText}
                          onChange={e => setBulkCsvText(e.target.value)}
                          placeholder={'Colar dados CSV (referência, descrição)\nUma linha por item'}
                          className="textarea-field text-[10px] w-full h-20 resize-none"
                        />
                        <input
                          ref={csvInputRef}
                          type="file"
                          accept=".csv,.txt"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = ev => setBulkCsvText(ev.target?.result as string || '')
                            reader.readAsText(file)
                          }}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => csvInputRef.current?.click()} className="btn-ghost text-[10px] flex-1">
                            Importar CSV
                          </button>
                          <button onClick={() => handleBulkAdd(sample.id)} className="btn-primary text-[10px] flex-1">
                            Adicionar {bulkCsvText.split('\n').filter(l => l.trim()).length} Itens
                          </button>
                          <button onClick={() => { setBulkTarget(null); setBulkCsvText('') }} className="btn-ghost text-[10px]">
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setBulkTarget(sample.id)}
                        className="btn-ghost text-[10px] w-full"
                      >
                        <Plus size={10} className="mr-1" /> Importar itens em lote (CSV)
                      </button>
                    )}
                  </div>

                  <div className="p-3 border-t border-[var(--ln-1)] bg-blue-500/5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-semibold text-blue-400">Conclusão</p>
                      <button
                        onClick={() => {
                          const textarea = document.querySelector(`[data-conclusion="${sample.id}"]`) as HTMLTextAreaElement
                          if (textarea) handleConclusionSave(sample.id, textarea.value)
                        }}
                        className="btn-ghost text-[10px] text-blue-400 flex items-center gap-1"
                      >
                        <Save size={10} /> Salvar
                      </button>
                    </div>
                    <textarea
                      data-conclusion={sample.id}
                      defaultValue={sample.conclusion || ''}
                      placeholder="Registrar conclusão sobre esta amostra..."
                      className="textarea-field text-xs w-full h-16 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {samples.length === 0 && !formOpen && !calcOpen && (
          <div className="text-center py-12 max-w-xs mx-auto">
            <Target size={32} className="mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-300 font-medium mb-1">Nenhuma amostra selecionada</p>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Use a calculadora acima para determinar o tamanho amostral adequado, depois crie uma nova amostra para iniciar os testes.
            </p>
            <button onClick={() => setCalcOpen(true)} className="btn-secondary text-xs px-4 py-2">
              <Hash size={12} className="mr-1" /> Abrir Calculadora
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
