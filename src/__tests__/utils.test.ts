import { cn, getSeverityOrder, getRatingOrder, formatDate, generateId } from '@/lib/utils'

describe('cn (classname merge)', () => {
  it('merges simple strings', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('handles undefined and null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b')
  })
})

describe('getSeverityOrder', () => {
  it('returns correct order', () => {
    expect(getSeverityOrder('critical')).toBe(0)
    expect(getSeverityOrder('high')).toBe(1)
    expect(getSeverityOrder('medium')).toBe(2)
    expect(getSeverityOrder('low')).toBe(3)
  })

  it('critical < high < medium < low', () => {
    expect(getSeverityOrder('critical')).toBeLessThan(getSeverityOrder('high'))
    expect(getSeverityOrder('high')).toBeLessThan(getSeverityOrder('medium'))
    expect(getSeverityOrder('medium')).toBeLessThan(getSeverityOrder('low'))
  })
})

describe('getRatingOrder', () => {
  it('returns correct hierarchy', () => {
    expect(getRatingOrder('ineffective')).toBeLessThan(getRatingOrder('partially_effective'))
    expect(getRatingOrder('partially_effective')).toBeLessThan(getRatingOrder('largely_effective'))
    expect(getRatingOrder('largely_effective')).toBeLessThan(getRatingOrder('effective'))
  })

  it('not_assessed is lowest priority', () => {
    expect(getRatingOrder('not_assessed')).toBeGreaterThan(getRatingOrder('effective'))
  })
})

describe('formatDate', () => {
  it('formats ISO date to pt-BR', () => {
    const result = formatDate('2024-06-15T14:30:00Z')
    expect(result).toMatch(/15\/06\/2024/)
  })
})

describe('generateId', () => {
  it('generates unique ids', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
  })

  it('contains timestamp component', () => {
    const id = generateId()
    const tsStr = id.split('-')[0]
    const ts = parseInt(tsStr, 10)
    expect(ts).toBeGreaterThan(Date.now() - 5000)
    expect(ts).toBeLessThanOrEqual(Date.now())
  })
})
