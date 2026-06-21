'use client'

import { Pillar, Rating } from '@/lib/types'
import { PILLAR_ICONS } from './Icons'
import { RATING_CONFIG } from '@/lib/audit-framework'
import { cn } from '@/lib/utils'

interface Props {
  pillars: Pillar[]
  activePillarId: string | null
  onSelect: (id: string) => void
  collapsed?: boolean
}

function RatingDot({ rating }: { rating: Rating }) {
  const config = RATING_CONFIG[rating]
  return (
    <div
      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: config.color }}
      title={config.label}
    />
  )
}

function CompletionBar({ percent }: { percent: number }) {
  const color = percent === 100 ? '#22c55e' : percent > 50 ? '#3b82f6' : percent > 0 ? '#eab308' : '#334155'
  return (
    <div className="progress-bar mt-1.5">
      <div className="progress-fill" style={{ width: `${percent}%`, backgroundColor: color }} />
    </div>
  )
}

export default function PillarSidebar({ pillars, activePillarId, onSelect, collapsed = false }: Props) {
  if (collapsed) {
    return (
      <div className="w-14 flex-shrink-0 glass-panel flex flex-col h-full">
        <div className="p-2 border-b border-[var(--ln-1)] flex items-center justify-center">
          <span className="text-[10px] font-bold text-slate-500">{pillars.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin p-1.5 space-y-1">
          {pillars.map(pillar => {
            const Icon = PILLAR_ICONS[pillar.icon]
            const isActive = activePillarId === pillar.id
            const rConf = RATING_CONFIG[pillar.overallRating]

            return (
              <button
                key={pillar.id}
                onClick={() => onSelect(pillar.id)}
                title={`${pillar.code} — ${pillar.name} (${pillar.completionPercent}%)`}
                className={cn(
                  'w-full aspect-square rounded-lg flex items-center justify-center transition-all relative group',
                  isActive
                    ? 'bg-blue-500/15 border border-blue-500/30'
                    : 'hover:bg-slate-800/60 border border-transparent'
                )}
              >
                <div className={cn(
                  isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'
                )}>
                  {Icon && <Icon size={16} />}
                </div>
                <div
                  className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full"
                  style={{ backgroundColor: rConf.color }}
                />
                {/* Tooltip on hover */}
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[var(--sf-3)] border border-[var(--ln-2)] rounded-lg text-xs text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                  <span className="text-blue-400 font-bold mr-1">{pillar.code}</span>
                  {pillar.name}
                  <span className="text-slate-500 ml-2">{pillar.completionPercent}%</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-72 flex-shrink-0 glass-panel flex flex-col h-full">
      <div className="p-4 border-b border-[var(--ln-1)]">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Pilares de Auditoria</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">{pillars.length} pilares | Circular 3.978/2020</p>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-2 space-y-1">
        {pillars.map(pillar => {
          const Icon = PILLAR_ICONS[pillar.icon]
          const isActive = activePillarId === pillar.id

          return (
            <button
              key={pillar.id}
              onClick={() => onSelect(pillar.id)}
              className={cn(
                'w-full text-left rounded-lg p-3 transition-all duration-150',
                isActive
                  ? 'bg-blue-500/10 border border-blue-500/20'
                  : 'hover:bg-slate-800/50 border border-transparent'
              )}
            >
              <div className="flex items-start gap-2.5">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                  isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'
                )}>
                  {Icon && <Icon size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-[11px] font-bold tracking-wider',
                      isActive ? 'text-blue-400' : 'text-slate-500'
                    )}>
                      {pillar.code}
                    </span>
                    <RatingDot rating={pillar.overallRating} />
                  </div>
                  <p className={cn(
                    'text-xs font-medium mt-0.5 leading-tight',
                    isActive ? 'text-slate-200' : 'text-slate-400'
                  )}>
                    {pillar.name}
                  </p>
                  <CompletionBar percent={pillar.completionPercent} />
                  <span className="text-[11px] text-slate-500">{pillar.completionPercent}% concluído</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
