'use client'

import { useState } from 'react'
import { Audit, Rating, Severity } from '@/lib/types'
import { Download, Loader2 } from '@/components/Icons'

const SEVERITY_COLORS: Record<Severity, [number, number, number]> = {
  critical: [220, 38, 38],
  high: [234, 88, 12],
  medium: [217, 119, 6],
  low: [101, 163, 13],
}

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Baixo',
}

const RATING_LABELS: Record<Rating, string> = {
  effective: 'Efetivo',
  largely_effective: 'Amplamente Efetivo',
  partially_effective: 'Parcialmente Efetivo',
  ineffective: 'Inefetivo',
  not_assessed: 'Nao Avaliado',
}

const RATING_COLORS: Record<Rating, [number, number, number]> = {
  effective: [22, 163, 74],
  largely_effective: [101, 163, 13],
  partially_effective: [217, 119, 6],
  ineffective: [220, 38, 38],
  not_assessed: [107, 114, 128],
}

type JsPDFInstance = {
  internal: { getNumberOfPages: () => number; pageSize: { getWidth: () => number; getHeight: () => number } }
  addPage: () => void
  setPage: (n: number) => void
  setFontSize: (s: number) => void
  setFont: (f: string, style?: string) => void
  setTextColor: (r: number, g: number, b: number) => void
  setFillColor: (r: number, g: number, b: number) => void
  setDrawColor: (r: number, g: number, b: number) => void
  text: (t: string, x: number, y: number, opts?: { align?: string; maxWidth?: number }) => void
  rect: (x: number, y: number, w: number, h: number, style?: string) => void
  roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string) => void
  line: (x1: number, y1: number, x2: number, y2: number) => void
  save: (name: string) => void
  splitTextToSize: (text: string, maxWidth: number) => string[]
  getTextWidth: (text: string) => number
  setLineWidth: (w: number) => void
}

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 20
const CONTENT_W = PAGE_W - 2 * MARGIN
const HEADER_COLOR: [number, number, number] = [30, 58, 138]
const ACCENT_COLOR: [number, number, number] = [59, 130, 246]

