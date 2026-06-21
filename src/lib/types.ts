// ============================================================
// ARGUS PLD - Advanced AML/CFT Audit System
// Core Type Definitions
// ============================================================

export type AuditPhase = 'planning' | 'fieldwork' | 'testing' | 'reporting' | 'completed'
export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type Rating = 'effective' | 'largely_effective' | 'partially_effective' | 'ineffective' | 'not_assessed'
export type TestResult = 'pass' | 'fail' | 'partial' | 'not_tested' | 'not_applicable'
export type EvidenceStatus = 'requested' | 'received' | 'under_review' | 'accepted' | 'rejected' | 'pending_clarification'
export type SampleStatus = 'selected' | 'testing' | 'tested' | 'exception_found'
export type FindingStatus = 'draft' | 'confirmed' | 'management_response' | 'closed'
export type MessageRole = 'system' | 'assistant' | 'user'

export interface Institution {
  name: string
  type: 'bank' | 'broker' | 'insurance' | 'payment_institution' | 'crypto_exchange' | 'other'
  regulators: string[]
  segment: string
  size: 'large' | 'medium' | 'small'
  clientCount?: number
  transactionVolume?: string
  riskProfile?: 'high' | 'medium' | 'low'
}

export interface AuditScope {
  period: { start: string; end: string }
  regulatoryFramework: string[]
  objectives: string[]
  limitations: string[]
  methodology: string
}

export interface TestProcedure {
  id: string
  code: string
  description: string
  methodology: string
  sampleSize?: string
  regulatoryBasis: string[]
  result: TestResult
  observations: string
  evidenceIds: string[]
  sampleIds: string[]
  workpaperNotes?: string
  scope?: string
  conclusion?: string
  testedAt?: string
  testType?: 'design' | 'operating' | 'both'
}

export interface SubArea {
  id: string
  code: string
  name: string
  description: string
  regulatoryBasis: string[]
  testProcedures: TestProcedure[]
  rating: Rating
  keyRisks: string[]
}

export interface Pillar {
  id: string
  number: number
  code: string
  name: string
  description: string
  icon: string
  regulatoryBasis: string[]
  subAreas: SubArea[]
  overallRating: Rating
  weight: number
  completionPercent: number
}

export interface Evidence {
  id: string
  pillarId: string
  subAreaId?: string
  name: string
  description: string
  type: 'policy' | 'procedure' | 'report' | 'system_screenshot' | 'sample' | 'training_material' | 'meeting_minutes' | 'correspondence' | 'data_extract' | 'other'
  status: EvidenceStatus
  fileName?: string
  fileSize?: number
  uploadedAt?: string
  reviewedAt?: string
  reviewNotes?: string
  requestedAt: string
  dueDate?: string
  priority?: 'high' | 'medium' | 'low'
  aiAnalysis?: string
  uploadPath?: string
  textPreview?: string
  linkedTestProcedureIds?: string[]
}

export interface Sample {
  id: string
  pillarId: string
  subAreaId: string
  testProcedureId: string
  description: string
  population: string
  populationSize: number
  sampleSize: number
  selectionMethod: 'random' | 'stratified' | 'judgmental' | 'monetary_unit'
  items: SampleItem[]
  status: SampleStatus
  exceptionRate?: number
  conclusion?: string
}

export interface SampleItem {
  id: string
  reference: string
  description: string
  result: TestResult
  exception?: string
  details?: string
}

export interface ActionPlan {
  owner: string
  targetDate: string
  status: 'pending' | 'in_progress' | 'completed'
  description: string
}

export interface Finding {
  id: string
  pillarId: string
  subAreaId?: string
  title: string
  severity: Severity
  status: FindingStatus
  condition: string
  criteria: string
  cause: string
  effect: string
  recommendation: string
  managementResponse?: string
  managementAgreement?: 'agree' | 'partially_agree' | 'disagree'
  repeatFindingId?: string
  rootCauseCategory?: 'people' | 'process' | 'technology' | 'governance'
  remediationValidated?: boolean
  remediationValidationDate?: string
  remediationValidationNotes?: string
  actionPlan?: ActionPlan
  evidenceIds?: string[]
  testProcedureIds?: string[]
  regulatoryReference: string[]
  createdAt: string
  isAiGenerated: boolean
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  pillarId?: string
  attachments?: string[]
  metadata?: {
    action?: 'request_evidence' | 'request_sample' | 'create_finding' | 'rate_pillar' | 'analyze_document'
    data?: Record<string, unknown>
  }
}

