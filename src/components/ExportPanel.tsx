'use client'

import { useState, useCallback } from 'react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { useAuditStore } from '@/lib/store'
import { Audit, Pillar, Finding } from '@/lib/types'
import {
  Download, FileText, Printer, Target, AlertTriangle, CheckCircle,
  Database, Loader2, BookOpen, Copy, X, ChevronRight,
} from '@/components/Icons'
import { cn, formatDate } from '@/lib/utils'
import { RATING_CONFIG, SEVERITY_CONFIG } from '@/lib/audit-framework'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF
    lastAutoTable: { finalY: number }
  }
}

type ExportFormat = 'pdf-report' | 'csv-findings' | 'csv-evidence' | 'zip-workpapers' | 'csv-tests'

interface FormatOption {
  id: ExportFormat
  title: string
  description: string
  badge: string
  icon: React.ElementType
  badgeColor: string
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'pdf-report',
    title: 'Relatório Completo de Auditoria',
    description: 'Relatório profissional com capa, sumário executivo, achados por pilar, matriz de risco e recomendações.',
    badge: 'PDF',
    icon: FileText,
    badgeColor: 'bg-red-500/20 text-red-400',
  },
  {
    id: 'csv-findings',
    title: 'Achados (Findings)',
    description: 'Todos os achados com condição, critério, causa, efeito, recomendação e resposta da administração.',
    badge: 'CSV',
    icon: AlertTriangle,
    badgeColor: 'bg-amber-500/20 text-amber-400',
  },
  {
    id: 'csv-evidence',
    title: 'Rastreador de Evidências',
    description: 'Status de todas as evidências: prioridade, prazo, situação de upload e resumo da análise de IA.',
    badge: 'CSV',
    icon: Database,
    badgeColor: 'bg-blue-500/20 text-blue-400',
  },
  {
    id: 'zip-workpapers',
    title: 'Workpaper Pack',
    description: 'Visualização estruturada de todos os papéis de trabalho organizados por pilar e subárea.',
    badge: 'PREVIEW',
    icon: BookOpen,
    badgeColor: 'bg-purple-500/20 text-purple-400',
  },
  {
    id: 'csv-tests',
    title: 'Resultados de Testes',
    description: 'Todos os procedimentos de teste com resultado, observações e data de execução.',
    badge: 'CSV',
    icon: CheckCircle,
    badgeColor: 'bg-emerald-500/20 text-emerald-400',
  },
]

const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function getPillarName(audit: Audit, pillarId: string): string {
  return audit.pillars.find(p => p.id === pillarId)?.name ?? pillarId
}

function getSubAreaName(audit: Audit, pillarId: string, subAreaId?: string): string {
  if (!subAreaId) return ''
  const pillar = audit.pillars.find(p => p.id === pillarId)
  return pillar?.subAreas.find(sa => sa.id === subAreaId)?.name ?? subAreaId
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[]
  lines.forEach((line: string, i: number) => {
    doc.text(line, x, y + i * lineHeight)
  })
  return y + lines.length * lineHeight
}

// ─── PDF Generation ──────────────────────────────────────────────