function addPageNumber(doc: JsPDFInstance, pageNum: number, totalPages: number) {
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`ARGUS PLD-FT | Confidencial`, MARGIN, PAGE_H - 10)
  doc.text(`${pageNum} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' })
}

function addSectionHeader(doc: JsPDFInstance, title: string, y: number): number {
  doc.setFillColor(...HEADER_COLOR)
  doc.rect(MARGIN, y, CONTENT_W, 8, 'F')
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(title, MARGIN + 4, y + 5.5)
  return y + 14
}

function checkPageBreak(doc: JsPDFInstance, y: number, needed: number): number {
  if (y + needed > PAGE_H - 25) {
    doc.addPage()
    return 25
  }
  return y
}

function addWrappedText(doc: JsPDFInstance, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text, maxWidth)
  for (const line of lines) {
    y = checkPageBreak(doc, y, lineHeight)
    doc.text(line, x, y)
    y += lineHeight
  }
  return y
}

export async function generateAuditPDF(audit: Audit, reportMarkdown: string) {
  const jsPDFModule = await import('jspdf')
  const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as unknown as JsPDFInstance

  // ── Cover Page ──
  doc.setFillColor(10, 14, 26)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

  doc.setFillColor(...HEADER_COLOR)
  doc.rect(0, 0, PAGE_W, 80, 'F')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(255, 255, 255)
  doc.text('ARGUS', MARGIN, 35)

  doc.setFontSize(12)
  doc.setTextColor(200, 210, 230)
  doc.text('Sistema de Auditoria PLD-FT', MARGIN, 45)

  doc.setDrawColor(...ACCENT_COLOR)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, 55, PAGE_W - MARGIN, 55)

  doc.setFontSize(9)
  doc.setTextColor(180, 190, 210)
  doc.text('RELATORIO FINAL DE AUDITORIA', MARGIN, 65)
  doc.text('CONFIDENCIAL', PAGE_W - MARGIN, 65, { align: 'right' })

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(30, 41, 59)
  const titleLines = doc.splitTextToSize(audit.name, CONTENT_W)
  let coverY = 110
  for (const line of titleLines) {
    doc.text(line, MARGIN, coverY)
    coverY += 10
  }

  coverY += 10
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(71, 85, 105)

  const coverFields = [
    ['Instituicao', audit.institution.name],
    ['Tipo', audit.institution.type.toUpperCase()],
    ['Periodo', `${audit.scope.period.start} a ${audit.scope.period.end}`],
    ['Classificacao Geral', RATING_LABELS[audit.overallRating]],
    ['Total de Achados', `${audit.findings.length}`],
    ['Achados Criticos', `${audit.findings.filter(f => f.severity === 'critical').length}`],
  ]

  for (const [label, value] of coverFields) {
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(label.toUpperCase(), MARGIN, coverY)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(30, 41, 59)
    doc.text(value, MARGIN, coverY + 6)

    coverY += 16
  }

  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, MARGIN, PAGE_H - 15)
  doc.text('Gerado por ARGUS PLD-FT Audit System', PAGE_W - MARGIN, PAGE_H - 15, { align: 'right' })

  // ── Table of Contents ──
  doc.addPage()
  let y = 25

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...HEADER_COLOR)
  doc.text('Indice', MARGIN, y)
  y += 12

  const tocItems = [
    '1. Sumario Executivo',
    '2. Escopo e Metodologia',
    '3. Avaliacao por Pilar',
    '4. Achados de Auditoria',
    '5. Resumo de Evidencias',
    '6. Relatorio Analitico (IA)',
  ]

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(50, 50, 50)
  for (const item of tocItems) {
    doc.text(item, MARGIN + 5, y)
    y += 8
  }

  // ── Executive Summary ──
  doc.addPage()
  y = 25
  y = addSectionHeader(doc, '1. SUMARIO EXECUTIVO', y)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)

  const assessed = audit.pillars.filter(p => p.overallRating !== 'not_assessed').length
  const summaryText = `Esta auditoria avaliou ${audit.pillars.length} pilares do programa de PLD-FT da ${audit.institution.name}. ` +
    `Foram avaliados ${assessed} pilares, com classificacao geral "${RATING_LABELS[audit.overallRating]}". ` +
    `Foram identificados ${audit.findings.length} achados, sendo ${audit.findings.filter(f => f.severity === 'critical').length} criticos, ` +
    `${audit.findings.filter(f => f.severity === 'high').length} altos, ${audit.findings.filter(f => f.severity === 'medium').length} medios ` +
    `e ${audit.findings.filter(f => f.severity === 'low').length} baixos. ` +
    `Foram solicitadas ${audit.evidence.length} evidencias e analisadas ${audit.samples.length} amostras.`

  y = addWrappedText(doc, summaryText, MARGIN, y, CONTENT_W, 5)

  // Severity summary boxes
  y += 6
  const sevBoxWidth = CONTENT_W / 4 - 3
  const severities: Severity[] = ['critical', 'high', 'medium', 'low']
  for (let i = 0; i < severities.length; i++) {
    const sev = severities[i]
    const count = audit.findings.filter(f => f.severity === sev).length
    const bx = MARGIN + i * (sevBoxWidth + 4)

    doc.setFillColor(...SEVERITY_COLORS[sev])
    doc.roundedRect(bx, y, sevBoxWidth, 16, 2, 2, 'F')
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(255, 255, 255)
    doc.text(`${count}`, bx + sevBoxWidth / 2, y + 7, { align: 'center' })
    doc.setFontSize(7)
    doc.text(SEVERITY_LABELS[sev], bx + sevBoxWidth / 2, y + 13, { align: 'center' })
  }
  y += 24

  // ── Scope & Methodology ──
  y = checkPageBreak(doc, y, 40)
  y = addSectionHeader(doc, '2. ESCOPO E METODOLOGIA', y)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)

  const scopeText = `Periodo: ${audit.scope.period.start} a ${audit.scope.period.end}\n` +
    `Marco Regulatorio: ${audit.scope.regulatoryFramework.join(', ')}\n` +
    `Metodologia: ${audit.scope.methodology}`
  y = addWrappedText(doc, scopeText, MARGIN, y, CONTENT_W, 5)

  if (audit.scope.objectives.length > 0) {
    y += 4
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Objetivos:', MARGIN, y)
    y += 5
    doc.setFont('Helvetica', 'normal')
    for (const obj of audit.scope.objectives) {
      y = checkPageBreak(doc, y, 6)
      doc.text(`- ${obj}`, MARGIN + 4, y, { maxWidth: CONTENT_W - 8 })
      y += 5
    }
  }

  // ── Pillar Assessment ──
  doc.addPage()
  y = 25
  y = addSectionHeader(doc, '3. AVALIACAO POR PILAR', y)

  for (const pillar of audit.pillars) {
    y = checkPageBreak(doc, y, 25)

    doc.setFillColor(241, 245, 249)
    doc.roundedRect(MARGIN, y, CONTENT_W, 12, 1, 1, 'F')
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...HEADER_COLOR)
    doc.text(`${pillar.code} - ${pillar.name}`, MARGIN + 4, y + 5)

    const ratingLabel = RATING_LABELS[pillar.overallRating]
    const ratingColor = RATING_COLORS[pillar.overallRating]

    doc.setFillColor(...ratingColor)
    const ratingW = doc.getTextWidth(ratingLabel) + 8
    doc.roundedRect(PAGE_W - MARGIN - ratingW - 2, y + 2, ratingW, 8, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    doc.text(ratingLabel, PAGE_W - MARGIN - ratingW / 2 - 2, y + 7.5, { align: 'center' })

    y += 14

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    doc.text(`Peso: ${pillar.weight}% | Progresso: ${pillar.completionPercent}% | Sub-areas: ${pillar.subAreas.length}`, MARGIN + 4, y)
    y += 8

    const pillarFindings = audit.findings.filter(f => f.pillarId === pillar.id)
    if (pillarFindings.length > 0) {
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`Achados: ${pillarFindings.length}`, MARGIN + 4, y)
      y += 6
    }

    y += 2
  }

  // ── Findings Table ──
  doc.addPage()
  y = 25
  y = addSectionHeader(doc, '4. ACHADOS DE AUDITORIA', y)

  if (audit.findings.length === 0) {
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text('Nenhum achado registrado.', MARGIN, y)
    y += 10
  } else {
    const colWidths = [12, 55, 20, 25, CONTENT_W - 112]
    const headers = ['#', 'Titulo', 'Severidade', 'Status', 'Pilar']

    doc.setFillColor(30, 41, 59)
    doc.rect(MARGIN, y, CONTENT_W, 7, 'F')
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)

    let hx = MARGIN + 2
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], hx, y + 5)
      hx += colWidths[i]
    }
    y += 9

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(7)

    for (let fi = 0; fi < audit.findings.length; fi++) {
      const f = audit.findings[fi]
      y = checkPageBreak(doc, y, 8)

      if (fi % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(MARGIN, y - 3, CONTENT_W, 7, 'F')
      }

      doc.setTextColor(50, 50, 50)
      let fx = MARGIN + 2
      doc.text(`${fi + 1}`, fx, y)
      fx += colWidths[0]

      const truncTitle = f.title.length > 40 ? f.title.substring(0, 37) + '...' : f.title
      doc.text(truncTitle, fx, y)
      fx += colWidths[1]

      doc.setTextColor(...SEVERITY_COLORS[f.severity])
      doc.text(SEVERITY_LABELS[f.severity], fx, y)
      fx += colWidths[2]

      doc.setTextColor(50, 50, 50)
      const statusLabel = { draft: 'Rascunho', confirmed: 'Confirmado', management_response: 'Resposta', closed: 'Fechado' }
      doc.text(statusLabel[f.status] || f.status, fx, y)
      fx += colWidths[3]

      const pillar = audit.pillars.find(p => p.id === f.pillarId)
      doc.text(pillar?.code || '', fx, y)

      y += 7
    }
  }

  // ── Evidence Summary ──
  y += 6
  y = checkPageBreak(doc, y, 30)
  y = addSectionHeader(doc, '5. RESUMO DE EVIDENCIAS', y)

  const evStatusCounts: Record<string, number> = {}
  audit.evidence.forEach(e => {
    evStatusCounts[e.status] = (evStatusCounts[e.status] || 0) + 1
  })

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)
  doc.text(`Total de evidencias: ${audit.evidence.length}`, MARGIN, y)
  y += 7

  const evLabels: Record<string, string> = {
    requested: 'Solicitadas',
    received: 'Recebidas',
    under_review: 'Em Revisao',
    accepted: 'Aceitas',
    rejected: 'Rejeitadas',
    pending_clarification: 'Pendentes Esclarecimento',
  }

  doc.setFontSize(9)
  for (const [status, count] of Object.entries(evStatusCounts)) {
    y = checkPageBreak(doc, y, 6)
    doc.text(`${evLabels[status] || status}: ${count}`, MARGIN + 4, y)
    y += 5.5
  }

  // ── AI Report Content ──
  if (reportMarkdown) {
    doc.addPage()
    y = 25
    y = addSectionHeader(doc, '6. RELATORIO ANALITICO (IA)', y)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(50, 50, 50)

    const cleanMd = reportMarkdown
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

    const paragraphs = cleanMd.split('\n').filter(l => l.trim().length > 0)

    for (const para of paragraphs) {
      const trimmed = para.trim()
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        y = checkPageBreak(doc, y, 5)
        y = addWrappedText(doc, `  ${trimmed}`, MARGIN + 2, y, CONTENT_W - 6, 4.5)
      } else {
        y = checkPageBreak(doc, y, 5)
        y = addWrappedText(doc, trimmed, MARGIN, y, CONTENT_W, 4.5)
      }
      y += 2
    }
  }

  // ── Add page numbers ──
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i)
    addPageNumber(doc, i - 1, totalPages - 1)
  }

  const fileName = `ARGUS_Relatorio_${audit.institution.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

interface ExportButtonProps {
  audit: Audit
  reportContent: string
}

export function ExportButton({ audit, reportContent }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      await generateAuditPDF(audit, reportContent)
    } catch (e) {
      console.error('PDF generation error:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      {loading ? 'Gerando PDF...' : 'Download PDF'}
    </button>
  )
}
