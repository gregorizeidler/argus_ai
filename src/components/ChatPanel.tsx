'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuditStore } from '@/lib/store'
import { buildSystemPrompt, buildPillarContext } from '@/lib/prompts'
import { Pillar, Evidence, Severity, Rating } from '@/lib/types'
import {
  Send, Sparkles, Loader2, Eye, AlertTriangle,
  FileText, Target, ClipboardList, CheckCircle, Search, Activity, Play,
} from './Icons'
import { showToast } from './Toast'

interface Props {
  auditId: string
  pillar: Pillar
}

interface ActionBadge {
  id: string
  label: string
  icon: 'evidence' | 'finding' | 'rating' | 'sample'
}

const ACTION_LABELS: Record<string, { label: string; icon: ActionBadge['icon'] }> = {
  request_evidence: { label: 'Evidência solicitada', icon: 'evidence' },
  create_finding: { label: 'Achado registrado', icon: 'finding' },
  rate_pillar: { label: 'Pilar avaliado', icon: 'rating' },
  request_sample: { label: 'Amostra solicitada', icon: 'sample' },
  run_test_procedure: { label: 'Teste executado', icon: 'rating' },
  link_evidence: { label: 'Evidência vinculada', icon: 'evidence' },
  update_sub_area_rating: { label: 'Sub-área avaliada', icon: 'rating' },
  update_evidence_status: { label: 'Status de evidência atualizado', icon: 'evidence' },
  update_audit_phase: { label: 'Fase da auditoria atualizada', icon: 'rating' },
  record_management_response: { label: 'Resposta da gestão registrada', icon: 'finding' },
}

const BADGE_ICONS: Record<ActionBadge['icon'], typeof FileText> = {
  evidence: FileText,
  finding: AlertTriangle,
  rating: Target,
  sample: ClipboardList,
}

