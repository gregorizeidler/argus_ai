export type AuditAction =
  | 'audit.create' | 'audit.update' | 'audit.delete' | 'audit.phase_change'
  | 'evidence.add' | 'evidence.update_status' | 'evidence.upload' | 'evidence.analyze'
  | 'finding.create' | 'finding.update' | 'finding.management_response'
  | 'test.execute' | 'test.update_result'
  | 'pillar.rate' | 'subarea.rate'
  | 'sample.create' | 'sample.update'
  | 'interview.create' | 'interview.update' | 'interview.delete'
  | 'milestone.create' | 'milestone.update' | 'milestone.delete'
  | 'memo.save' | 'memo.generate'
  | 'risk_matrix.update' | 'risk_matrix.remove'
  | 'report.generate' | 'report.export'
  | 'user.login' | 'user.logout'

export interface AuditLogEntry {
  id: string
  timestamp: string
  userId: string | null
  userName: string | null
  auditId: string | null
  action: AuditAction
  entityType: string
  entityId: string | null
  details: Record<string, unknown>
  previousValue?: unknown
  newValue?: unknown
}

const LOG_STORAGE_KEY = 'argus-audit-log'
const MAX_LOG_ENTRIES = 10000

function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getStoredLogs(): AuditLogEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLogs(logs: AuditLogEntry[]) {
  if (typeof window === 'undefined') return
  const trimmed = logs.slice(-MAX_LOG_ENTRIES)
  try {
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    const reduced = trimmed.slice(-Math.floor(MAX_LOG_ENTRIES / 2))
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(reduced))
  }
}

export function logAuditEvent(params: {
  action: AuditAction
  auditId?: string | null
  entityType: string
  entityId?: string | null
  details?: Record<string, unknown>
  previousValue?: unknown
  newValue?: unknown
  userId?: string | null
  userName?: string | null
}): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    userId: params.userId ?? null,
    userName: params.userName ?? null,
    auditId: params.auditId ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    details: params.details ?? {},
    previousValue: params.previousValue,
    newValue: params.newValue,
  }

  const logs = getStoredLogs()
  logs.push(entry)
  saveLogs(logs)

  if (process.env.NODE_ENV === 'development') {
    console.debug(`[AUDIT] ${entry.action}`, {
      entity: `${entry.entityType}/${entry.entityId}`,
      audit: entry.auditId,
      user: entry.userName,
    })
  }

  return entry
}

export function getAuditLogs(filters?: {
  auditId?: string
  action?: AuditAction
  entityType?: string
  userId?: string
  from?: string
  to?: string
  limit?: number
}): AuditLogEntry[] {
  let logs = getStoredLogs()

  if (filters?.auditId) logs = logs.filter(l => l.auditId === filters.auditId)
  if (filters?.action) logs = logs.filter(l => l.action === filters.action)
  if (filters?.entityType) logs = logs.filter(l => l.entityType === filters.entityType)
  if (filters?.userId) logs = logs.filter(l => l.userId === filters.userId)
  if (filters?.from) logs = logs.filter(l => l.timestamp >= filters.from!)
  if (filters?.to) logs = logs.filter(l => l.timestamp <= filters.to!)

  logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  if (filters?.limit) logs = logs.slice(0, filters.limit)

  return logs
}

export function clearAuditLogs() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LOG_STORAGE_KEY)
}

export function exportAuditLogsCSV(logs: AuditLogEntry[]): string {
  const headers = ['ID', 'Timestamp', 'User', 'Audit ID', 'Action', 'Entity Type', 'Entity ID', 'Details']
  const rows = logs.map(l => [
    l.id,
    l.timestamp,
    l.userName || l.userId || 'system',
    l.auditId || '',
    l.action,
    l.entityType,
    l.entityId || '',
    JSON.stringify(l.details),
  ])
  return [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}
