'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, AlertTriangle, FileText, Target, X, Sparkles } from './Icons'
import { cn } from '@/lib/utils'

export interface ToastMessage {
  id: string
  type: 'success' | 'warning' | 'info' | 'ai_action'
  title: string
  description?: string
}

const toastListeners: ((msg: ToastMessage) => void)[] = []

export function showToast(msg: Omit<ToastMessage, 'id'>) {
  const full: ToastMessage = { ...msg, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }
  toastListeners.forEach(fn => fn(full))
}

const ICON_MAP = {
  success: CheckCircle,
  warning: AlertTriangle,
  info: FileText,
  ai_action: Sparkles,
}

const COLOR_MAP = {
  success: 'border-green-500/30 bg-green-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
  ai_action: 'border-purple-500/30 bg-purple-500/10',
}

const ICON_COLOR_MAP = {
  success: 'text-green-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
  ai_action: 'text-purple-400',
}

export default function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((msg: ToastMessage) => {
    setToasts(prev => [...prev.slice(-4), msg])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== msg.id))
    }, 4000)
  }, [])

  useEffect(() => {
    toastListeners.push(addToast)
    return () => {
      const idx = toastListeners.indexOf(addToast)
      if (idx >= 0) toastListeners.splice(idx, 1)
    }
  }, [addToast])

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => {
        const Icon = ICON_MAP[toast.type]
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border backdrop-blur-xl shadow-lg animate-slide-up',
              COLOR_MAP[toast.type]
            )}
          >
            <Icon size={16} className={cn('flex-shrink-0 mt-0.5', ICON_COLOR_MAP[toast.type])} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-slate-200">{toast.title}</p>
              {toast.description && (
                <p className="text-[11px] text-slate-400 mt-0.5">{toast.description}</p>
              )}
            </div>
            <button onClick={() => dismiss(toast.id)} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