export default function ChatPanel({ auditId, pillar }: Props) {
  const [input, setInput] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const [actionBadges, setActionBadges] = useState<ActionBadge[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const {
    getCurrentAudit,
    getConversation,
    addMessage,
    addEvidence,
    addFinding,
    addSample,
    updatePillarRating,
    updateSubAreaRating,
    updateTestResult,
    updatePillarCompletion,
    linkEvidenceToTest,
    isChatLoading,
    setIsChatLoading,
  } = useAuditStore()

  const audit = getCurrentAudit()
  const conversation = getConversation(auditId, pillar.id)
  const messages = conversation?.messages || []

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages.length, streamingContent, scrollToBottom])

  const autoGrowTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [])

  useEffect(() => {
    autoGrowTextarea()
  }, [input, autoGrowTextarea])

  const lastProcessedRef = useRef<string | null>(null)

  useEffect(() => {
    if (isChatLoading || messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (
      lastMsg.role === 'user' &&
      lastMsg.content.startsWith('[EVIDÊNCIA RECEBIDA') &&
      lastMsg.id !== lastProcessedRef.current
    ) {
      lastProcessedRef.current = lastMsg.id
      const timer = setTimeout(() => {
        triggerAIResponse(lastMsg.content)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [messages, isChatLoading])

  const processFunctionCall = useCallback(
    (name: string, args: Record<string, unknown>) => {
      const meta = ACTION_LABELS[name]
      if (meta) {
        setActionBadges(prev => [
          ...prev,
          { id: `${Date.now()}-${Math.random()}`, label: meta.label, icon: meta.icon },
        ])
      }

      switch (name) {
        case 'request_evidence':
          addEvidence(auditId, {
            pillarId: pillar.id,
            name: args.name as string,
            description: args.description as string,
            type: (args.type as Evidence['type']) || 'other',
            status: 'requested',
          })
          showToast({ type: 'ai_action', title: 'Evidência solicitada', description: args.name as string })
          break
        case 'create_finding':
          addFinding(auditId, {
            pillarId: pillar.id,
            title: args.title as string,
            severity: args.severity as Severity,
            status: 'draft',
            condition: args.condition as string,
            criteria: args.criteria as string,
            cause: args.cause as string,
            effect: args.effect as string,
            recommendation: args.recommendation as string,
            regulatoryReference: (args.regulatoryReference as string[]) || [],
            isAiGenerated: true,
          })
          showToast({ type: 'warning', title: 'Achado registrado', description: `${(args.severity as string || 'medium').toUpperCase()} — ${args.title as string}` })
          break
        case 'rate_pillar':
          updatePillarRating(
            auditId,
            (args.pillarId as string) || pillar.id,
            args.rating as 'effective' | 'largely_effective' | 'partially_effective' | 'ineffective'
          )
          showToast({ type: 'success', title: 'Pilar avaliado', description: `Rating: ${args.rating as string}` })
          break
        case 'request_sample':
          addSample(auditId, {
            pillarId: pillar.id,
            subAreaId: '',
            testProcedureId: '',
            description: args.description as string,
            population: args.population as string,
            populationSize: (args.populationSize as number) || 0,
            sampleSize: (args.sampleSize as number) || 0,
            selectionMethod:
              (args.selectionMethod as 'random' | 'stratified' | 'judgmental' | 'monetary_unit') ||
              'judgmental',
            items: [],
            status: 'selected',
          })
          showToast({ type: 'info', title: 'Amostra solicitada', description: args.description as string })
          break

        case 'run_test_procedure': {
          const tpCode = args.testProcedureCode as string
          const result = args.result as 'pass' | 'fail' | 'partial' | 'not_applicable'
          const observations = args.observations as string
          const conclusion = args.conclusion as string | undefined
          const currentAudit = getCurrentAudit()
          if (currentAudit) {
            for (const p of currentAudit.pillars) {
              if (p.id !== pillar.id) continue
              for (const sa of p.subAreas) {
                const tp = sa.testProcedures.find(t => t.code === tpCode)
                if (tp) {
                  updateTestResult(auditId, pillar.id, sa.id, tp.id, result, observations)
                  if (conclusion) {
                    const { updateTestWorkpaper } = useAuditStore.getState()
                    updateTestWorkpaper(auditId, pillar.id, sa.id, tp.id, { conclusion })
                  }
                  updatePillarCompletion(auditId, pillar.id)
                  showToast({ type: result === 'pass' ? 'success' : result === 'fail' ? 'warning' : 'info', title: `Teste ${tpCode}: ${result}`, description: observations.slice(0, 80) })
                  break
                }
              }
            }
          }
          break
        }

        case 'link_evidence': {
          const evName = (args.evidenceName as string).toLowerCase()
          const tpCode = args.testProcedureCode as string
          const currentAudit = getCurrentAudit()
          if (currentAudit) {
            const ev = currentAudit.evidence.find(e =>
              e.pillarId === pillar.id && e.name.toLowerCase().includes(evName)
            )
            if (ev) {
              for (const p of currentAudit.pillars) {
                if (p.id !== pillar.id) continue
                for (const sa of p.subAreas) {
                  const tp = sa.testProcedures.find(t => t.code === tpCode)
                  if (tp) {
                    linkEvidenceToTest(auditId, ev.id, tp.id)
                    showToast({ type: 'success', title: 'Evidência vinculada', description: `${ev.name} → ${tpCode}` })
                    break
                  }
                }
              }
            }
          }
          break
        }

        case 'update_sub_area_rating': {
          const saCode = args.subAreaCode as string
          const rating = args.rating as Rating
          const currentAudit = getCurrentAudit()
          if (currentAudit) {
            for (const p of currentAudit.pillars) {
              if (p.id !== pillar.id) continue
              const sa = p.subAreas.find(s => s.code === saCode)
              if (sa) {
                updateSubAreaRating(auditId, pillar.id, sa.id, rating)
                showToast({ type: 'success', title: `Sub-área ${saCode} avaliada`, description: `Rating: ${rating}` })
                break
              }
            }
          }
          break
        }

        case 'update_evidence_status': {
          const evName = (args.evidenceName as string).toLowerCase()
          const newStatus = args.newStatus as 'accepted' | 'rejected' | 'pending_clarification'
          const reviewNotes = args.reviewNotes as string
          const currentAudit = getCurrentAudit()
          if (currentAudit) {
            const ev = currentAudit.evidence.find(e =>
              e.pillarId === pillar.id && e.name.toLowerCase().includes(evName)
            )
            if (ev) {
              const { updateEvidenceStatus } = useAuditStore.getState()
              updateEvidenceStatus(auditId, ev.id, newStatus, reviewNotes)
              const statusLabels = { accepted: 'Aceita', rejected: 'Rejeitada', pending_clarification: 'Esclarecimento' }
              showToast({
                type: newStatus === 'accepted' ? 'success' : newStatus === 'rejected' ? 'warning' : 'info',
                title: `Evidência ${statusLabels[newStatus]}`,
                description: ev.name
              })
            }
          }
          break
        }

        case 'update_audit_phase': {
          const targetPhase = args.targetPhase as 'fieldwork' | 'testing' | 'reporting' | 'completed'
          const { updateAuditPhase } = useAuditStore.getState()
          updateAuditPhase(auditId, targetPhase)
          const phaseLabels = { fieldwork: 'Trabalho de Campo', testing: 'Testes', reporting: 'Relatório', completed: 'Concluído' }
          showToast({ type: 'success', title: 'Fase atualizada', description: `Nova fase: ${phaseLabels[targetPhase]}` })
          break
        }

        case 'record_management_response': {
          const findTitle = (args.findingTitle as string).toLowerCase()
          const agreement = args.agreement as string
          const responseText = args.responseText as string
          const currentAudit = getCurrentAudit()
          if (currentAudit) {
            const finding = currentAudit.findings.find(f =>
              f.pillarId === pillar.id && f.title.toLowerCase().includes(findTitle)
            )
            if (finding) {
              const { updateFinding, updateFindingActionPlan } = useAuditStore.getState()
              updateFinding(auditId, finding.id, {
                managementResponse: responseText,
                managementAgreement: agreement as 'agree' | 'partially_agree' | 'disagree',
                status: 'management_response',
              })
              if (args.actionOwner || args.actionDescription) {
                updateFindingActionPlan(auditId, finding.id, {
                  owner: (args.actionOwner as string) || '',
                  targetDate: (args.actionTargetDate as string) || '',
                  status: 'pending',
                  description: (args.actionDescription as string) || '',
                })
              }
              const agreeLabels: Record<string, string> = { agree: 'Concorda', partially_agree: 'Concorda Parcialmente', disagree: 'Discorda' }
              showToast({ type: 'info', title: 'Resposta da gestão registrada', description: `${finding.title}: ${agreeLabels[agreement] || agreement}` })
            }
          }
          break
        }
      }
    },
    [auditId, pillar.id, addEvidence, addFinding, addSample, updatePillarRating, updateSubAreaRating, updateTestResult, updatePillarCompletion, linkEvidenceToTest, getCurrentAudit]
  )

  const callAI = async (allMessages: { role: string; content: string }[]) => {
    const freshAudit = getCurrentAudit()
    if (!freshAudit) return

    setIsChatLoading(true)
    setStreamingContent('')
    setActionBadges([])

    const abortController = new AbortController()
    abortRef.current = abortController

    try {
      const systemPrompt = buildSystemPrompt(freshAudit)
      const pillarContext = buildPillarContext(freshAudit.pillars.find(p => p.id === pillar.id) || pillar, freshAudit.evidence, freshAudit.findings, freshAudit.samples, freshAudit.phase)

      const conversationMessages = allMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      conversationMessages.unshift({
        role: 'user',
        content: `[CONTEXTO ATUAL DO PILAR]\n${pillarContext}`,
      })

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationMessages, systemPrompt }),
        signal: abortController.signal,
      })

      if (!response.ok) throw new Error('Falha na comunicação com o servidor')
      if (!response.body) throw new Error('Resposta sem body stream')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'text') {
              assistantContent += data.content
              setStreamingContent(assistantContent)
            } else if (data.type === 'function_call') {
              processFunctionCall(data.name, data.arguments)
            }
          } catch { /* skip */ }
        }
      }

      const finalContent = assistantContent || '*(O assistente executou ações sem mensagem de texto)*'
      addMessage(auditId, pillar.id, { role: 'assistant', content: finalContent })
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      addMessage(auditId, pillar.id, {
        role: 'assistant',
        content: 'Erro ao processar a solicitação. Verifique se a API key está configurada no arquivo `.env.local`.',
      })
    } finally {
      setStreamingContent('')
      setIsChatLoading(false)
      abortRef.current = null
    }
  }

  const triggerAIResponse = useCallback((existingContent: string) => {
    const freshConv = getConversation(auditId, pillar.id)
    const allMsgs = (freshConv?.messages || []).map(m => ({ role: m.role, content: m.content }))
    callAI(allMsgs)
  }, [auditId, pillar.id, getConversation])

  const sendMessage = async (overrideContent?: string) => {
    const userContent = (overrideContent || input).trim()
    if (!userContent || isChatLoading || !audit) return

    setInput('')
    addMessage(auditId, pillar.id, { role: 'user', content: userContent })

    const freshConv = getConversation(auditId, pillar.id)
    const allMsgs = [
      ...(freshConv?.messages || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userContent },
    ]

    await callAI(allMsgs)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startAuditPillar = () => {
    sendMessage(
      `Vamos iniciar a auditoria do pilar ${pillar.code} - ${pillar.name}. Por favor, conduza a análise seguindo a metodologia ARGUS: comece explicando o que será avaliado neste pilar, quais são os requisitos regulatórios aplicáveis, e solicite as primeiras evidências necessárias.`
    )
  }

  const quickActions = [
    {
      label: 'Continuar auditoria',
      icon: Play,
      prompt: `Verifique o contexto atual do pilar ${pillar.code}. Para cada evidência recebida que ainda não foi testada: execute o teste do procedimento vinculado (use run_test_procedure), crie achados se necessário (use create_finding), e solicite as evidências complementares faltantes (use request_evidence). Não pare até ter agido sobre tudo que está pendente.`,
    },
    {
      label: 'Analisar gaps',
      icon: Search,
      prompt: `Analise o status atual deste pilar: quais procedimentos já têm evidência e resultado, e quais ainda estão pendentes. Para cada gap, solicite a evidência necessária usando request_evidence. Priorize por risco.`,
    },
    {
      label: 'Solicitar evidências',
      icon: FileText,
      prompt: `Para o pilar ${pillar.code} - ${pillar.name}, identifique e solicite TODAS as evidências e documentos necessários para conduzir a auditoria completa. Use request_evidence para cada documento. Lembre-se da cadeia: documentos, depois implementação, depois amostras.`,
    },
    {
      label: 'Testar tudo',
      icon: ClipboardList,
      prompt: `Verifique quais procedimentos já possuem evidência vinculada mas ainda não foram testados. Execute o teste de CADA um usando run_test_procedure com resultado e observações detalhadas. Se falhar, crie achado imediatamente com create_finding. Após testar, solicite evidências para os próximos procedimentos.`,
    },
    {
      label: 'Avaliar pilar',
      icon: Target,
      prompt: `Com base nos testes realizados, avalie cada sub-área usando update_sub_area_rating e depois o pilar inteiro usando rate_pillar. Justifique com base nos resultados dos testes e achados identificados.`,
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-4">
        {messages.length === 0 && !streamingContent ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <Sparkles className="text-blue-400" size={28} />
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">
              {pillar.code} — {pillar.name}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
              {pillar.description}
            </p>
            <button onClick={startAuditPillar} className="btn-primary flex items-center gap-2">
              <Eye size={14} />
              Iniciar Auditoria deste Pilar
            </button>
            <div className="mt-6 text-left w-full max-w-md">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-2">Base regulatória</p>
              <div className="space-y-1.5">
                {pillar.regulatoryBasis.map((ref, i) => (
                  <div key={i} className="text-[12px] text-slate-400 flex items-start gap-1.5">
                    <span className="text-blue-400 mt-0.5 font-medium">§</span>
                    {ref}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-slate-200 whitespace-pre-wrap">{msg.content}</p>
                  )}
                  <div className={`flex items-center gap-2 mt-2 text-[11px] ${msg.role === 'user' ? 'text-blue-400/50 justify-end' : 'text-slate-500'}`}>
                    {msg.role === 'assistant' && <Sparkles size={10} />}
                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] chat-bubble-ai">
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingContent}
                    </ReactMarkdown>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-blue-400/60">
                    <Loader2 size={10} className="animate-spin" />
                    Gerando...
                  </div>
                </div>
              </div>
            )}

            {actionBadges.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1">
                {actionBadges.map(badge => {
                  const BadgeIcon = BADGE_ICONS[badge.icon]
                  return (
                    <span
                      key={badge.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    >
                      <CheckCircle size={12} />
                      {BadgeIcon && <BadgeIcon size={10} />}
                      {badge.label}
                    </span>
                  )
                })}
              </div>
            )}
          </>
        )}

        {isChatLoading && !streamingContent && (
          <div className="flex justify-start">
            <div className="chat-bubble-ai flex items-center gap-2">
              <Loader2 size={14} className="text-blue-400 animate-spin" />
              <div className="typing-indicator flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              </div>
              <span className="text-xs text-slate-500 ml-1">ARGUS analisando...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[var(--ln-1)]">
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {quickActions.map(qa => {
              const QaIcon = qa.icon
              return (
                <button
                  key={qa.label}
                  onClick={() => sendMessage(qa.prompt)}
                  disabled={isChatLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-400 bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-300 hover:border-slate-600/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <QaIcon size={12} />
                  {qa.label}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Converse com o ARGUS sobre este pilar..."
              rows={1}
              className="textarea-field pr-12 resize-none overflow-hidden"
              style={{ minHeight: '44px' }}
              disabled={isChatLoading}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isChatLoading}
            className="btn-primary h-[44px] px-4 shrink-0"
          >
            {isChatLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-[11px] text-slate-500">Enter para enviar • Shift+Enter para nova linha</span>
          {messages.length > 0 && (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Activity size={10} />
              {messages.filter(m => m.role === 'assistant').length} respostas
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