function generateFullReportPdf(audit: Audit) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  const addPageFooter = () => {
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`ARGUS PLD — Confidencial`, margin, pageHeight - 8)
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
    }
  }

  // ── Cover Page ────────────────────────────────────────────────
  doc.setFillColor(17, 24, 39)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  doc.setFillColor(59, 130, 246)
  doc.rect(0, 0, pageWidth, 4, 'F')

  doc.setTextColor(59, 130, 246)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('ARGUS PLD', margin, 50)

  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.5)
  doc.line(margin, 56, pageWidth - margin, 56)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(audit.name, contentWidth) as string[]
  let titleY = 80
  titleLines.forEach((line: string) => {
    doc.text(line, margin, titleY)
    titleY += 12
  })

  doc.setFontSize(16)
  doc.setTextColor(156, 163, 175)
  doc.setFont('helvetica', 'normal')
  doc.text('Relatório de Auditoria PLD/FT', margin, titleY + 10)

  doc.setFontSize(12)
  doc.setTextColor(209, 213, 219)
  let infoY = titleY + 35
  const infoItems = [
    ['Instituição', audit.institution.name],
    ['Tipo', audit.institution.type],
    ['Data do Relatório', formatDate(new Date().toISOString())],
    ['Fase', audit.phase],
    ['Classificação Geral', RATING_CONFIG[audit.overallRating]?.label ?? audit.overallRating],
  ]
  infoItems.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(156, 163, 175)
    doc.text(`${label}:`, margin, infoY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(255, 255, 255)
    doc.text(value, margin + 55, infoY)
    infoY += 8
  })

  doc.setTextColor(107, 114, 128)
  doc.setFontSize(9)
  doc.text('Este documento é confidencial e destinado exclusivamente aos gestores da auditoria.', margin, pageHeight - 30)
  doc.text(`Gerado em ${formatDate(new Date().toISOString())} via ARGUS PLD`, margin, pageHeight - 22)

  // ── Table of Contents ─────────────────────────────────────────
  doc.addPage()
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  doc.setTextColor(17, 24, 39)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Sumário', margin, 30)

  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(1)
  doc.line(margin, 34, margin + 30, 34)

  const tocItems = [
    '1. Sumário Executivo',
    '2. Metodologia',
    '3. Achados por Pilar',
    '4. Matriz de Risco',
    '5. Tabela de Achados Detalhados',
    '6. Apêndices',
  ]
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  let tocY = 50
  tocItems.forEach((item) => {
    doc.setTextColor(55, 65, 81)
    doc.text(item, margin + 4, tocY)
    tocY += 10
  })

  // ── Executive Summary ─────────────────────────────────────────
  doc.addPage()
  doc.setTextColor(17, 24, 39)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('1. Sumário Executivo', margin, 30)
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.8)
  doc.line(margin, 34, margin + 50, 34)

  const overallCfg = RATING_CONFIG[audit.overallRating]
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(55, 65, 81)

  const execLines = [
    `A auditoria "${audit.name}" da instituição ${audit.institution.name} (${audit.institution.type}) ` +
    `avaliou o programa de PLD/FT com base na Circular BACEN nº 3.978/2020, CC 4.001/2020 e recomendações GAFI/FATF.`,
    '',
    `Classificação Geral: ${overallCfg?.label ?? audit.overallRating}`,
    `Total de Pilares: ${audit.pillars.length}`,
    `Total de Achados: ${audit.findings.length}` +
      (audit.findings.filter(f => f.severity === 'critical').length > 0
        ? ` (${audit.findings.filter(f => f.severity === 'critical').length} críticos)`
        : ''),
    `Evidências Coletadas: ${audit.evidence.filter(e => ['received', 'accepted', 'under_review'].includes(e.status)).length}/${audit.evidence.length}`,
  ]
  let execY = 44
  execLines.forEach(line => {
    if (line === '') { execY += 4; return }
    execY = addWrappedText(doc, line, margin, execY, contentWidth, 5.5)
    execY += 2
  })

  if (audit.report?.executiveSummary) {
    execY += 4
    execY = addWrappedText(doc, audit.report.executiveSummary, margin, execY, contentWidth, 5.5)
  }

  // ── Methodology ───────────────────────────────────────────────
  doc.addPage()
  doc.setTextColor(17, 24, 39)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('2. Metodologia', margin, 30)
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.8)
  doc.line(margin, 34, margin + 40, 34)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(55, 65, 81)
  let methY = 44
  methY = addWrappedText(doc, `Metodologia: ${audit.scope.methodology}`, margin, methY, contentWidth, 5.5)
  methY += 6

  if (audit.scope.regulatoryFramework.length > 0) {
    doc.setFont('helvetica', 'bold')
    methY = addWrappedText(doc, 'Base Regulatória:', margin, methY, contentWidth, 5.5)
    doc.setFont('helvetica', 'normal')
    methY += 2
    audit.scope.regulatoryFramework.forEach(ref => {
      methY = addWrappedText(doc, `• ${ref}`, margin + 4, methY, contentWidth - 4, 5.5)
      methY += 1
    })
  }

  methY += 6
  if (audit.scope.objectives.length > 0) {
    doc.setFont('helvetica', 'bold')
    methY = addWrappedText(doc, 'Objetivos:', margin, methY, contentWidth, 5.5)
    doc.setFont('helvetica', 'normal')
    methY += 2
    audit.scope.objectives.forEach(obj => {
      methY = addWrappedText(doc, `• ${obj}`, margin + 4, methY, contentWidth - 4, 5.5)
      methY += 1
    })
  }

  // ── Pillar Findings ───────────────────────────────────────────
  doc.addPage()
  doc.setTextColor(17, 24, 39)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('3. Achados por Pilar', margin, 30)
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.8)
  doc.line(margin, 34, margin + 50, 34)

  let pillarY = 44
  audit.pillars.forEach((pillar: Pillar) => {
    if (pillarY > pageHeight - 60) {
      doc.addPage()
      pillarY = 30
    }

    const rCfg = RATING_CONFIG[pillar.overallRating]
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 24, 39)
    pillarY = addWrappedText(doc, `${pillar.number}. ${pillar.name}`, margin, pillarY, contentWidth, 6)
    pillarY += 2

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(`Classificação: ${rCfg?.label ?? pillar.overallRating} | Peso: ${pillar.weight}% | Conclusão: ${pillar.completionPercent}%`, margin, pillarY)
    pillarY += 6

    const pillarFindings = audit.findings.filter(f => f.pillarId === pillar.id)
    if (pillarFindings.length > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(55, 65, 81)
      doc.text(`Achados (${pillarFindings.length}):`, margin + 2, pillarY)
      pillarY += 5
      pillarFindings.forEach(f => {
        if (pillarY > pageHeight - 30) {
          doc.addPage()
          pillarY = 30
        }
        doc.setFont('helvetica', 'normal')
        const sevLabel = SEVERITY_CONFIG[f.severity]?.label ?? f.severity
        pillarY = addWrappedText(doc, `• [${sevLabel}] ${f.title}`, margin + 4, pillarY, contentWidth - 8, 5)
        pillarY += 2
      })
    } else {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(107, 114, 128)
      doc.text('Nenhum achado registrado.', margin + 2, pillarY)
      pillarY += 5
    }

    pillarY += 6
  })

  // ── Risk Matrix Summary ───────────────────────────────────────
  doc.addPage()
  doc.setTextColor(17, 24, 39)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('4. Matriz de Risco', margin, 30)
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.8)
  doc.line(margin, 34, margin + 45, 34)

  if (audit.riskMatrixItems && audit.riskMatrixItems.length > 0) {
    const riskRows = audit.riskMatrixItems.map(item => {
      const finding = audit.findings.find(f => f.id === item.findingId)
      return [
        finding?.title ?? item.findingId,
        SEVERITY_CONFIG[finding?.severity ?? 'low']?.label ?? '',
        String(item.likelihood),
        String(item.impact),
        String(item.likelihood * item.impact),
      ]
    })

    doc.autoTable({
      startY: 44,
      head: [['Achado', 'Severidade', 'Probabilidade', 'Impacto', 'Score']],
      body: riskRows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
    })
  } else {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(107, 114, 128)
    doc.text('Nenhum item na matriz de risco.', margin, 44)
  }

  // ── Findings Detail Table ─────────────────────────────────────
  doc.addPage()
  doc.setTextColor(17, 24, 39)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('5. Achados Detalhados', margin, 30)
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.8)
  doc.line(margin, 34, margin + 55, 34)

  if (audit.findings.length > 0) {
    const findingRows = audit.findings.map((f: Finding) => [
      f.title,
      SEVERITY_CONFIG[f.severity]?.label ?? f.severity,
      f.condition.substring(0, 80) + (f.condition.length > 80 ? '...' : ''),
      f.criteria.substring(0, 80) + (f.criteria.length > 80 ? '...' : ''),
      f.recommendation.substring(0, 80) + (f.recommendation.length > 80 ? '...' : ''),
      f.managementResponse?.substring(0, 60) ?? '—',
    ])

    doc.autoTable({
      startY: 44,
      head: [['Achado', 'Severidade', 'Condição', 'Critério', 'Recomendação', 'Resp. Admin.']],
      body: findingRows,
      styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 18 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 },
        5: { cellWidth: 25 },
      },
      margin: { left: margin, right: margin },
    })
  } else {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(107, 114, 128)
    doc.text('Nenhum achado registrado.', margin, 44)
  }

  // ── Appendices ────────────────────────────────────────────────
  doc.addPage()
  doc.setTextColor(17, 24, 39)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('6. Apêndices', margin, 30)
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.8)
  doc.line(margin, 34, margin + 35, 34)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(55, 65, 81)
  let appY = 44

  appY = addWrappedText(doc, 'A. Lista de Evidências Solicitadas', margin, appY, contentWidth, 5.5)
  appY += 3
  if (audit.evidence.length > 0) {
    audit.evidence.slice(0, 30).forEach(ev => {
      if (appY > pageHeight - 20) { doc.addPage(); appY = 30 }
      doc.setFontSize(9)
      const statusMap: Record<string, string> = {
        requested: 'Solicitada', received: 'Recebida', under_review: 'Em Revisão',
        accepted: 'Aceita', rejected: 'Rejeitada', pending_clarification: 'Pendente Esclarecimento',
      }
      appY = addWrappedText(doc, `• ${ev.name} — ${statusMap[ev.status] ?? ev.status}`, margin + 4, appY, contentWidth - 8, 4.5)
      appY += 1.5
    })
    if (audit.evidence.length > 30) {
      appY += 2
      doc.text(`... e mais ${audit.evidence.length - 30} evidências.`, margin + 4, appY)
      appY += 6
    }
  } else {
    doc.setFontSize(9)
    doc.text('Nenhuma evidência solicitada.', margin + 4, appY)
    appY += 6
  }

  appY += 6
  appY = addWrappedText(doc, 'B. Entrevistas Realizadas', margin, appY, contentWidth, 5.5)
  appY += 3
  if (audit.interviews && audit.interviews.length > 0) {
    audit.interviews.forEach(int => {
      if (appY > pageHeight - 20) { doc.addPage(); appY = 30 }
      doc.setFontSize(9)
      appY = addWrappedText(doc, `• ${int.interviewee} (${int.role}) — ${formatDate(int.date)}`, margin + 4, appY, contentWidth - 8, 4.5)
      appY += 1.5
    })
  } else {
    doc.setFontSize(9)
    doc.text('Nenhuma entrevista registrada.', margin + 4, appY)
  }

  addPageFooter()
  doc.save(`${audit.name.replace(/[^a-zA-Z0-9]/g, '_')}_Relatorio_Auditoria.pdf`)
}