export interface AuditConversation {
  id: string
  pillarId: string
  messages: ChatMessage[]
  lastActivity: string
}

export interface RiskMatrixCell {
  likelihood: 'high' | 'medium' | 'low'
  impact: 'high' | 'medium' | 'low'
  pillarIds: string[]
}

export interface AuditReport {
  executiveSummary: string
  scope: string
  methodology: string
  overallRating: Rating
  pillarSummaries: {
    pillarId: string
    rating: Rating
    summary: string
    keyFindings: string[]
  }[]
  findings: Finding[]
  riskMatrix: RiskMatrixCell[]
  recommendations: string[]
  conclusion: string
  generatedAt: string
}

export interface PriorFinding {
  id: string
  title: string
  severity: Severity
  status: 'open' | 'remediated' | 'partially_remediated' | 'not_addressed'
  originalDate: string
  followUpNotes?: string
}

export interface AuditPlanning {
  auditPeriodStart: string
  auditPeriodEnd: string
  materialityThreshold?: number
  tolerableErrorRate: number
  confidenceLevel: number
  scopeNotes: string
  limitations: string[]
  teamNotes: string
  priorFindings: PriorFinding[]
}

export interface Audit {
  id: string
  name: string
  institution: Institution
  scope: AuditScope
  planning?: AuditPlanning
  phase: AuditPhase
  pillars: Pillar[]
  evidence: Evidence[]
  samples: Sample[]
  findings: Finding[]
  conversations: AuditConversation[]
  interviews: Interview[]
  milestones: AuditMilestone[]
  pillarMemos: PillarMemo[]
  riskMatrixItems: RiskMatrixItem[]
  report?: AuditReport
  reportContent?: string
  datasets: ImportedDataset[]
  createdAt: string
  updatedAt: string
  overallProgress: number
  overallRating: Rating
}

export interface ImportedDataset {
  id: string
  name: string
  pillarId: string
  headers: string[]
  rows: Record<string, string>[]
  totalRows: number
  importedAt: string
  source: string
}

export interface Interview {
  id: string
  pillarId: string
  subAreaId?: string
  interviewee: string
  role: string
  date: string
  location?: string
  questions: InterviewQuestion[]
  summary: string
  conclusions: string
  createdAt: string
}

export interface InterviewQuestion {
  id: string
  question: string
  answer: string
  followUp?: string
}

export interface AuditMilestone {
  id: string
  phase: AuditPhase
  name: string
  targetDate: string
  completedDate?: string
  status: 'pending' | 'in_progress' | 'completed' | 'delayed'
  notes?: string
}

export interface WorkpaperRef {
  id: string
  code: string
  pillarId: string
  subAreaId?: string
  testProcedureId?: string
  findingId?: string
  evidenceId?: string
  title: string
  type: 'test' | 'finding' | 'memo' | 'interview' | 'sample' | 'analytics'
  preparedBy?: string
  reviewedBy?: string
  preparedAt?: string
  reviewedAt?: string
  status: 'draft' | 'prepared' | 'reviewed' | 'signed_off'
}

export interface RegulatoryMapping {
  regulationRef: string
  regulationArticle: string
  fatfRecommendation?: string
  pillarCode: string
  subAreaCode?: string
  testProcedureCodes: string[]
  description: string
}

export interface PillarMemo {
  pillarId: string
  scopeTested: string
  evidenceSummary: string
  testingSummary: string
  findingsSummary: string
  ratingJustification: string
  conclusion: string
  generatedAt: string
  isAiGenerated: boolean
  preparedBy?: string
  reviewedBy?: string
  preparedAt?: string
  reviewedAt?: string
  status?: 'draft' | 'reviewed' | 'final'
  scopeLimitations?: string
  unresolvedMatters?: string
  managementActionSummary?: string
  isa610Reliance?: string
}

export interface RiskMatrixItem {
  findingId: string
  likelihood: 1 | 2 | 3 | 4 | 5
  impact: 1 | 2 | 3 | 4 | 5
}

export interface AuditStats {
  totalPillars: number
  assessedPillars: number
  totalEvidence: number
  receivedEvidence: number
  totalFindings: number
  criticalFindings: number
  highFindings: number
  mediumFindings: number
  lowFindings: number
  totalSamples: number
  testedSamples: number
  overallProgress: number
}
