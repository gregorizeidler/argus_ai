'use client'

import { useState, useMemo } from 'react'
import { useAuditStore } from '@/lib/store'
import { Interview, InterviewQuestion } from '@/lib/types'
import {
  Plus, X, Save, Edit3, ChevronDown, ChevronRight, Users, FileText,
  AlertTriangle, CheckCircle, Calendar, Clock, Search, Loader2, Target, Copy,
} from '@/components/Icons'
import { cn, generateId, formatDate } from '@/lib/utils'

const QUESTION_TEMPLATES: Record<string, { label: string; questions: string[] }> = {
  compliance: {
    label: 'Compliance Officer',
    questions: [
      'Descreva a estrutura da área de PLD.',
      'Qual a frequência de reporte à alta administração?',
      'Como é feita a calibração de alertas?',
      'Como é realizado o processo de KYC/CDD?',
      'Quais são os critérios para classificação de risco dos clientes?',
      'Como são tratadas as comunicações ao COAF (SISCOAF)?',
      'Como é feito o monitoramento de PEPs?',
      'Existe programa formal de treinamento em PLD/FT?',
      'Como é conduzida a avaliação interna de risco (AIR)?',
    ],
  },
  operations: {
    label: 'Operações',
    questions: [
      'Como são tratados os alertas de monitoramento?',
      'Qual o SLA de análise?',
      'Qual o volume médio mensal de alertas gerados?',
      'Como é feita a triagem e priorização de alertas?',
      'Existe processo de escalonamento para casos complexos?',
      'Como são documentadas as análises realizadas?',
      'Qual a taxa de conversão de alertas em comunicações ao COAF?',
    ],
  },
  it: {
    label: 'TI / Sistemas',
    questions: [
      'Quais sistemas suportam o monitoramento de PLD?',
      'Como é garantida a integridade dos dados?',
      'Qual a frequência de atualização das regras de monitoramento?',
      'Como é feito o controle de acesso aos sistemas de PLD?',
      'Existe integração entre os sistemas de cadastro e monitoramento?',
      'Como são mantidos os logs de auditoria dos sistemas?',
      'Qual o processo de backup e recuperação dos dados de PLD?',
    ],
  },
  management: {
    label: 'Alta Administração',
    questions: [
      'Como a alta administração é informada sobre riscos de LD/FT?',
      'Com que frequência o comitê de PLD se reúne?',
      'Quais decisões estratégicas foram tomadas com base em reportes de PLD?',
      'Como é aprovado o orçamento da área de PLD?',
      'Existe cultura de compliance disseminada na organização?',
    ],
  },
}

const inputClass =
  'w-full bg-[var(--sf-1)] border border-[var(--ln-1)] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50'

function emptyForm() {
  return {
    interviewee: '',
    role: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    questions: [] as InterviewQuestion[],
    summary: '',
    conclusions: '',
    templateCategory: '' as string,
    customQuestion: '',
  }
}

