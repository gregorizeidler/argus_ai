'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Audit } from '@/lib/types'
import {
  Search, X, AlertTriangle, FileText, MessageSquare,
  ClipboardList, Target, ChevronRight, Clock,
} from '@/components/Icons'

type SearchResultType = 'finding' | 'evidence' | 'chat' | 'procedure' | 'sample'
type TabId = 'chat' | 'evidence' | 'findings' | 'samples' | 'procedures'

interface SearchResult {
  type: SearchResultType
  title: string
  subtitle: string
  pillarId: string
  pillarCode: string
  tab: TabId
  severity?: string
}

const TYPE_CONFIG: Record<SearchResultType, { icon: typeof Search; label: string; color: string }> = {
  finding: { icon: AlertTriangle, label: 'Achado', color: 'text-red-400' },
  evidence: { icon: FileText, label: 'Evidência', color: 'text-yellow-400' },
  chat: { icon: MessageSquare, label: 'Chat', color: 'text-blue-400' },
  procedure: { icon: ClipboardList, label: 'Procedimento', color: 'text-purple-400' },
  sample: { icon: Target, label: 'Amostra', color: 'text-green-400' },
}

const RECENT_KEY = 'argus-recent-searches'
const MAX_RECENT = 5

interface Props {
  audit: Audit
  onNavigate: (pillarId: string, tab: TabId) => void
  isOpen: boolean
  onClose: () => void
}

export default function GlobalSearch({ audit, onNavigate, isOpen, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY)
      if (stored) setRecentSearches(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const saveRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return
    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, MAX_RECENT)
    setRecentSearches(updated)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)) } catch { /* ignore */ }
  }, [recentSearches])

  const results = useMemo((): SearchResult[] => {
    const q = query.toLowerCase().trim()
    if (!q) return []

    const matches: SearchResult[] = []

    for (const pillar of audit.pillars) {
      // Findings
      for (const f of audit.findings.filter(f => f.pillarId === pillar.id)) {
        if (
          f.title.toLowerCase().includes(q) ||
          f.condition.toLowerCase().includes(q) ||
          f.recommendation.toLowerCase().includes(q)
        ) {
          matches.push({
            type: 'finding',
            title: f.title,
            subtitle: `${SEVERITY_LABEL[f.severity]} • ${f.status}`,
            pillarId: pillar.id,
            pillarCode: pillar.code,
            tab: 'findings',
            severity: f.severity,
          })
        }
      }

      // Evidence
      for (const e of audit.evidence.filter(e => e.pillarId === pillar.id)) {
        if (
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.reviewNotes?.toLowerCase().includes(q))
        ) {
          matches.push({
            type: 'evidence',
            title: e.name,
            subtitle: `${e.type} • ${e.status}`,
            pillarId: pillar.id,
            pillarCode: pillar.code,
            tab: 'evidence',
          })
        }
      }

      // Chat messages
      const convo = audit.conversations.find(c => c.pillarId === pillar.id)
      if (convo) {
        for (const msg of convo.messages) {
          if (msg.content.toLowerCase().includes(q)) {
            const preview = msg.content.length > 80 ? msg.content.substring(0, 77) + '...' : msg.content
            matches.push({
              type: 'chat',
              title: preview,
              subtitle: `${msg.role === 'assistant' ? 'ARGUS' : 'Auditor'} • ${pillar.code}`,
              pillarId: pillar.id,
              pillarCode: pillar.code,
              tab: 'chat',
            })
          }
        }
      }

      // Test Procedures
      for (const sa of pillar.subAreas) {
        for (const tp of sa.testProcedures) {
          if (
            tp.description.toLowerCase().includes(q) ||
            tp.code.toLowerCase().includes(q) ||
            tp.observations.toLowerCase().includes(q)
          ) {
            matches.push({
              type: 'procedure',
              title: `${tp.code} - ${tp.description.substring(0, 60)}...`,
              subtitle: `${sa.code} • ${tp.result}`,
              pillarId: pillar.id,
              pillarCode: pillar.code,
              tab: 'procedures',
            })
          }
        }
      }

      // Samples
      for (const s of audit.samples.filter(s => s.pillarId === pillar.id)) {
        if (
          s.description.toLowerCase().includes(q) ||
          s.population.toLowerCase().includes(q) ||
          (s.conclusion?.toLowerCase().includes(q))
        ) {
          matches.push({
            type: 'sample',
            title: s.description,
            subtitle: `${s.selectionMethod} • ${s.status}`,
            pillarId: pillar.id,
            pillarCode: pillar.code,
            tab: 'samples',
          })
        }
      }
    }

    return matches.slice(0, 50)
  }, [query, audit])

  useEffect(() => {
    setSelectedIdx(0)
  }, [results])

  const handleSelect = useCallback((result: SearchResult) => {
    saveRecentSearch(query)
    onNavigate(result.pillarId, result.tab)
    onClose()
  }, [query, saveRecentSearch, onNavigate, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
      resultsRef.current?.children[Math.min(selectedIdx + 1, results.length - 1)]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
      resultsRef.current?.children[Math.max(selectedIdx - 1, 0)]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      handleSelect(results[selectedIdx])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [results, selectedIdx, handleSelect, onClose])

  if (!isOpen) return null

  const showRecent = query.length === 0 && recentSearches.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-panel w-full max-w-2xl mx-4 glow-border overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ln-1)]">
          <Search size={18} className="text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar achados, evidências, chat, procedimentos..."
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <kbd className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">ESC</kbd>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[50vh] overflow-y-auto scroll-thin">
          {showRecent && (
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                <Clock size={10} />
                Buscas Recentes
              </div>
              {recentSearches.map((term, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(term)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          )}

          {query.length > 0 && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Search size={24} className="mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">Nenhum resultado para &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-500 mt-1">Tente termos diferentes</p>
            </div>
          )}

          {results.map((result, i) => {
            const config = TYPE_CONFIG[result.type]
            const Icon = config.icon
            const isSelected = i === selectedIdx

            return (
              <button
                key={i}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIdx(i)}
                className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors ${
                  isSelected ? 'bg-blue-500/10' : 'hover:bg-slate-800/50'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-blue-500/20' : 'bg-slate-800'
                }`}>
                  <Icon size={14} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                    {result.title}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {result.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[9px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                    {result.pillarCode}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-500">
                    {config.label}
                  </span>
                  <ChevronRight size={12} className={isSelected ? 'text-blue-400' : 'text-slate-600'} />
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--ln-1)] flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span><kbd className="bg-slate-800 px-1 py-0.5 rounded border border-slate-700">↑↓</kbd> navegar</span>
            <span><kbd className="bg-slate-800 px-1 py-0.5 rounded border border-slate-700">↵</kbd> selecionar</span>
            <span><kbd className="bg-slate-800 px-1 py-0.5 rounded border border-slate-700">esc</kbd> fechar</span>
          </div>
          {results.length > 0 && (
            <span>{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  )
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
}