// ─── CSV Generators ──────────────────────────────────────────────

function exportFindingsCsv(audit: Audit) {
  const header = [
    'ID', 'Pilar', 'SubÁrea', 'Título', 'Severidade', 'Status',
    'Condição', 'Critério', 'Causa', 'Efeito', 'Recomendação',
    'Resposta da Administração', 'Responsável Plano de Ação',
    'Data Plano de Ação', 'Referências Regulatórias',
  ]
  const rows = audit.findings.map(f => [
    f.id,
    getPillarName(audit, f.pillarId),
    getSubAreaName(audit, f.pillarId, f.subAreaId),
    f.title,
    SEVERITY_CONFIG[f.severity]?.label ?? f.severity,
    f.status,
    f.condition,
    f.criteria,
    f.cause,
    f.effect,
    f.recommendation,
    f.managementResponse ?? '',
    f.actionPlan?.owner ?? '',
    f.actionPlan?.targetDate ?? '',
    (f.regulatoryReference || []).join('; '),
  ])
  downloadCsv([header, ...rows], `${audit.name.replace(/[^a-zA-Z0-9]/g, '_')}_Achados.csv`)
}

function exportEvidenceCsv(audit: Audit) {
  const header = [
    'ID', 'Pilar', 'Nome', 'Status', 'Data Limite', 'Prioridade',
    'Upload Realizado', 'Resumo Análise IA',
  ]
  const statusMap: Record<string, string> = {
    requested: 'Solicitada', received: 'Recebida', under_review: 'Em Revisão',
    accepted: 'Aceita', rejected: 'Rejeitada', pending_clarification: 'Pendente Esclarecimento',
  }
  const rows = audit.evidence.map(ev => [
    ev.id,
    getPillarName(audit, ev.pillarId),
    ev.name,
    statusMap[ev.status] ?? ev.status,
    ev.dueDate ? formatDate(ev.dueDate) : '',
    ev.priority ?? '',
    ev.uploadedAt ? 'Sim' : 'Não',
    ev.aiAnalysis ?? '',
  ])
  downloadCsv([header, ...rows], `${audit.name.replace(/[^a-zA-Z0-9]/g, '_')}_Evidencias.csv`)
}

