import { logAuditEvent, getAuditLogs, clearAuditLogs, exportAuditLogsCSV } from '@/lib/audit-log'

const mockStorage: Record<string, string> = {}
beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => { mockStorage[key] = val },
      removeItem: (key: string) => { delete mockStorage[key] },
    },
    writable: true,
  })
})

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k])
})

describe('logAuditEvent', () => {
  it('creates a log entry', () => {
    const entry = logAuditEvent({
      action: 'audit.create',
      auditId: 'audit-1',
      entityType: 'audit',
      entityId: 'audit-1',
      details: { name: 'Test Audit' },
      userName: 'admin',
    })

    expect(entry.id).toBeTruthy()
    expect(entry.action).toBe('audit.create')
    expect(entry.auditId).toBe('audit-1')
    expect(entry.userName).toBe('admin')
  })

  it('stores entries in localStorage', () => {
    logAuditEvent({ action: 'finding.create', entityType: 'finding' })
    logAuditEvent({ action: 'evidence.add', entityType: 'evidence' })

    const logs = getAuditLogs()
    expect(logs.length).toBe(2)
  })
})

describe('getAuditLogs', () => {
  it('filters by auditId', () => {
    logAuditEvent({ action: 'audit.create', auditId: 'a1', entityType: 'audit' })
    logAuditEvent({ action: 'audit.create', auditId: 'a2', entityType: 'audit' })

    const filtered = getAuditLogs({ auditId: 'a1' })
    expect(filtered.length).toBe(1)
    expect(filtered[0].auditId).toBe('a1')
  })

  it('filters by action', () => {
    logAuditEvent({ action: 'finding.create', entityType: 'finding' })
    logAuditEvent({ action: 'evidence.add', entityType: 'evidence' })

    const filtered = getAuditLogs({ action: 'finding.create' })
    expect(filtered.length).toBe(1)
  })

  it('returns all entries', () => {
    logAuditEvent({ action: 'audit.create', entityType: 'audit', details: { order: 1 } })
    logAuditEvent({ action: 'audit.update', entityType: 'audit', details: { order: 2 } })

    const logs = getAuditLogs()
    expect(logs.length).toBe(2)
    const actions = logs.map(l => l.action)
    expect(actions).toContain('audit.create')
    expect(actions).toContain('audit.update')
  })
})

describe('clearAuditLogs', () => {
  it('removes all logs', () => {
    logAuditEvent({ action: 'audit.create', entityType: 'audit' })
    clearAuditLogs()
    expect(getAuditLogs().length).toBe(0)
  })
})

describe('exportAuditLogsCSV', () => {
  it('generates valid CSV', () => {
    const entry = logAuditEvent({ action: 'test.execute', entityType: 'test', entityId: 't-1' })
    const csv = exportAuditLogsCSV([entry])

    expect(csv).toContain('ID')
    expect(csv).toContain('test.execute')
    expect(csv.split('\n').length).toBe(2)
  })
})
