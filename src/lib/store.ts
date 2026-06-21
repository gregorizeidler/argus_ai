import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Audit, AuditPhase, AuditPlanning, ChatMessage, Evidence, EvidenceStatus, Finding, ActionPlan, Pillar, Rating, Sample, AuditConversation, ImportedDataset, Interview, AuditMilestone, PillarMemo, RiskMatrixItem } from './types'
import { createDefaultPillars } from './audit-framework'
import { generateId, calculateOverallRating } from './utils'

export type ActiveTab = 'chat' | 'evidence' | 'findings' | 'samples' | 'procedures' | 'data' | 'pbc' | 'planning' | 'interviews' | 'risk_matrix' | 'timeline' | 'regulatory' | 'workpapers' | 'memo'

interface AuditStore {
  audits: Audit[]
  currentAuditId: string | null
  activePillarId: string | null
  activeTab: ActiveTab
  isChatLoading: boolean

  setCurrentAudit: (id: string) => void
  setActivePillar: (id: string | null) => void
  setActiveTab: (tab: ActiveTab) => void
  setIsChatLoading: (loading: boolean) => void

  createAudit: (data: { name: string; institution: Audit['institution'] }) => string
  updateAuditPhase: (auditId: string, phase: AuditPhase) => void
  getCurrentAudit: () => Audit | undefined

  addMessage: (auditId: string, pillarId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  getConversation: (auditId: string, pillarId: string) => AuditConversation | undefined

  addEvidence: (auditId: string, evidence: Omit<Evidence, 'id' | 'requestedAt'>) => void
  updateEvidenceStatus: (auditId: string, evidenceId: string, status: EvidenceStatus, notes?: string) => void
  updateEvidenceAiAnalysis: (auditId: string, evidenceId: string, analysis: string) => void
  updateEvidenceDueDate: (auditId: string, evidenceId: string, dueDate: string) => void
  updateEvidencePriority: (auditId: string, evidenceId: string, priority: 'high' | 'medium' | 'low') => void

  addFinding: (auditId: string, finding: Omit<Finding, 'id' | 'createdAt'>) => void
  updateFinding: (auditId: string, findingId: string, updates: Partial<Finding>) => void
  updateFindingActionPlan: (auditId: string, findingId: string, actionPlan: ActionPlan) => void

  addSample: (auditId: string, sample: Omit<Sample, 'id'>) => void
  updateSample: (auditId: string, sampleId: string, updates: Partial<Sample>) => void

  updatePillarRating: (auditId: string, pillarId: string, rating: Rating) => void
  updateSubAreaRating: (auditId: string, pillarId: string, subAreaId: string, rating: Rating) => void
  updateTestResult: (auditId: string, pillarId: string, subAreaId: string, testId: string, result: 'pass' | 'fail' | 'partial' | 'not_applicable', observations: string) => void
  updatePillarCompletion: (auditId: string, pillarId: string) => void

  updateEvidenceFile: (auditId: string, evidenceId: string, data: { fileName: string; fileSize: number; uploadPath: string; textPreview: string }) => void
  linkEvidenceToTest: (auditId: string, evidenceId: string, testProcedureId: string) => void
  unlinkEvidenceFromTest: (auditId: string, evidenceId: string, testProcedureId: string) => void
  addDataset: (auditId: string, dataset: Omit<ImportedDataset, 'id' | 'importedAt'>) => void
  deleteAudit: (auditId: string) => void
  saveReportContent: (auditId: string, content: string) => void
  updateTestWorkpaper: (auditId: string, pillarId: string, subAreaId: string, testId: string, updates: { workpaperNotes?: string; scope?: string; conclusion?: string }) => void
  updateAuditPlanning: (auditId: string, planning: Partial<AuditPlanning>) => void
  addInterview: (auditId: string, interview: Omit<Interview, 'id' | 'createdAt'>) => void
  updateInterview: (auditId: string, interviewId: string, updates: Partial<Interview>) => void
  deleteInterview: (auditId: string, interviewId: string) => void
  addMilestone: (auditId: string, milestone: Omit<AuditMilestone, 'id'>) => void
  updateMilestone: (auditId: string, milestoneId: string, updates: Partial<AuditMilestone>) => void
  deleteMilestone: (auditId: string, milestoneId: string) => void
  savePillarMemo: (auditId: string, memo: PillarMemo) => void
  updateRiskMatrixItem: (auditId: string, findingId: string, likelihood: 1|2|3|4|5, impact: 1|2|3|4|5) => void
  removeRiskMatrixItem: (auditId: string, findingId: string) => void
}

export const useAuditStore = create<AuditStore>()(
  persist(
    (set, get) => ({
      audits: [],
      currentAuditId: null,
      activePillarId: null,
      activeTab: 'chat',
      isChatLoading: false,

      setCurrentAudit: (id) => set({ currentAuditId: id }),
      setActivePillar: (id) => set({ activePillarId: id, activeTab: 'chat' }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setIsChatLoading: (loading) => set({ isChatLoading: loading }),

      getCurrentAudit: () => {
        const state = get()
        return state.audits.find(a => a.id === state.currentAuditId)
      },

      createAudit: (data) => {
        const id = generateId()
        const now = new Date().toISOString()
        const newAudit: Audit = {
          id,
          name: data.name,
          institution: data.institution,
          scope: {
            period: { start: now, end: '' },
            regulatoryFramework: [
              'Circular BACEN nº 3.978/2020',
              'Carta Circular BACEN nº 4.001/2020',
              'Lei nº 9.613/1998',
            ],
            objectives: [
              'Avaliar a adequação e efetividade do programa de PLD-FT',
              'Identificar gaps regulatórios e oportunidades de melhoria',
              'Testar controles-chave através de amostragem',
            ],
            limitations: [],
            methodology: 'ARGUS - Metodologia proprietária de auditoria PLD-FT baseada em abordagem de risco',
          },
          phase: 'planning',
          pillars: createDefaultPillars(),
          evidence: [],
          samples: [],
          findings: [],
          conversations: [],
          interviews: [],
          milestones: [],
          pillarMemos: [],
          riskMatrixItems: [],
          datasets: [],
          createdAt: now,
          updatedAt: now,
          overallProgress: 0,
          overallRating: 'not_assessed',
        }

        set(state => ({
          audits: [...state.audits, newAudit],
          currentAuditId: id,
        }))
        return id
      },

      updateAuditPhase: (auditId, phase) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId ? { ...a, phase, updatedAt: new Date().toISOString() } : a
          ),
        }))
      },