export default function InterviewsPanel({ auditId, pillarId }: { auditId: string; pillarId: string }) {
  const { getCurrentAudit, addInterview, updateInterview, deleteInterview } = useAuditStore()
  const audit = getCurrentAudit()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterText, setFilterText] = useState('')
  const [editingQIdx, setEditingQIdx] = useState<{ interviewId: string; qIdx: number } | null>(null)
  const [editBuffer, setEditBuffer] = useState({ answer: '', followUp: '' })
  const [editSummary, setEditSummary] = useState('')
  const [editConclusions, setEditConclusions] = useState('')

  const interviews = useMemo(() => {
    const all = audit?.interviews?.filter(i => i.pillarId === pillarId) || []
    if (!filterText.trim()) return all
    const q = filterText.toLowerCase()
    return all.filter(
      i =>
        i.interviewee.toLowerCase().includes(q) ||
        i.role.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q)
    )
  }, [audit?.interviews, pillarId, filterText])

  const addTemplateQuestions = (category: string) => {
    const tpl = QUESTION_TEMPLATES[category]
    if (!tpl) return
    const newQs: InterviewQuestion[] = tpl.questions.map(q => ({
      id: generateId(),
      question: q,
      answer: '',
    }))
    setForm(f => ({
      ...f,
      questions: [...f.questions, ...newQs],
      templateCategory: category,
    }))
  }

  const addCustomQuestion = () => {
    if (!form.customQuestion.trim()) return
    setForm(f => ({
      ...f,
      questions: [
        ...f.questions,
        { id: generateId(), question: f.customQuestion.trim(), answer: '' },
      ],
      customQuestion: '',
    }))
  }

  const removeFormQuestion = (qId: string) => {
    setForm(f => ({ ...f, questions: f.questions.filter(q => q.id !== qId) }))
  }

  const handleCreate = () => {
    if (!form.interviewee.trim() || !form.role.trim()) return
    addInterview(auditId, {
      pillarId,
      interviewee: form.interviewee.trim(),
      role: form.role.trim(),
      date: form.date,
      location: form.location.trim() || undefined,
      questions: form.questions,
      summary: form.summary,
      conclusions: form.conclusions,
    })
    setForm(emptyForm())
    setShowForm(false)
  }

  const startEditQuestion = (interviewId: string, qIdx: number, q: InterviewQuestion) => {
    setEditingQIdx({ interviewId, qIdx })
    setEditBuffer({ answer: q.answer, followUp: q.followUp || '' })
  }

  const saveEditQuestion = (interview: Interview) => {
    if (!editingQIdx) return
    const updated = interview.questions.map((q, i) =>
      i === editingQIdx.qIdx
        ? { ...q, answer: editBuffer.answer, followUp: editBuffer.followUp || undefined }
        : q
    )
    updateInterview(auditId, interview.id, { questions: updated })
    setEditingQIdx(null)
  }

  const startEditMeta = (interview: Interview) => {
    setEditingId(interview.id)
    setEditSummary(interview.summary)
    setEditConclusions(interview.conclusions)
  }

  const saveEditMeta = (interviewId: string) => {
    updateInterview(auditId, interviewId, {
      summary: editSummary,
      conclusions: editConclusions,
    })
    setEditingId(null)
  }

  const addQuestionToExisting = (interview: Interview, questionText: string) => {
    if (!questionText.trim()) return
    const updated = [
      ...interview.questions,
      { id: generateId(), question: questionText.trim(), answer: '' },
    ]
    updateInterview(auditId, interview.id, { questions: updated })
  }

  const generateSummaryFromAnswers = (interview: Interview): string => {
    const answered = interview.questions.filter(q => q.answer.trim())
    if (answered.length === 0) return ''
    return answered
      .map(q => `• ${q.question}: ${q.answer}`)
      .join('\n')
  }

  const exportInterview = (interview: Interview) => {
    const lines = [
      `ENTREVISTA DE AUDITORIA PLD/FT`,
      `${'='.repeat(40)}`,
      `Entrevistado: ${interview.interviewee}`,
      `Cargo: ${interview.role}`,
      `Data: ${interview.date}`,
      interview.location ? `Local: ${interview.location}` : '',
      ``,
      `PERGUNTAS E RESPOSTAS`,
      `${'-'.repeat(40)}`,
      ...interview.questions.map(
        (q, i) =>
          `${i + 1}. ${q.question}\n   Resposta: ${q.answer || '(sem resposta)'}${q.followUp ? `\n   Follow-up: ${q.followUp}` : ''}`
      ),
      ``,
      `RESUMO`,
      `${'-'.repeat(40)}`,
      interview.summary || '(sem resumo)',
      ``,
      `CONCLUSÕES`,
      `${'-'.repeat(40)}`,
      interview.conclusions || '(sem conclusões)',
    ]
      .filter(Boolean)
      .join('\n')

    navigator.clipboard.writeText(lines)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--ln-1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-200">Entrevistas</h3>
            {interviews.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-300 rounded-full">
                {interviews.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"
          >
            {showForm ? <X size={12} /> : <Plus size={12} />}
            {showForm ? 'Cancelar' : 'Nova Entrevista'}
          </button>
        </div>

        {/* Filter */}
        {interviews.length > 0 && (
          <div className="relative mt-3">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Filtrar entrevistas..."
              className={cn(inputClass, 'pl-8 py-1.5 text-xs')}
            />
          </div>
        )}
      </div>

      {/* New interview form */}
      {showForm && (
        <div className="p-4 border-b border-[var(--ln-1)] bg-[var(--sf-2)] space-y-3 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Entrevistado *</label>
              <input
                value={form.interviewee}
                onChange={e => setForm(f => ({ ...f, interviewee: e.target.value }))}
                placeholder="Nome completo"
                className={cn(inputClass, 'text-xs')}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Cargo / Função *</label>
              <input
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                placeholder="Ex: Compliance Officer"
                className={cn(inputClass, 'text-xs')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Data</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className={cn(inputClass, 'text-xs')}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Local (opcional)</label>
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Ex: Sala de reuniões 3"
                className={cn(inputClass, 'text-xs')}
              />
            </div>
          </div>

          {/* Template selector */}
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">Perguntas pré-definidas</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(QUESTION_TEMPLATES).map(([key, tpl]) => (
                <button
                  key={key}
                  onClick={() => addTemplateQuestions(key)}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-md border transition-colors',
                    form.templateCategory === key
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                      : 'border-[var(--ln-1)] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  )}
                >
                  <Target size={10} className="inline mr-1" />
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom question */}
          <div className="flex gap-2">
            <input
              value={form.customQuestion}
              onChange={e => setForm(f => ({ ...f, customQuestion: e.target.value }))}
              placeholder="Adicionar pergunta personalizada..."
              className={cn(inputClass, 'text-xs flex-1')}
              onKeyDown={e => e.key === 'Enter' && addCustomQuestion()}
            />
            <button onClick={addCustomQuestion} className="btn-ghost text-xs px-2 py-1">
              <Plus size={12} />
            </button>
          </div>

          {/* Questions list */}
          {form.questions.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <label className="text-[11px] text-slate-400">
                {form.questions.length} pergunta{form.questions.length !== 1 && 's'}
              </label>
              {form.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="flex items-start gap-2 p-2 rounded-md bg-[var(--sf-1)] border border-[var(--ln-1)]"
                >
                  <span className="text-[10px] text-slate-500 mt-0.5 min-w-[16px]">{idx + 1}.</span>
                  <span className="text-xs text-slate-300 flex-1">{q.question}</span>
                  <button
                    onClick={() => removeFormQuestion(q.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Summary / Conclusions (optional on creation) */}
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">Resumo (opcional)</label>
            <textarea
              value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              placeholder="Resumo da entrevista..."
              className={cn(inputClass, 'text-xs')}
              rows={2}
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">Conclusões (opcional)</label>
            <textarea
              value={form.conclusions}
              onChange={e => setForm(f => ({ ...f, conclusions: e.target.value }))}
              placeholder="Conclusões e observações..."
              className={cn(inputClass, 'text-xs')}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setForm(emptyForm()); setShowForm(false) }} className="btn-ghost text-xs py-1.5 px-3">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.interviewee.trim() || !form.role.trim()}
              className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40"
            >
              <Save size={12} className="inline mr-1" />
              Criar Entrevista
            </button>
          </div>
        </div>
      )}

      {/* Interviews list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {interviews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={32} className="text-slate-600 mb-3" />
            <p className="text-sm text-slate-400 mb-1">Nenhuma entrevista registrada</p>
            <p className="text-[11px] text-slate-500">
              Registre entrevistas com stakeholders para documentar o trabalho de campo.
            </p>
          </div>
        )}

        {interviews.map(interview => {
          const isExpanded = expandedId === interview.id
          const isEditingMeta = editingId === interview.id
          const answeredCount = interview.questions.filter(q => q.answer.trim()).length

          return (
            <div
              key={interview.id}
              className="glass-panel rounded-lg border border-[var(--ln-1)] overflow-hidden"
            >
              {/* Card header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : interview.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="text-slate-500 shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-slate-500 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200 truncate">
                      {interview.interviewee}
                    </span>
                    <span className="text-[10px] text-slate-500 bg-[var(--sf-1)] px-1.5 py-0.5 rounded">
                      {interview.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Calendar size={10} /> {interview.date}
                    </span>
                    {interview.location && (
                      <span className="text-[11px] text-slate-500">{interview.location}</span>
                    )}
                    <span className="text-[11px] text-slate-500">
                      {answeredCount}/{interview.questions.length} respostas
                    </span>
                  </div>
                </div>

                {answeredCount === interview.questions.length && interview.questions.length > 0 ? (
                  <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                ) : interview.questions.length > 0 ? (
                  <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                ) : null}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-[var(--ln-1)]">
                  {/* Action bar */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--ln-1)] bg-[var(--sf-2)]">
                    <button
                      onClick={() => isEditingMeta ? saveEditMeta(interview.id) : startEditMeta(interview)}
                      className="btn-ghost text-[11px] py-1 px-2 flex items-center gap-1"
                    >
                      {isEditingMeta ? <Save size={10} /> : <Edit3 size={10} />}
                      {isEditingMeta ? 'Salvar' : 'Editar'}
                    </button>
                    <button
                      onClick={() => {
                        const generated = generateSummaryFromAnswers(interview)
                        if (generated) {
                          updateInterview(auditId, interview.id, { summary: generated })
                          if (isEditingMeta) setEditSummary(generated)
                        }
                      }}
                      className="btn-ghost text-[11px] py-1 px-2 flex items-center gap-1"
                    >
                      <FileText size={10} /> Gerar Resumo
                    </button>
                    <button
                      onClick={() => exportInterview(interview)}
                      className="btn-ghost text-[11px] py-1 px-2 flex items-center gap-1"
                    >
                      <Copy size={10} /> Copiar Texto
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => {
                        if (confirm('Excluir esta entrevista?')) {
                          deleteInterview(auditId, interview.id)
                          if (expandedId === interview.id) setExpandedId(null)
                        }
                      }}
                      className="text-[11px] text-red-400/70 hover:text-red-400 transition-colors px-2 py-1"
                    >
                      <X size={10} className="inline mr-0.5" /> Excluir
                    </button>
                  </div>

                  {/* Questions & Answers */}
                  <div className="p-3 space-y-2">
                    <h4 className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Perguntas & Respostas
                    </h4>

                    {interview.questions.length === 0 && (
                      <p className="text-xs text-slate-500 italic">Nenhuma pergunta adicionada.</p>
                    )}

                    {interview.questions.map((q, qIdx) => {
                      const isEditingQ =
                        editingQIdx?.interviewId === interview.id && editingQIdx?.qIdx === qIdx

                      return (
                        <div
                          key={q.id}
                          className="p-2.5 rounded-md bg-[var(--sf-1)] border border-[var(--ln-1)] space-y-1.5"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] text-blue-400 font-mono mt-0.5">
                              Q{qIdx + 1}
                            </span>
                            <span className="text-xs text-slate-200 flex-1">{q.question}</span>
                            {!isEditingQ && (
                              <button
                                onClick={() => startEditQuestion(interview.id, qIdx, q)}
                                className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                              >
                                <Edit3 size={11} />
                              </button>
                            )}
                          </div>

                          {isEditingQ ? (
                            <div className="ml-5 space-y-1.5">
                              <textarea
                                value={editBuffer.answer}
                                onChange={e =>
                                  setEditBuffer(b => ({ ...b, answer: e.target.value }))
                                }
                                placeholder="Resposta..."
                                className={cn(inputClass, 'text-xs')}
                                rows={2}
                              />
                              <textarea
                                value={editBuffer.followUp}
                                onChange={e =>
                                  setEditBuffer(b => ({ ...b, followUp: e.target.value }))
                                }
                                placeholder="Notas de follow-up (opcional)..."
                                className={cn(inputClass, 'text-xs')}
                                rows={1}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEditQuestion(interview)}
                                  className="btn-primary text-[11px] py-1 px-2"
                                >
                                  <Save size={10} className="inline mr-1" /> Salvar
                                </button>
                                <button
                                  onClick={() => setEditingQIdx(null)}
                                  className="btn-ghost text-[11px] py-1 px-2"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {q.answer ? (
                                <p className="ml-5 text-xs text-slate-300">{q.answer}</p>
                              ) : (
                                <p className="ml-5 text-xs text-slate-500 italic">
                                  (sem resposta)
                                </p>
                              )}
                              {q.followUp && (
                                <p className="ml-5 text-[11px] text-amber-400/80 border-l-2 border-amber-500/30 pl-2">
                                  Follow-up: {q.followUp}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}

                    {/* Add question inline */}
                    <AddQuestionInline
                      onAdd={text => addQuestionToExisting(interview, text)}
                    />
                  </div>

                  {/* Summary & Conclusions */}
                  <div className="p-3 border-t border-[var(--ln-1)] space-y-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                        Resumo
                      </label>
                      {isEditingMeta ? (
                        <textarea
                          value={editSummary}
                          onChange={e => setEditSummary(e.target.value)}
                          className={cn(inputClass, 'text-xs')}
                          rows={3}
                        />
                      ) : (
                        <p className="text-xs text-slate-300 whitespace-pre-wrap">
                          {interview.summary || (
                            <span className="text-slate-500 italic">Nenhum resumo.</span>
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                        Conclusões
                      </label>
                      {isEditingMeta ? (
                        <textarea
                          value={editConclusions}
                          onChange={e => setEditConclusions(e.target.value)}
                          className={cn(inputClass, 'text-xs')}
                          rows={3}
                        />
                      ) : (
                        <p className="text-xs text-slate-300 whitespace-pre-wrap">
                          {interview.conclusions || (
                            <span className="text-slate-500 italic">Nenhuma conclusão.</span>
                          )}
                        </p>
                      )}
                    </div>

                    {isEditingMeta && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="btn-ghost text-[11px] py-1 px-2">
                          Cancelar
                        </button>
                        <button
                          onClick={() => saveEditMeta(interview.id)}
                          className="btn-primary text-[11px] py-1 px-2"
                        >
                          <Save size={10} className="inline mr-1" /> Salvar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Metadata footer */}
                  <div className="px-3 py-2 border-t border-[var(--ln-1)] bg-[var(--sf-2)]">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock size={9} /> Criada em {formatDate(interview.createdAt)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AddQuestionInline({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('')

  const handleAdd = () => {
    if (!text.trim()) return
    onAdd(text)
    setText('')
  }

  return (
    <div className="flex gap-2 pt-1">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Adicionar nova pergunta..."
        className={cn(inputClass, 'text-xs flex-1')}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
      />
      <button onClick={handleAdd} className="btn-ghost text-[11px] py-1 px-2">
        <Plus size={11} className="inline mr-0.5" /> Adicionar
      </button>
    </div>
  )
}
