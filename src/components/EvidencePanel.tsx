'use client'

import { useState, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useDropzone } from 'react-dropzone'
import { useAuditStore } from '@/lib/store'
import { Evidence, EvidenceStatus } from '@/lib/types'
import {
  Upload, FileText, Clock, CheckCircle, X, AlertTriangle, Eye,
  Search, Filter, Sparkles, Loader2, ChevronDown, ChevronRight, Play,
  ScanLine, Cpu, Zap,
} from './Icons'
import { showToast } from './Toast'
import { formatDate, cn } from '@/lib/utils'

interface Props {
  auditId: string
  pillarId: string
}

const STATUS_CONFIG: Record<EvidenceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  requested: { label: 'Solicitada', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20', icon: <Clock size={12} /> },
  received: { label: 'Recebida', color: 'text-blue-400 bg-blue-400/10 border-blue-500/20', icon: <FileText size={12} /> },
  under_review: { label: 'Em Análise', color: 'text-purple-400 bg-purple-400/10 border-purple-500/20', icon: <Eye size={12} /> },
  accepted: { label: 'Aceita', color: 'text-green-400 bg-green-400/10 border-green-500/20', icon: <CheckCircle size={12} /> },
  rejected: { label: 'Rejeitada', color: 'text-red-400 bg-red-400/10 border-red-500/20', icon: <X size={12} /> },
  pending_clarification: { label: 'Pendente Esclarecimento', color: 'text-orange-400 bg-orange-400/10 border-orange-500/20', icon: <AlertTriangle size={12} /> },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface UploadingFile {
  name: string
  progress: number
  status: 'uploading' | 'analyzing' | 'done' | 'error'
  error?: string
}

export default function EvidencePanel({ auditId, pillarId }: Props) {
  const {
    getCurrentAudit,
    updateEvidenceStatus,
    addEvidence,
    updateEvidenceAiAnalysis,
    updateEvidenceFile,
    linkEvidenceToTest,
    updateTestResult,
    updatePillarCompletion,
    updateTestWorkpaper,
    addFinding,
    addMessage,
  } = useAuditStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EvidenceStatus | 'all'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEvName, setNewEvName] = useState('')
  const [newEvDesc, setNewEvDesc] = useState('')
  const [newEvType, setNewEvType] = useState<Evidence['type']>('other')
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, UploadingFile>>({})
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set())
  const [expandedAnalysis, setExpandedAnalysis] = useState<Set<string>>(new Set())
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [matchedProceduresMap, setMatchedProceduresMap] = useState<Record<string, { code: string; confidence: 'high' | 'medium' | 'low'; reason: string }[]>>({})
  const [autoTestingIds, setAutoTestingIds] = useState<Set<string>>(new Set())
  const [ocrMode, setOcrMode] = useState<'llm' | 'dedicated'>('llm')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const audit = getCurrentAudit()
  const pillar = audit?.pillars.find(p => p.id === pillarId)
  const evidence = audit?.evidence.filter(e => e.pillarId === pillarId) || []

  const testProcedures = pillar?.subAreas.flatMap(sa =>
    sa.testProcedures.map(tp => ({ ...tp, subAreaName: sa.name }))
  ) || []

  const filtered = evidence.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || e.status === statusFilter
    return matchSearch && matchStatus
  })

  const uploadAndAnalyze = useCallback(async (file: File, evidenceId?: string) => {
    const fileKey = `${Date.now()}-${file.name}`

    setUploadingFiles(prev => ({
      ...prev,
      [fileKey]: { name: file.name, progress: 30, status: 'uploading' },
    }))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('ocrMode', ocrMode)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Falha no upload')
      }

      const uploadData = await uploadRes.json()
      setUploadingFiles(prev => ({
        ...prev,
        [fileKey]: { ...prev[fileKey], progress: 60, status: 'uploading' },
      }))

      let targetId = evidenceId
      if (!targetId) {
        addEvidence(auditId, {
          pillarId,
          name: file.name,
          description: `Arquivo enviado: ${file.name}`,
          type: inferEvidenceType(file.name),
          status: 'received',
          fileName: uploadData.fileName,
          fileSize: uploadData.fileSize,
          uploadPath: uploadData.uploadPath,
          textPreview: uploadData.textContent?.slice(0, 500) || '',
          uploadedAt: new Date().toISOString(),
        })

        const updatedAudit = useAuditStore.getState().getCurrentAudit()
        const newEv = updatedAudit?.evidence.filter(e => e.pillarId === pillarId).slice(-1)[0]
        targetId = newEv?.id
      } else {
        updateEvidenceFile(auditId, targetId, {
          fileName: uploadData.fileName,
          fileSize: uploadData.fileSize,
          uploadPath: uploadData.uploadPath,
          textPreview: uploadData.textContent?.slice(0, 500) || '',
        })
        updateEvidenceStatus(auditId, targetId, 'received')
      }

      setUploadingFiles(prev => ({
        ...prev,
        [fileKey]: { ...prev[fileKey], progress: 70, status: 'analyzing' },
      }))

      const hasContent = uploadData.textContent && !uploadData.textContent.startsWith('[Formato não suportado')
      const hasImage = !!uploadData.imageBase64
      if (targetId && (hasContent || hasImage)) {
        const tpPayload = testProcedures.map(tp => ({ id: tp.id, code: tp.code, description: tp.description }))
        const analyzeRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textContent: uploadData.textContent,
            evidenceName: file.name,
            pillarContext: pillar ? `${pillar.name}: ${pillar.description}` : undefined,
            imageBase64: uploadData.imageBase64,
            uploadPath: uploadData.uploadPath,
            testProcedures: tpPayload,
          }),
        })

        if (analyzeRes.ok) {
          const analyzeData = await analyzeRes.json()
          updateEvidenceAiAnalysis(auditId, targetId, analyzeData.analysis)

          const matchedCodes: string[] = []
          if (analyzeData.matchedProcedures?.length > 0) {
            setMatchedProceduresMap(prev => ({ ...prev, [targetId!]: analyzeData.matchedProcedures }))

            for (const match of analyzeData.matchedProcedures) {
              if (match.confidence === 'high' || match.confidence === 'medium') {
                const tp = testProcedures.find(t => t.code === match.code)
                if (tp) {
                  linkEvidenceToTest(auditId, targetId!, tp.id)
                  matchedCodes.push(match.code)
                }
              }
            }
          }

          const analysisSummary = analyzeData.analysis?.slice(0, 500) || ''
          const matchInfo = matchedCodes.length > 0 ? `\nProcedimentos vinculados: ${matchedCodes.join(', ')}` : ''
          addMessage(auditId, pillarId, {
            role: 'user',
            content: `[EVIDÊNCIA RECEBIDA E ANALISADA] Documento: "${file.name}"\n\nResumo da análise IA:\n${analysisSummary}${matchInfo}\n\nPor favor, avalie esta evidência, execute os testes dos procedimentos vinculados, e solicite as evidências complementares necessárias.`,
          })
        }
      }

      setUploadingFiles(prev => ({
        ...prev,
        [fileKey]: { ...prev[fileKey], progress: 100, status: 'done' },
      }))

      setTimeout(() => {
        setUploadingFiles(prev => {
          const next = { ...prev }
          delete next[fileKey]
          return next
        })
      }, 2000)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido'
      setUploadingFiles(prev => ({
        ...prev,
        [fileKey]: { ...prev[fileKey], progress: 0, status: 'error', error: msg },
      }))
    }
  }, [auditId, pillarId, pillar, addEvidence, updateEvidenceFile, updateEvidenceStatus, updateEvidenceAiAnalysis, linkEvidenceToTest, testProcedures, ocrMode])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => uploadAndAnalyze(file))
  }, [uploadAndAnalyze])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false,
  })

  const handleAddEvidence = () => {
    if (!newEvName.trim()) return
    addEvidence(auditId, {
      pillarId,
      name: newEvName,
      description: newEvDesc,
      type: newEvType,
      status: 'requested',
    })
    setNewEvName('')
    setNewEvDesc('')
    setShowAddForm(false)
  }

  const handleAnalyzeExisting = async (ev: Evidence) => {
    if (!ev.textPreview && !ev.uploadPath) return
    setAnalyzingIds(prev => new Set(prev).add(ev.id))

    try {
      const tpPayload = testProcedures.map(tp => ({ id: tp.id, code: tp.code, description: tp.description }))
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textContent: ev.textPreview || '',
          evidenceName: ev.name,
          pillarContext: pillar ? `${pillar.name}: ${pillar.description}` : undefined,
          uploadPath: ev.uploadPath,
          testProcedures: tpPayload,
        }),
      })

      if (analyzeRes.ok) {
        const data = await analyzeRes.json()
        updateEvidenceAiAnalysis(auditId, ev.id, data.analysis)

        if (data.matchedProcedures?.length > 0) {
          setMatchedProceduresMap(prev => ({ ...prev, [ev.id]: data.matchedProcedures }))

          for (const match of data.matchedProcedures) {
            if (match.confidence === 'high' || match.confidence === 'medium') {
              const tp = testProcedures.find(t => t.code === match.code)
              if (tp) {
                linkEvidenceToTest(auditId, ev.id, tp.id)
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Analysis error:', err)
    } finally {
      setAnalyzingIds(prev => {
        const next = new Set(prev)
        next.delete(ev.id)
        return next
      })
    }
  }

  const runAutoTest = useCallback(async (testProcedureId: string) => {
    const currentAudit = getCurrentAudit()
    if (!currentAudit) return
    setAutoTestingIds(prev => new Set(prev).add(testProcedureId))

    try {
      let targetTp: { id: string; code: string; description: string; methodology: string } | null = null
      let targetSaId = ''
      for (const sa of (pillar?.subAreas || [])) {
        const found = sa.testProcedures.find(t => t.id === testProcedureId)
        if (found) { targetTp = found; targetSaId = sa.id; break }
      }
      if (!targetTp) return

      const linkedEvidence = currentAudit.evidence.filter(e =>
        e.pillarId === pillarId && (e.linkedTestProcedureIds || []).includes(testProcedureId)
      )

      const res = await fetch('/api/test-procedure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testProcedure: { code: targetTp.code, description: targetTp.description, methodology: targetTp.methodology },
          evidenceSummaries: linkedEvidence.map(e => ({ name: e.name, analysis: e.aiAnalysis || e.textPreview || '' })),
          pillarContext: pillar ? `${pillar.name}: ${pillar.description}` : '',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const result = data.overallResult || 'partial'
        updateTestResult(auditId, pillarId, targetSaId, testProcedureId, result, data.observations || '')
        if (data.conclusion) {
          updateTestWorkpaper(auditId, pillarId, targetSaId, testProcedureId, { conclusion: data.conclusion })
        }
        updatePillarCompletion(auditId, pillarId)

        showToast({
          type: result === 'pass' ? 'success' : result === 'fail' ? 'warning' : 'info',
          title: `Teste ${targetTp.code}: ${result.toUpperCase()}`,
          description: (data.observations || '').slice(0, 100),
        })

        if (result === 'fail' || result === 'partial') {
          addFinding(auditId, {
            pillarId,
            title: `Deficiência identificada em ${targetTp.code}`,
            severity: result === 'fail' ? 'high' : 'medium',
            status: 'draft',
            condition: data.observations || '',
            criteria: targetTp.methodology,
            cause: 'Identificado via teste automatizado de auditoria',
            effect: 'Risco de não conformidade regulatória',
            recommendation: data.conclusion || 'Avaliar e implementar controles adequados',
            evidenceIds: linkedEvidence.map(e => e.id),
            testProcedureIds: [testProcedureId],
            regulatoryReference: [],
            isAiGenerated: true,
          })
          showToast({ type: 'warning', title: 'Achado auto-gerado', description: `Deficiência em ${targetTp.code} registrada como achado` })
        }
      }
    } catch (err) {
      console.error('Auto-test error:', err)
      showToast({ type: 'info', title: 'Erro no teste', description: 'Não foi possível executar o teste automático' })
    } finally {
      setAutoTestingIds(prev => {
        const next = new Set(prev)
        next.delete(testProcedureId)
        return next
      })
    }
  }, [auditId, pillarId, pillar, getCurrentAudit, updateTestResult, updateTestWorkpaper, updatePillarCompletion, addFinding])

  const handleUploadToEvidence = (ev: Evidence) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) uploadAndAnalyze(file, ev.id)
    }
    input.click()
  }

  const toggleAnalysis = (id: string) => {
    setExpandedAnalysis(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const statusCounts = {
    all: evidence.length,
    requested: evidence.filter(e => e.status === 'requested').length,
    received: evidence.filter(e => e.status === 'received').length,
    accepted: evidence.filter(e => e.status === 'accepted').length,
  }

  const uploadEntries = Object.entries(uploadingFiles)

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--ln-1)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Evidências</h3>
            <p className="text-[11px] text-slate-500">{evidence.length} itens registrados</p>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn-secondary text-xs py-1.5 px-3">
            + Solicitar
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['all', 'requested', 'received', 'accepted'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'text-[11px] px-2.5 py-1 rounded-full border transition-all',
                statusFilter === s ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'text-slate-400 border-slate-700 hover:border-slate-600'
              )}
            >
              {s === 'all' ? 'Todas' : STATUS_CONFIG[s].label} ({statusCounts[s]})
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar evidências..."
            className="input-field pl-9 text-xs"
          />
        </div>
      </div>

      {showAddForm && (
        <div className="p-4 border-b border-[var(--ln-1)] bg-[var(--sf-2)] space-y-3">
          <input value={newEvName} onChange={e => setNewEvName(e.target.value)} placeholder="Nome da evidência" className="input-field text-xs" />
          <textarea value={newEvDesc} onChange={e => setNewEvDesc(e.target.value)} placeholder="Descrição detalhada..." className="textarea-field text-xs" rows={2} />
          <div className="flex gap-2">
            <select value={newEvType} onChange={e => setNewEvType(e.target.value as Evidence['type'])} className="select-field text-xs flex-1">
              <option value="policy">Política</option>
              <option value="procedure">Procedimento</option>
              <option value="report">Relatório</option>
              <option value="system_screenshot">Screenshot de Sistema</option>
              <option value="training_material">Material de Treinamento</option>
              <option value="meeting_minutes">Ata de Reunião</option>
              <option value="data_extract">Extração de Dados</option>
              <option value="other">Outro</option>
            </select>
            <button onClick={handleAddEvidence} className="btn-primary text-xs">Adicionar</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-2">
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer mb-3',
            isDragActive
              ? 'border-blue-500/50 bg-blue-500/10 scale-[1.01]'
              : 'border-[var(--ln-1)] hover:border-slate-600 hover:bg-[var(--sf-2)]/50'
          )}
        >
          <input {...getInputProps()} />
          <Upload size={24} className={cn('mx-auto mb-2', isDragActive ? 'text-blue-400' : 'text-slate-500')} />
          <p className="text-xs text-slate-400 font-medium">
            {isDragActive ? 'Solte os arquivos aqui...' : 'Arraste arquivos aqui ou clique para upload'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">PDF, Imagens (PNG, JPG, GIF), CSV, Excel, TXT — tudo analisado por IA</p>
        </div>

        {/* OCR Mode Toggle */}
        <div className="flex items-center justify-center gap-1 mb-3">
          <span className="text-[10px] text-slate-500 mr-1.5">Leitura de imagens/PDFs escaneados:</span>
          <button
            onClick={() => setOcrMode('llm')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg text-[11px] font-medium border transition-all',
              ocrMode === 'llm'
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                : 'text-slate-400 border-[var(--ln-1)] hover:text-slate-300 hover:border-slate-600'
            )}
          >
            <Zap size={12} />
            LLM Vision
          </button>
          <button
            onClick={() => setOcrMode('dedicated')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-r-lg text-[11px] font-medium border border-l-0 transition-all',
              ocrMode === 'dedicated'
                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                : 'text-slate-400 border-[var(--ln-1)] hover:text-slate-300 hover:border-slate-600'
            )}
          >
            <ScanLine size={12} />
            OCR Dedicado
          </button>
        </div>

        {uploadEntries.length > 0 && (
          <div className="space-y-2 mb-3">
            {uploadEntries.map(([key, uf]) => (
              <div key={key} className="glass-panel p-3">
                <div className="flex items-center gap-2 mb-2">
                  {uf.status === 'error' ? (
                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                  ) : uf.status === 'done' ? (
                    <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                  ) : (
                    <Loader2 size={14} className="text-blue-400 flex-shrink-0 animate-spin" />
                  )}
                  <span className="text-xs text-slate-300 truncate flex-1">{uf.name}</span>
                  <span className="text-[10px] text-slate-500">
                    {uf.status === 'uploading' && 'Enviando...'}
                    {uf.status === 'analyzing' && (ocrMode === 'dedicated' ? 'OCR Tesseract + Análise...' : 'Analisando com IA Vision...')}
                    {uf.status === 'done' && 'Concluído'}
                    {uf.status === 'error' && 'Erro'}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-500',
                      uf.status === 'error' ? 'bg-red-500' : uf.status === 'done' ? 'bg-green-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${uf.progress}%` }}
                  />
                </div>
                {uf.error && <p className="text-[10px] text-red-400 mt-1">{uf.error}</p>}
              </div>
            ))}
          </div>
        )}

        {filtered.map(ev => {
          const statusConf = STATUS_CONFIG[ev.status]
          const isAnalyzing = analyzingIds.has(ev.id)
          const isAnalysisExpanded = expandedAnalysis.has(ev.id)
          const hasFile = !!ev.uploadPath || !!ev.fileName
          const canAnalyze = hasFile && !ev.aiAnalysis && !!ev.uploadPath

          return (
            <div key={ev.id} className="glass-panel-hover p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-slate-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-200 truncate">{ev.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{ev.description}</p>
                </div>
                <div className={cn('severity-badge', statusConf.color)}>
                  {statusConf.icon}
                  <span>{statusConf.label}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                <Clock size={10} />
                <span>Solicitada em {formatDate(ev.requestedAt)}</span>
                {ev.fileName && <span className="text-slate-400">| {ev.fileName}</span>}
                {ev.fileSize && ev.fileSize > 0 && (
                  <span className="text-slate-400">| {formatFileSize(ev.fileSize)}</span>
                )}
              </div>

              {ev.uploadPath && isImageFile(ev.fileName || ev.uploadPath) && (
                <div className="mt-1 rounded-md overflow-hidden border border-[var(--ln-1)] max-w-[200px]">
                  <img src={`/api/files/${ev.uploadPath.replace('uploads/', '')}`} alt={ev.name} className="w-full h-auto" />
                </div>
              )}

              {(ev.linkedTestProcedureIds?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {ev.linkedTestProcedureIds!.map(tpId => {
                    const tp = testProcedures.find(t => t.id === tpId)
                    return tp ? (
                      <span key={tpId} className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">
                        {tp.code}
                      </span>
                    ) : null
                  })}
                </div>
              )}

              {ev.status === 'requested' && !hasFile && (
                <button
                  onClick={() => handleUploadToEvidence(ev)}
                  className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                >
                  <Upload size={11} />
                  Enviar Arquivo
                </button>
              )}

              {ev.status === 'requested' && (
                <div className="flex gap-1.5">
                  <button onClick={() => updateEvidenceStatus(auditId, ev.id, 'received')} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all">
                    <CheckCircle size={11} /> Marcar como Recebida
                  </button>
                </div>
              )}

              {ev.status === 'received' && (
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => updateEvidenceStatus(auditId, ev.id, 'accepted')} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all">Aceitar</button>
                  <button onClick={() => updateEvidenceStatus(auditId, ev.id, 'rejected')} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">Rejeitar</button>
                  <button onClick={() => updateEvidenceStatus(auditId, ev.id, 'pending_clarification')} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-all">Pedir Esclarecimento</button>
                </div>
              )}

              {canAnalyze && (
                <button
                  onClick={() => handleAnalyzeExisting(ev)}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Sparkles size={10} />
                  )}
                  {isAnalyzing ? 'Analisando...' : 'Analisar com IA'}
                </button>
              )}

              {isAnalyzing && !ev.aiAnalysis && (
                <div className="flex items-center gap-2 p-2 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                  <Loader2 size={12} className="animate-spin text-purple-400" />
                  <span className="text-[10px] text-purple-300">ARGUS está analisando o documento...</span>
                </div>
              )}

              {ev.aiAnalysis && (
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg overflow-hidden mt-1">
                  <button
                    onClick={() => toggleAnalysis(ev.id)}
                    className="w-full flex items-center gap-2 p-2.5 hover:bg-blue-500/5 transition-colors"
                  >
                    <Sparkles size={12} className="text-blue-400 flex-shrink-0" />
                    <span className="text-[11px] text-blue-400 font-semibold flex-1 text-left">Análise ARGUS</span>
                    {isAnalysisExpanded ? (
                      <ChevronDown size={12} className="text-blue-400" />
                    ) : (
                      <ChevronRight size={12} className="text-blue-400" />
                    )}
                  </button>
                  {isAnalysisExpanded && (
                    <div className="px-2.5 pb-2.5 border-t border-blue-500/10">
                      <div className="markdown-content text-[11px] text-slate-400 leading-relaxed mt-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {ev.aiAnalysis}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {!isAnalysisExpanded && (
                    <p className="text-[10px] text-slate-500 px-2.5 pb-2 line-clamp-2">
                      {ev.aiAnalysis.slice(0, 150)}...
                    </p>
                  )}
                </div>
              )}

              {matchedProceduresMap[ev.id]?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {matchedProceduresMap[ev.id].map(mp => {
                    const colorMap = {
                      high: 'bg-green-500/10 text-green-400 border-green-500/20',
                      medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                      low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                    }
                    return (
                      <span
                        key={mp.code}
                        title={mp.reason}
                        className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border', colorMap[mp.confidence])}
                      >
                        <CheckCircle size={8} />
                        {mp.code}
                        <span className="opacity-60">({mp.confidence === 'high' ? 'alta' : mp.confidence === 'medium' ? 'média' : 'baixa'})</span>
                      </span>
                    )
                  })}
                </div>
              )}

              {ev.aiAnalysis && (ev.linkedTestProcedureIds?.length ?? 0) > 0 && (() => {
                const untestedLinked = (ev.linkedTestProcedureIds || []).filter(tpId => {
                  const tp = testProcedures.find(t => t.id === tpId)
                  return tp && tp.result === 'not_tested'
                })
                if (untestedLinked.length === 0) return null
                return (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {untestedLinked.map(tpId => {
                      const tp = testProcedures.find(t => t.id === tpId)
                      if (!tp) return null
                      const isTesting = autoTestingIds.has(tpId)
                      return (
                        <button
                          key={tpId}
                          onClick={() => runAutoTest(tpId)}
                          disabled={isTesting}
                          className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                        >
                          {isTesting ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                          Testar {tp.code}
                        </button>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Link to test procedure */}
              <div className="pt-1">
                {linkingId === ev.id ? (
                  <div className="space-y-1.5">
                    <select
                      className="select-field text-[10px] w-full"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          linkEvidenceToTest(auditId, ev.id, e.target.value)
                          setLinkingId(null)
                        }
                      }}
                    >
                      <option value="" disabled>Vincular a procedimento de teste...</option>
                      {testProcedures.map(tp => (
                        <option key={tp.id} value={tp.id}>
                          {tp.code} - {tp.description.slice(0, 60)}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => setLinkingId(null)} className="btn-ghost text-[10px] text-slate-500">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  testProcedures.length > 0 && (
                    <button
                      onClick={() => setLinkingId(ev.id)}
                      className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      + Vincular a procedimento
                    </button>
                  )
                )}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && evidence.length > 0 && (
          <div className="text-center py-8">
            <Filter size={20} className="mx-auto text-slate-600 mb-2" />
            <p className="text-xs text-slate-500">Nenhuma evidência corresponde aos filtros</p>
          </div>
        )}

        {evidence.length === 0 && (
          <div className="text-center py-12 max-w-xs mx-auto">
            <FileText size={32} className="mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-300 font-medium mb-1">Nenhuma evidência registrada</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Arraste documentos na área acima ou use o chat para que o ARGUS solicite as evidências necessárias automaticamente.
            </p>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" className="hidden" />
    </div>
  )
}

function isImageFile(name: string): boolean {
  const ext = name.toLowerCase().split('.').pop() || ''
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)
}

function inferEvidenceType(fileName: string): Evidence['type'] {
  const ext = fileName.toLowerCase().split('.').pop() || ''
  if (['pdf'].includes(ext)) return 'policy'
  if (['csv', 'xlsx', 'xls'].includes(ext)) return 'data_extract'
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(ext)) return 'system_screenshot'
  if (['doc', 'docx', 'txt', 'md'].includes(ext)) return 'report'
  return 'other'
}
