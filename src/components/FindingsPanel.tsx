'use client'

import { useState } from 'react'
import { useAuditStore } from '@/lib/store'
import { Finding, Severity, ActionPlan } from '@/lib/types'
import { SEVERITY_CONFIG } from '@/lib/audit-framework'
import { AlertTriangle, ChevronDown, ChevronRight, Sparkles, Scale, Plus, Save } from './Icons'
import { cn, formatDate, getSeverityOrder } from '@/lib/utils'

interface Props {
  auditId: string
  pillarId: string
}

export default function FindingsPanel({ auditId, pillarId }: Props) {
  const { getCurrentAudit, addFinding, updateFinding, updateFindingActionPlan } = useAuditStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingResponse, setEditingResponse] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [editingAction, setEditingAction] = useState<string | null>(null)
  const [actionPlan, setActionPlan] = useState<ActionPlan>({ owner: '', targetDate: '', status: 'pending', description: '' })
  const [newFinding, setNewFinding] = useState({
    title: '', severity: 'medium' as Severity, condition: '', criteria: '', cause: '', effect: '', recommendation: '',
  })

  const audit = getCurrentAudit()
  const findings = (audit?.findings.filter(f => f.pillarId === pillarId) || [])
    .sort((a, b) => getSeverityOrder(a.severity) - getSeverityOrder(b.severity))

  const handleAddFinding = () => {
    if (!newFinding.title.trim()) return
    addFinding(auditId, {
      ...newFinding,
      pillarId,
      status: 'draft',
      regulatoryReference: [],
      isAiGenerated: false,
    })
    setNewFinding({ title: '', severity: 'medium', condition: '', criteria: '', cause: '', effect: '', recommendation: '' })
    setShowAddForm(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--ln-1)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Achados de Auditoria</h3>
            <p className="text-[11px] text-slate-500">{findings.length} achados identificados</p>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn-secondary text-xs py-1.5 px-3">
            <Plus size={12} className="inline mr-1" /> Novo Achado
          </button>
        </div>

        <div className="flex gap-3 mt-3">
          {(['critical', 'high', 'medium', 'low'] as Severity[]).map(sev => {
            const count = findings.filter(f => f.severity === sev).length
            const conf = SEVERITY_CONFIG[sev]
            return (
              <div key={sev} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: conf.color }} />
                <span className="text-[11px] text-slate-400">{conf.label}: {count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {showAddForm && (
        <div className="p-4 border-b border-[var(--ln-1)] bg-[var(--sf-2)] space-y-3">
          <input value={newFinding.title} onChange={e => setNewFinding({ ...newFinding, title: e.target.value })} placeholder="Título do achado" className="input-field text-xs" />
          <select value={newFinding.severity} onChange={e => setNewFinding({ ...newFinding, severity: e.target.value as Severity })} className="select-field text-xs">
            <option value="critical">Crítico</option>
            <option value="high">Alto</option>
            <option value="medium">Médio</option>
            <option value="low">Baixo</option>
          </select>
          <textarea value={newFinding.condition} onChange={e => setNewFinding({ ...newFinding, condition: e.target.value })} placeholder="Condição (o que foi encontrado)" className="textarea-field text-xs" rows={2} />
          <textarea value={newFinding.criteria} onChange={e => setNewFinding({ ...newFinding, criteria: e.target.value })} placeholder="Critério (o que deveria ser)" className="textarea-field text-xs" rows={2} />
          <textarea value={newFinding.cause} onChange={e => setNewFinding({ ...newFinding, cause: e.target.value })} placeholder="Causa (por que ocorre)" className="textarea-field text-xs" rows={2} />
          <textarea value={newFinding.effect} onChange={e => setNewFinding({ ...newFinding, effect: e.target.value })} placeholder="Efeito (impacto/risco)" className="textarea-field text-xs" rows={2} />
          <textarea value={newFinding.recommendation} onChange={e => setNewFinding({ ...newFinding, recommendation: e.target.value })} placeholder="Recomendação" className="textarea-field text-xs" rows={2} />
          <div className="flex gap-2">
            <button onClick={handleAddFinding} className="btn-primary text-xs">Salvar Achado</button>
            <button onClick={() => setShowAddForm(false)} className="btn-ghost text-xs">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-2">
        {findings.map(finding => {
          const conf = SEVERITY_CONFIG[finding.severity]
          const isExpanded = expandedId === finding.id

          return (
            <div key={finding.id} className="glass-panel overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-800/30 transition-all"
              >
                {isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: conf.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200 truncate">{finding.title}</span>
                    {finding.isAiGenerated && <Sparkles size={10} className="text-blue-400 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('severity-badge text-[10px]', `severity-${finding.severity}`)}>
                      {conf.label}
                    </span>
                    <span className="text-[11px] text-slate-500">{formatDate(finding.createdAt)}</span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-[var(--ln-1)] space-y-3">
                  {[
                    { label: 'Condição', value: finding.condition },
                    { label: 'Critério', value: finding.criteria },
                    { label: 'Causa', value: finding.cause },
                    { label: 'Efeito', value: finding.effect },
                    { label: 'Recomendação', value: finding.recommendation },
                  ].map(item => item.value && (
                    <div key={item.label}>
                      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{item.label}</h4>
                      <p className="text-[13px] text-slate-300 leading-relaxed">{item.value}</p>
                    </div>
                  ))}

                  {finding.regulatoryReference.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Referência Regulatória</h4>
                      <div className="flex flex-wrap gap-1">
                        {finding.regulatoryReference.map((ref, i) => (
                          <span key={i} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                            {ref}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3">
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">Concordância da Administração</label>
                    <select
                      value={finding.managementAgreement || ''}
                      onChange={e => updateFinding(auditId, finding.id, { managementAgreement: (e.target.value as 'agree' | 'partially_agree' | 'disagree') || undefined })}
                      className="select-field text-xs"
                    >
                      <option value="">Não informado</option>
                      <option value="agree">Concorda</option>
                      <option value="partially_agree">Concorda Parcialmente</option>
                      <option value="disagree">Discorda</option>
                    </select>
                  </div>

                  <div className="mt-2">
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">Categoria de Causa Raiz</label>
                    <select
                      value={finding.rootCauseCategory || ''}
                      onChange={e => updateFinding(auditId, finding.id, { rootCauseCategory: (e.target.value as 'people' | 'process' | 'technology' | 'governance') || undefined })}
                      className="select-field text-xs"
                    >
                      <option value="">Não classificado</option>
                      <option value="people">Pessoas</option>
                      <option value="process">Processo</option>
                      <option value="technology">Tecnologia</option>
                      <option value="governance">Governança</option>
                    </select>
                  </div>

                  {finding.status === 'closed' && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={finding.remediationValidated || false}
                        onChange={e => updateFinding(auditId, finding.id, {
                          remediationValidated: e.target.checked,
                          remediationValidationDate: e.target.checked ? new Date().toISOString() : undefined
                        })}
                        className="rounded"
                      />
                      <span className="text-[11px] text-slate-400">Remediação validada por re-teste</span>
                      {finding.remediationValidated && finding.remediationValidationDate && (
                        <span className="text-[10px] text-emerald-400">✓ {new Date(finding.remediationValidationDate).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  )}

                  <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">Resposta da Administração</h4>
                      {!editingResponse || editingResponse !== finding.id ? (
                        <button
                          onClick={() => { setEditingResponse(finding.id); setResponseText(finding.managementResponse || '') }}
                          className="btn-ghost text-[10px] text-green-400 py-0.5 px-1.5"
                        >
                          {finding.managementResponse ? 'Editar' : '+ Adicionar'}
                        </button>
                      ) : null}
                    </div>
                    {editingResponse === finding.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={responseText}
                          onChange={e => setResponseText(e.target.value)}
                          placeholder="Resposta da administração ao achado..."
                          className="textarea-field text-xs"
                          rows={3}
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { updateFinding(auditId, finding.id, { managementResponse: responseText }); setEditingResponse(null) }}
                            className="btn-primary text-[10px] py-1 px-2 flex items-center gap-1"
                          >
                            <Save size={10} /> Salvar
                          </button>
                          <button onClick={() => setEditingResponse(null)} className="btn-ghost text-[10px] py-1 px-2">Cancelar</button>
                        </div>
                      </div>
                    ) : finding.managementResponse ? (
                      <p className="text-xs text-slate-300">{finding.managementResponse}</p>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">Nenhuma resposta registrada</p>
                    )}
                  </div>

                  <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Plano de Ação</h4>
                      {editingAction !== finding.id && (
                        <button
                          onClick={() => { setEditingAction(finding.id); setActionPlan(finding.actionPlan || { owner: '', targetDate: '', status: 'pending', description: '' }) }}
                          className="btn-ghost text-[10px] text-indigo-400 py-0.5 px-1.5"
                        >
                          {finding.actionPlan ? 'Editar' : '+ Adicionar'}
                        </button>
                      )}
                    </div>
                    {editingAction === finding.id ? (
                      <div className="space-y-2">
                        <input value={actionPlan.owner} onChange={e => setActionPlan({ ...actionPlan, owner: e.target.value })} placeholder="Responsável" className="input-field text-xs" />
                        <input type="date" value={actionPlan.targetDate} onChange={e => setActionPlan({ ...actionPlan, targetDate: e.target.value })} className="input-field text-xs" />
                        <select value={actionPlan.status} onChange={e => setActionPlan({ ...actionPlan, status: e.target.value as ActionPlan['status'] })} className="select-field text-xs">
                          <option value="pending">Pendente</option>
                          <option value="in_progress">Em Andamento</option>
                          <option value="completed">Concluído</option>
                        </select>
                        <textarea value={actionPlan.description} onChange={e => setActionPlan({ ...actionPlan, description: e.target.value })} placeholder="Descrição do plano de ação..." className="textarea-field text-xs" rows={2} />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { updateFindingActionPlan(auditId, finding.id, actionPlan); setEditingAction(null) }}
                            className="btn-primary text-[10px] py-1 px-2 flex items-center gap-1"
                          >
                            <Save size={10} /> Salvar
                          </button>
                          <button onClick={() => setEditingAction(null)} className="btn-ghost text-[10px] py-1 px-2">Cancelar</button>
                        </div>
                      </div>
                    ) : finding.actionPlan ? (
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-slate-500">Responsável:</span> <span className="text-slate-300">{finding.actionPlan.owner}</span></div>
                        <div><span className="text-slate-500">Prazo:</span> <span className="text-slate-300">{finding.actionPlan.targetDate}</span></div>
                        <div><span className="text-slate-500">Status:</span> <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px]',
                          finding.actionPlan.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                          finding.actionPlan.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-slate-500/10 text-slate-400'
                        )}>{finding.actionPlan.status === 'pending' ? 'Pendente' : finding.actionPlan.status === 'in_progress' ? 'Em Andamento' : 'Concluído'}</span></div>
                        {finding.actionPlan.description && <div className="col-span-2"><span className="text-slate-500">Ação:</span> <span className="text-slate-300">{finding.actionPlan.description}</span></div>}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">Nenhum plano de ação definido</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <select
                      value={finding.status}
                      onChange={e => updateFinding(auditId, finding.id, { status: e.target.value as Finding['status'] })}
                      className="select-field text-[10px] w-auto"
                    >
                      <option value="draft">Rascunho</option>
                      <option value="confirmed">Confirmado</option>
                      <option value="management_response">Resposta da Administração</option>
                      <option value="closed">Fechado</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {findings.length === 0 && (
          <div className="text-center py-12 max-w-xs mx-auto">
            <Scale size={32} className="mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-300 font-medium mb-1">Nenhum achado identificado</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Converse com o ARGUS no chat para que ele identifique deficiências e registre achados com a estrutura Condição-Critério-Causa-Efeito.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
