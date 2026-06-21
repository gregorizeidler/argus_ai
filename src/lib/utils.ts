import { clsx, type ClassValue } from 'clsx'
import { Audit, AuditStats, Rating, Severity, Pillar, RegulatoryMapping } from './types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function calculateAuditStats(audit: Audit): AuditStats {
  const assessedPillars = audit.pillars.filter(p => p.overallRating !== 'not_assessed').length
  const receivedEvidence = audit.evidence.filter(e => ['received', 'under_review', 'accepted'].includes(e.status)).length

  const findingsBySeverity = {
    critical: audit.findings.filter(f => f.severity === 'critical').length,
    high: audit.findings.filter(f => f.severity === 'high').length,
    medium: audit.findings.filter(f => f.severity === 'medium').length,
    low: audit.findings.filter(f => f.severity === 'low').length,
  }

  const totalTests = audit.pillars.flatMap(p => p.subAreas.flatMap(sa => sa.testProcedures)).length
  const completedTests = audit.pillars.flatMap(p => p.subAreas.flatMap(sa => sa.testProcedures)).filter(tp => tp.result !== 'not_tested').length

  const testedSamples = audit.samples.filter(s => s.status === 'tested').length

  return {
    totalPillars: audit.pillars.length,
    assessedPillars,
    totalEvidence: audit.evidence.length,
    receivedEvidence,
    totalFindings: audit.findings.length,
    criticalFindings: findingsBySeverity.critical,
    highFindings: findingsBySeverity.high,
    mediumFindings: findingsBySeverity.medium,
    lowFindings: findingsBySeverity.low,
    totalSamples: audit.samples.length,
    testedSamples,
    overallProgress: totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0,
  }
}

export function getSeverityOrder(severity: Severity): number {
  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  return order[severity]
}

export function getRatingOrder(rating: Rating): number {
  const order: Record<Rating, number> = { ineffective: 0, partially_effective: 1, largely_effective: 2, effective: 3, not_assessed: 4 }
  return order[rating]
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function computeSubAreaScore(pillar: Pillar, subAreaId: string): { score: number; rating: Rating; tested: number; total: number } {
  const sa = pillar.subAreas.find(s => s.id === subAreaId)
  if (!sa) return { score: 0, rating: 'not_assessed', tested: 0, total: 0 }
  const procs = sa.testProcedures
  const tested = procs.filter(t => t.result !== 'not_tested')
  if (tested.length === 0) return { score: 0, rating: 'not_assessed', tested: 0, total: procs.length }

  const scores: Record<string, number> = { pass: 100, partial: 50, fail: 0, not_applicable: -1 }
  const applicable = tested.filter(t => t.result !== 'not_applicable')
  if (applicable.length === 0) return { score: 100, rating: 'effective', tested: tested.length, total: procs.length }

  const avg = applicable.reduce((s, t) => s + (scores[t.result] ?? 0), 0) / applicable.length
  let rating: Rating = 'ineffective'
  if (avg >= 85) rating = 'effective'
  else if (avg >= 65) rating = 'largely_effective'
  else if (avg >= 40) rating = 'partially_effective'

  return { score: Math.round(avg), rating, tested: tested.length, total: procs.length }
}

export function computePillarScore(pillar: Pillar): { score: number; rating: Rating } {
  const results = pillar.subAreas.map(sa => computeSubAreaScore(pillar, sa.id))
  const assessed = results.filter(r => r.rating !== 'not_assessed')
  if (assessed.length === 0) return { score: 0, rating: 'not_assessed' }
  const avg = assessed.reduce((s, r) => s + r.score, 0) / assessed.length
  let rating: Rating = 'ineffective'
  if (avg >= 85) rating = 'effective'
  else if (avg >= 65) rating = 'largely_effective'
  else if (avg >= 40) rating = 'partially_effective'
  return { score: Math.round(avg), rating }
}

export function computeOverallScore(audit: Audit): { score: number; rating: Rating } {
  const pillarResults = audit.pillars.map(p => ({ ...computePillarScore(p), weight: p.weight }))
  const assessed = pillarResults.filter(r => r.rating !== 'not_assessed')
  if (assessed.length === 0) return { score: 0, rating: 'not_assessed' }
  const totalWeight = assessed.reduce((s, r) => s + r.weight, 0)
  const weighted = assessed.reduce((s, r) => s + r.score * r.weight, 0) / totalWeight
  let rating: Rating = 'ineffective'
  if (weighted >= 85) rating = 'effective'
  else if (weighted >= 65) rating = 'largely_effective'
  else if (weighted >= 40) rating = 'partially_effective'
  return { score: Math.round(weighted), rating }
}

export function buildRegulatoryMappings(pillars: Pillar[]): RegulatoryMapping[] {
  const mappings: RegulatoryMapping[] = []
  for (const p of pillars) {
    for (const sa of p.subAreas) {
      for (const tp of sa.testProcedures) {
        for (const reg of tp.regulatoryBasis) {
          const fatf = reg.includes('FATF') || reg.includes('GAFI') ? reg : undefined
          mappings.push({
            regulationRef: reg,
            regulationArticle: reg,
            fatfRecommendation: fatf,
            pillarCode: p.code,
            subAreaCode: sa.code,
            testProcedureCodes: [tp.code],
            description: tp.description,
          })
        }
      }
    }
  }
  const grouped: Record<string, RegulatoryMapping> = {}
  for (const m of mappings) {
    const key = m.regulationRef
    if (grouped[key]) {
      if (!grouped[key].testProcedureCodes.includes(m.testProcedureCodes[0])) {
        grouped[key].testProcedureCodes.push(m.testProcedureCodes[0])
      }
    } else {
      grouped[key] = { ...m }
    }
  }
  return Object.values(grouped)
}

export function calculateOverallRating(audit: Audit): Rating {
  const assessed = audit.pillars.filter(p => p.overallRating !== 'not_assessed')
  if (assessed.length === 0) return 'not_assessed'

  const scores: Record<Rating, number> = {
    effective: 4,
    largely_effective: 3,
    partially_effective: 2,
    ineffective: 1,
    not_assessed: 0,
  }

  const totalWeight = assessed.reduce((sum, p) => sum + p.weight, 0)
  const weightedScore = assessed.reduce((sum, p) => sum + scores[p.overallRating] * p.weight, 0)
  const avg = weightedScore / totalWeight

  if (avg >= 3.5) return 'effective'
  if (avg >= 2.5) return 'largely_effective'
  if (avg >= 1.5) return 'partially_effective'
  return 'ineffective'
}