function exportTestResultsCsv(audit: Audit) {
  const header = [
    'Pilar', 'SubÁrea', 'Código', 'Descrição', 'Resultado',
    'Observações', 'Testado Em',
  ]
  const resultMap: Record<string, string> = {
    pass: 'Aprovado', fail: 'Reprovado', partial: 'Parcial',
    not_tested: 'Não Testado', not_applicable: 'N/A',
  }
  const rows: string[][] = []
  audit.pillars.forEach(p => {
    p.subAreas.forEach(sa => {
      sa.testProcedures.forEach(tp => {
        rows.push([
          p.name,
          sa.name,
          tp.code,
          tp.description,
          resultMap[tp.result] ?? tp.result,
          tp.observations,
          tp.testedAt ? formatDate(tp.testedAt) : '',
        ])
      })
    })
  })
  downloadCsv([header, ...rows], `${audit.name.replace(/[^a-zA-Z0-9]/g, '_')}_Testes.csv`)
}

// ─── Workpaper Preview Builder ───────────────────────────────────

interface WorkpaperEntry {
  ref: string
  pillar: string
  subArea: string
  type: string
  title: string
  status: string
}

function buildWorkpaperPreview(audit: Audit): WorkpaperEntry[] {
  const entries: WorkpaperEntry[] = []
  let wpIndex = 1

  audit.pillars.forEach(p => {
    p.subAreas.forEach(sa => {
      sa.testProcedures.forEach(tp => {
        entries.push({
          ref: `WP-${String(wpIndex++).padStart(3, '0')}`,
          pillar: `${p.number}. ${p.name}`,
          subArea: sa.name,
          type: 'Teste',
          title: `${tp.code} — ${tp.description.substring(0, 60)}${tp.description.length > 60 ? '...' : ''}`,
          status: tp.result === 'not_tested' ? 'Pendente' : 'Concluído',
        })
      })
    })
  })

  audit.findings.forEach(f => {
    entries.push({
      ref: `WP-${String(wpIndex++).padStart(3, '0')}`,
      pillar: getPillarName(audit, f.pillarId),
      subArea: getSubAreaName(audit, f.pillarId, f.subAreaId),
      type: 'Achado',
      title: f.title,
      status: f.status === 'closed' ? 'Fechado' : 'Aberto',
    })
  })

  audit.interviews?.forEach(int => {
    entries.push({
      ref: `WP-${String(wpIndex++).padStart(3, '0')}`,
      pillar: getPillarName(audit, int.pillarId),
      subArea: '',
      type: 'Entrevista',
      title: `${int.interviewee} (${int.role})`,
      status: 'Concluído',
    })
  })

  return entries
}

