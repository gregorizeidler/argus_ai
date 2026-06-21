'use client'

import { useState } from 'react'
import { useAuditStore } from '@/lib/store'
import { X, Building2, Sparkles } from './Icons'
import { Institution } from '@/lib/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated: (id: string) => void
}

export default function NewAuditModal({ isOpen, onClose, onCreated }: Props) {
  const createAudit = useAuditStore(s => s.createAudit)
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState<Institution>({
    name: '',
    type: 'bank',
    regulators: ['BACEN', 'COAF'],
    segment: '',
    size: 'medium',
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !institution.name.trim()) return
    const id = createAudit({ name, institution })
    onCreated(id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg mx-4 animate-fade-in glow-border">
        <div className="flex items-center justify-between p-5 border-b border-[var(--ln-1)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Sparkles className="text-blue-400" size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Nova Auditoria PLD-FT</h2>
              <p className="text-xs text-slate-500">Configurar escopo e instituição</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome da Auditoria</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Auditoria PLD-FT 2024 - Banco XYZ"
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                <Building2 size={12} className="inline mr-1" />
                Nome da Instituição
              </label>
              <input
                value={institution.name}
                onChange={e => setInstitution({ ...institution, name: e.target.value })}
                placeholder="Nome da instituição financeira"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo</label>
              <select
                value={institution.type}
                onChange={e => setInstitution({ ...institution, type: e.target.value as Institution['type'] })}
                className="select-field"
              >
                <option value="bank">Banco</option>
                <option value="broker">Corretora/DTVM</option>
                <option value="insurance">Seguradora</option>
                <option value="payment_institution">Instituição de Pagamento</option>
                <option value="crypto_exchange">Exchange de Criptoativos</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Porte</label>
              <select
                value={institution.size}
                onChange={e => setInstitution({ ...institution, size: e.target.value as Institution['size'] })}
                className="select-field"
              >
                <option value="large">Grande</option>
                <option value="medium">Médio</option>
                <option value="small">Pequeno</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Segmento de Atuação</label>
              <input
                value={institution.segment}
                onChange={e => setInstitution({ ...institution, segment: e.target.value })}
                placeholder="Ex: Varejo, Corporate, Private Banking..."
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Sparkles size={14} />
              Iniciar Auditoria
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