      addMessage: (auditId, pillarId, message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: generateId(),
          timestamp: new Date().toISOString(),
          pillarId,
        }

        set(state => ({
          audits: state.audits.map(a => {
            if (a.id !== auditId) return a
            const convIndex = a.conversations.findIndex(c => c.pillarId === pillarId)
            let conversations: AuditConversation[]
            if (convIndex >= 0) {
              conversations = a.conversations.map((c, i) =>
                i === convIndex
                  ? { ...c, messages: [...c.messages, newMessage], lastActivity: newMessage.timestamp }
                  : c
              )
            } else {
              conversations = [...a.conversations, {
                id: generateId(),
                pillarId,
                messages: [newMessage],
                lastActivity: newMessage.timestamp,
              }]
            }
            return { ...a, conversations, updatedAt: newMessage.timestamp }
          }),
        }))
      },

      getConversation: (auditId, pillarId) => {
        const audit = get().audits.find(a => a.id === auditId)
        return audit?.conversations.find(c => c.pillarId === pillarId)
      },

      addEvidence: (auditId, evidence) => {
        const newEvidence: Evidence = {
          ...evidence,
          id: generateId(),
          requestedAt: new Date().toISOString(),
        }
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId ? { ...a, evidence: [...a.evidence, newEvidence], updatedAt: new Date().toISOString() } : a
          ),
        }))
      },

      updateEvidenceStatus: (auditId, evidenceId, status, notes) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? {
                  ...a,
                  evidence: a.evidence.map(e =>
                    e.id === evidenceId ? { ...e, status, reviewNotes: notes || e.reviewNotes, reviewedAt: new Date().toISOString() } : e
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : a
          ),
        }))
      },

      updateEvidenceAiAnalysis: (auditId, evidenceId, analysis) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? {
                  ...a,
                  evidence: a.evidence.map(e =>
                    e.id === evidenceId ? { ...e, aiAnalysis: analysis } : e
                  ),
                }
              : a
          ),
        }))
      },

      updateEvidenceDueDate: (auditId, evidenceId, dueDate) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? { ...a, evidence: a.evidence.map(e => e.id === evidenceId ? { ...e, dueDate } : e), updatedAt: new Date().toISOString() }
              : a
          ),
        }))
      },

      updateEvidencePriority: (auditId, evidenceId, priority) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? { ...a, evidence: a.evidence.map(e => e.id === evidenceId ? { ...e, priority } : e), updatedAt: new Date().toISOString() }
              : a
          ),
        }))
      },

      addFinding: (auditId, finding) => {
        const newFinding: Finding = {
          ...finding,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }
        set(state => ({
          audits: state.audits.map(a => {
            if (a.id !== auditId) return a
            const updatedAudit = { ...a, findings: [...a.findings, newFinding], updatedAt: new Date().toISOString() }
            updatedAudit.overallRating = calculateOverallRating(updatedAudit)
            return updatedAudit
          }),
        }))
      },

      updateFinding: (auditId, findingId, updates) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? { ...a, findings: a.findings.map(f => f.id === findingId ? { ...f, ...updates } : f), updatedAt: new Date().toISOString() }
              : a
          ),
        }))
      },

      updateFindingActionPlan: (auditId, findingId, actionPlan) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? { ...a, findings: a.findings.map(f => f.id === findingId ? { ...f, actionPlan } : f), updatedAt: new Date().toISOString() }
              : a
          ),
        }))
      },

      addSample: (auditId, sample) => {
        const newSample: Sample = { ...sample, id: generateId() }
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId ? { ...a, samples: [...a.samples, newSample], updatedAt: new Date().toISOString() } : a
          ),
        }))
      },

      updateSample: (auditId, sampleId, updates) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? { ...a, samples: a.samples.map(s => s.id === sampleId ? { ...s, ...updates } : s), updatedAt: new Date().toISOString() }
              : a
          ),
        }))
      },

      updatePillarRating: (auditId, pillarId, rating) => {
        set(state => ({
          audits: state.audits.map(a => {
            if (a.id !== auditId) return a
            const updatedAudit = {
              ...a,
              pillars: a.pillars.map(p => p.id === pillarId ? { ...p, overallRating: rating } : p),
              updatedAt: new Date().toISOString(),
            }
            updatedAudit.overallRating = calculateOverallRating(updatedAudit)
            return updatedAudit
          }),
        }))
      },

      updateSubAreaRating: (auditId, pillarId, subAreaId, rating) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? {
                  ...a,
                  pillars: a.pillars.map(p =>
                    p.id === pillarId
                      ? { ...p, subAreas: p.subAreas.map(sa => sa.id === subAreaId ? { ...sa, rating } : sa) }
                      : p
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : a
          ),
        }))
      },

      updateTestResult: (auditId, pillarId, subAreaId, testId, result, observations) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? {
                  ...a,
                  pillars: a.pillars.map(p =>
                    p.id === pillarId
                      ? {
                          ...p,
                          subAreas: p.subAreas.map(sa =>
                            sa.id === subAreaId
                              ? {
                                  ...sa,
                                  testProcedures: sa.testProcedures.map(tp =>
                                    tp.id === testId ? { ...tp, result, observations, testedAt: new Date().toISOString() } : tp
                                  ),
                                }
                              : sa
                          ),
                        }
                      : p
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : a
          ),
        }))
      },

      updatePillarCompletion: (auditId, pillarId) => {
        set(state => ({
          audits: state.audits.map(a => {
            if (a.id !== auditId) return a
            return {
              ...a,
              pillars: a.pillars.map(p => {
                if (p.id !== pillarId) return p
                const allTests = p.subAreas.flatMap(sa => sa.testProcedures)
                const completedTests = allTests.filter(t => t.result !== 'not_tested')
                return { ...p, completionPercent: allTests.length > 0 ? Math.round((completedTests.length / allTests.length) * 100) : 0 }
              }),
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
      },

      updateEvidenceFile: (auditId, evidenceId, data) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? {
                  ...a,
                  evidence: a.evidence.map(e =>
                    e.id === evidenceId ? { ...e, ...data, status: 'received' as const, uploadedAt: new Date().toISOString() } : e
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : a
          ),
        }))
      },

      linkEvidenceToTest: (auditId, evidenceId, testProcedureId) => {
        set(state => ({
          audits: state.audits.map(a => {
            if (a.id !== auditId) return a
            return {
              ...a,
              evidence: a.evidence.map(e => {
                if (e.id !== evidenceId) return e
                const linked = e.linkedTestProcedureIds || []
                if (linked.includes(testProcedureId)) return e
                return { ...e, linkedTestProcedureIds: [...linked, testProcedureId] }
              }),
              pillars: a.pillars.map(p => ({
                ...p,
                subAreas: p.subAreas.map(sa => ({
                  ...sa,
                  testProcedures: sa.testProcedures.map(tp => {
                    if (tp.id !== testProcedureId) return tp
                    const eIds = tp.evidenceIds || []
                    if (eIds.includes(evidenceId)) return tp
                    return { ...tp, evidenceIds: [...eIds, evidenceId] }
                  }),
                })),
              })),
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
      },

      unlinkEvidenceFromTest: (auditId, evidenceId, testProcedureId) => {
        set(state => ({
          audits: state.audits.map(a => {
            if (a.id !== auditId) return a
            return {
              ...a,
              evidence: a.evidence.map(e => {
                if (e.id !== evidenceId) return e
                return { ...e, linkedTestProcedureIds: (e.linkedTestProcedureIds || []).filter(id => id !== testProcedureId) }
              }),
              pillars: a.pillars.map(p => ({
                ...p,
                subAreas: p.subAreas.map(sa => ({
                  ...sa,
                  testProcedures: sa.testProcedures.map(tp => {
                    if (tp.id !== testProcedureId) return tp
                    return { ...tp, evidenceIds: (tp.evidenceIds || []).filter(id => id !== evidenceId) }
                  }),
                })),
              })),
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
      },

      addDataset: (auditId, dataset) => {
        const newDataset: ImportedDataset = {
          ...dataset,
          id: generateId(),
          importedAt: new Date().toISOString(),
        }
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId ? { ...a, datasets: [...(a.datasets || []), newDataset], updatedAt: new Date().toISOString() } : a
          ),
        }))
      },

      deleteAudit: (auditId) => {
        set(state => ({
          audits: state.audits.filter(a => a.id !== auditId),
          currentAuditId: state.currentAuditId === auditId ? null : state.currentAuditId,
        }))
      },

      saveReportContent: (auditId, content) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId ? { ...a, reportContent: content, updatedAt: new Date().toISOString() } : a
          ),
        }))
      },

      updateTestWorkpaper: (auditId, pillarId, subAreaId, testId, updates) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? {
                  ...a,
                  pillars: a.pillars.map(p =>
                    p.id === pillarId
                      ? {
                          ...p,
                          subAreas: p.subAreas.map(sa =>
                            sa.id === subAreaId
                              ? {
                                  ...sa,
                                  testProcedures: sa.testProcedures.map(tp =>
                                    tp.id === testId ? { ...tp, ...updates } : tp
                                  ),
                                }
                              : sa
                          ),
                        }
                      : p
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : a
          ),
        }))
      },

      updateAuditPlanning: (auditId, planning) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? {
                  ...a,
                  planning: { ...(a.planning || { auditPeriodStart: '', auditPeriodEnd: '', tolerableErrorRate: 5, confidenceLevel: 95, scopeNotes: '', limitations: [], teamNotes: '', priorFindings: [] }), ...planning },
                  updatedAt: new Date().toISOString(),
                }
              : a
          ),
        }))
      },

      addInterview: (auditId, interview) => {
        const newInterview: Interview = { ...interview, id: generateId(), createdAt: new Date().toISOString() }
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId ? { ...a, interviews: [...(a.interviews || []), newInterview], updatedAt: new Date().toISOString() } : a
          ),
        }))
      },

      updateInterview: (auditId, interviewId, updates) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? { ...a, interviews: (a.interviews || []).map(i => i.id === interviewId ? { ...i, ...updates } : i), updatedAt: new Date().toISOString() }
              : a
          ),
        }))
      },

      deleteInterview: (auditId, interviewId) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? { ...a, interviews: (a.interviews || []).filter(i => i.id !== interviewId), updatedAt: new Date().toISOString() }
              : a
          ),
        }))
      },

      addMilestone: (auditId, milestone) => {
        const newMilestone: AuditMilestone = { ...milestone, id: generateId() }
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId ? { ...a, milestones: [...(a.milestones || []), newMilestone], updatedAt: new Date().toISOString() } : a
          ),
        }))
      },

      updateMilestone: (auditId, milestoneId, updates) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? { ...a, milestones: (a.milestones || []).map(m => m.id === milestoneId ? { ...m, ...updates } : m), updatedAt: new Date().toISOString() }
              : a
          ),
        }))
      },

      deleteMilestone: (auditId, milestoneId) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? { ...a, milestones: (a.milestones || []).filter(m => m.id !== milestoneId), updatedAt: new Date().toISOString() }
              : a
          ),
        }))
      },

      savePillarMemo: (auditId, memo) => {
        set(state => ({
          audits: state.audits.map(a => {
            if (a.id !== auditId) return a
            const memos = (a.pillarMemos || []).filter(m => m.pillarId !== memo.pillarId)
            return { ...a, pillarMemos: [...memos, memo], updatedAt: new Date().toISOString() }
          }),
        }))
      },

      updateRiskMatrixItem: (auditId, findingId, likelihood, impact) => {
        set(state => ({
          audits: state.audits.map(a => {
            if (a.id !== auditId) return a
            const items = (a.riskMatrixItems || []).filter(r => r.findingId !== findingId)
            return { ...a, riskMatrixItems: [...items, { findingId, likelihood, impact }], updatedAt: new Date().toISOString() }
          }),
        }))
      },

      removeRiskMatrixItem: (auditId, findingId) => {
        set(state => ({
          audits: state.audits.map(a =>
            a.id === auditId
              ? { ...a, riskMatrixItems: (a.riskMatrixItems || []).filter(r => r.findingId !== findingId), updatedAt: new Date().toISOString() }
              : a
          ),
        }))
      },
    }),
    {
      name: 'argus-pld-storage',
    }
  )
)