// ─── Component ───────────────────────────────────────────────────

export default function ExportPanel({ auditId }: { auditId: string }) {
  const audit = useAuditStore(s => s.audits.find(a => a.id === auditId))
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showWorkpaperPreview, setShowWorkpaperPreview] = useState(false)
  const [workpaperEntries, setWorkpaperEntries] = useState<WorkpaperEntry[]>([])

  const handleExport = useCallback(async () => {
    if (!audit || !selectedFormat) return

    setIsGenerating(true)
    setProgress(10)

    await new Promise(r => setTimeout(r, 200))
    setProgress(30)

    try {
      switch (selectedFormat) {
        case 'pdf-report':
          setProgress(50)
          generateFullReportPdf(audit)
          setProgress(100)
          break
        case 'csv-findings':
          setProgress(60)
          exportFindingsCsv(audit)
          setProgress(100)
          break
        case 'csv-evidence':
          setProgress(60)
          exportEvidenceCsv(audit)
          setProgress(100)
          break
        case 'csv-tests':
          setProgress(60)
          exportTestResultsCsv(audit)
          setProgress(100)
          break
        case 'zip-workpapers': {
          setProgress(50)
          const entries = buildWorkpaperPreview(audit)
          setWorkpaperEntries(entries)
          setShowWorkpaperPreview(true)
          setProgress(100)
          break
        }
      }
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      await new Promise(r => setTimeout(r, 400))
      setIsGenerating(false)
      setProgress(0)
    }
  }, [audit, selectedFormat])

  if (!audit) {
    return (
      <div className="glass-panel p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
        <Target className="mx-auto mb-3 opacity-40" size={32} />
        <p>Auditoria não encontrada.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>
            Exportar Relatórios
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Selecione o formato desejado para gerar o relatório de auditoria.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Printer size={14} />
          <span>{audit.findings.length} achados · {audit.evidence.length} evidências</span>
        </div>
      </div>

      {/* Format Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FORMAT_OPTIONS.map(opt => {
          const Icon = opt.icon
          const isSelected = selectedFormat === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => setSelectedFormat(opt.id)}
              className={cn(
                'glass-panel p-5 text-left transition-all duration-200 group relative overflow-hidden',
                'hover:ring-1 hover:ring-[var(--ln-1)] hover:scale-[1.01]',
                isSelected && 'ring-2 ring-blue-500/60 bg-blue-500/5',
              )}
            >
              {isSelected && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}

              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2.5 rounded-lg transition-colors',
                  isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-[var(--ln-1)]/30 text-slate-400',
                )}>
                  <Icon size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>
                      {opt.title}
                    </span>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', opt.badgeColor)}>
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {opt.description}
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  className={cn(
                    'mt-1 transition-all',
                    isSelected ? 'text-blue-400 translate-x-0 opacity-100' : 'opacity-0 -translate-x-1',
                  )}
                />
              </div>
            </button>
          )
        })}
      </div>

      {/* Action Bar */}
      {selectedFormat && (
        <div className="glass-panel p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Download size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                {FORMAT_OPTIONS.find(o => o.id === selectedFormat)?.title}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {selectedFormat === 'zip-workpapers'
                  ? 'Gerar visualização do workpaper pack'
                  : 'Pronto para gerar e baixar'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedFormat(null)}
              className="btn-ghost px-3 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={isGenerating}
              className={cn(
                'btn-primary px-5 py-2 text-sm flex items-center gap-2',
                isGenerating && 'opacity-70 cursor-not-allowed',
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download size={16} />
                  {selectedFormat === 'zip-workpapers' ? 'Visualizar' : 'Exportar'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {isGenerating && progress > 0 && (
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Gerando exportação...
            </span>
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {progress}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ln-1)' }}>
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Workpaper Pack Preview */}
      {showWorkpaperPreview && workpaperEntries.length > 0 && (
        <div className="glass-panel overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--ln-1)' }}>
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-purple-400" />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                Workpaper Pack — {workpaperEntries.length} itens
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const header = ['Ref', 'Pilar', 'SubÁrea', 'Tipo', 'Título', 'Status']
                  const rows = workpaperEntries.map(e => [e.ref, e.pillar, e.subArea, e.type, e.title, e.status])
                  downloadCsv([header, ...rows], `${audit.name.replace(/[^a-zA-Z0-9]/g, '_')}_Workpapers.csv`)
                }}
                className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                <Copy size={12} />
                Exportar Lista CSV
              </button>
              <button
                onClick={() => setShowWorkpaperPreview(false)}
                className="btn-ghost p-1.5"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: 'var(--sf-3)', color: 'var(--text-secondary)' }}>
                  <th className="text-left p-3 font-medium">Ref</th>
                  <th className="text-left p-3 font-medium">Pilar</th>
                  <th className="text-left p-3 font-medium">SubÁrea</th>
                  <th className="text-left p-3 font-medium">Tipo</th>
                  <th className="text-left p-3 font-medium">Título</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {workpaperEntries.map((entry, idx) => (
                  <tr
                    key={entry.ref}
                    className="transition-colors hover:bg-blue-500/5"
                    style={{ borderBottom: '1px solid var(--ln-1)' }}
                  >
                    <td className="p-3 font-mono font-medium text-blue-400">{entry.ref}</td>
                    <td className="p-3" style={{ color: 'var(--text-primary)' }}>{entry.pillar}</td>
                    <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{entry.subArea || '—'}</td>
                    <td className="p-3">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium',
                        entry.type === 'Teste' && 'bg-emerald-500/20 text-emerald-400',
                        entry.type === 'Achado' && 'bg-amber-500/20 text-amber-400',
                        entry.type === 'Entrevista' && 'bg-blue-500/20 text-blue-400',
                      )}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="p-3 max-w-[250px] truncate" style={{ color: 'var(--text-primary)' }}>{entry.title}</td>
                    <td className="p-3">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium',
                        entry.status === 'Concluído' || entry.status === 'Fechado'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400',
                      )}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
