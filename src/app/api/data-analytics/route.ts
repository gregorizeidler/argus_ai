import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { dataAnalyticsRequestSchema, validateBody } from '@/lib/schemas'

interface AnalyticsRule {
  id: string
  name: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  columnHints: string[]
  evaluator: (row: Record<string, string>, mappedColumns: Record<string, string>) => boolean
}

interface RuleFinding {
  ruleId: string
  ruleName: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  totalIssues: number
  sampleRecords: Record<string, string>[]
}

const AUDIT_RULES: AnalyticsRule[] = [
  {
    id: 'risk_zero_clients',
    name: 'Classificação de Risco Zerada/Ausente',
    description: 'Clientes com classificação de risco igual a 0, nula ou vazia — indica falha no processo de classificação de risco.',
    severity: 'critical',
    columnHints: ['risk', 'risco', 'classificação de risco', 'risk_classification', 'risk_rating', 'score_risco', 'nivel_risco', 'risk_level'],
    evaluator: (row, mapped) => {
      const val = row[mapped['risk_column']]
      if (val === undefined) return false
      const trimmed = val.toString().trim().toLowerCase()
      return trimmed === '' || trimmed === '0' || trimmed === 'null' || trimmed === 'n/a' || trimmed === 'na' || trimmed === '-'
    },
  },
  {
    id: 'missing_screening',
    name: 'Triagem/Screening Desatualizada',
    description: 'Clientes cuja última triagem em listas restritivas foi há mais de 12 meses ou está em branco — descumprimento da periodicidade regulatória.',
    severity: 'high',
    columnHints: ['screening', 'triagem', 'last_screening', 'ultima_triagem', 'dt_triagem', 'screening_date', 'data_screening', 'lista_restritiva'],
    evaluator: (row, mapped) => {
      const val = row[mapped['screening_column']]
      if (val === undefined) return false
      const trimmed = val.toString().trim()
      if (!trimmed || trimmed === '-' || trimmed === 'n/a') return true
      const date = parseFlexibleDate(trimmed)
      if (!date) return true
      const monthsAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30)
      return monthsAgo > 12
    },
  },
  {
    id: 'incomplete_kyc',
    name: 'KYC Incompleto',
    description: 'Clientes com campos obrigatórios do KYC vazios ou incompletos — risco de não conformidade com normas de identificação.',
    severity: 'high',
    columnHints: ['cpf', 'cnpj', 'documento', 'document', 'endereco', 'address', 'profissao', 'occupation', 'renda', 'income', 'data_nascimento', 'birth_date', 'nacionalidade', 'nationality'],
    evaluator: (row, mapped) => {
      const kycColumns = ['kyc_col_1', 'kyc_col_2', 'kyc_col_3', 'kyc_col_4']
      let emptyCount = 0
      let totalMapped = 0
      for (const key of kycColumns) {
        if (!mapped[key]) continue
        totalMapped++
        const val = row[mapped[key]]
        if (!val || val.toString().trim() === '' || val.toString().trim() === '-') emptyCount++
      }
      return totalMapped > 0 && emptyCount > 0
    },
  },
  {
    id: 'training_gaps',
    name: 'Falha em Treinamento PLD',
    description: 'Colaboradores que não completaram o treinamento obrigatório de PLD/FT — exigência regulatória do BACEN.',
    severity: 'medium',
    columnHints: ['treinamento', 'training', 'pld_training', 'treinamento_pld', 'dt_treinamento', 'training_date', 'training_status', 'concluido', 'completed', 'status_treinamento'],
    evaluator: (row, mapped) => {
      const statusVal = row[mapped['training_status_column']]
      const dateVal = row[mapped['training_date_column']]

      if (statusVal !== undefined) {
        const s = statusVal.toString().trim().toLowerCase()
        if (s === '' || s === 'não' || s === 'nao' || s === 'pendente' || s === 'no' || s === 'incompleto' || s === 'false' || s === '0') return true
      }
      if (dateVal !== undefined) {
        const trimmed = dateVal.toString().trim()
        if (!trimmed || trimmed === '-') return true
        const date = parseFlexibleDate(trimmed)
        if (!date) return true
        const monthsAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30)
        return monthsAgo > 12
      }
      return false
    },
  },
  {
    id: 'inactive_monitoring',
    name: 'Monitoramento de Transações Inativo',
    description: 'Contas sem monitoramento de transações há mais de 6 meses — falha no acompanhamento contínuo exigido pela regulação.',
    severity: 'high',
    columnHints: ['monitoramento', 'monitoring', 'ultima_transacao', 'last_transaction', 'last_monitoring', 'dt_monitoramento', 'ultimo_monitoramento', 'dt_ultima_movimentacao'],
    evaluator: (row, mapped) => {
      const val = row[mapped['monitoring_column']]
      if (val === undefined) return false
      const trimmed = val.toString().trim()
      if (!trimmed || trimmed === '-' || trimmed === 'n/a') return true
      const date = parseFlexibleDate(trimmed)
      if (!date) return true
      const monthsAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30)
      return monthsAgo > 6
    },
  },
  {
    id: 'pep_without_edd',
    name: 'PEP sem Due Diligence Reforçada',
    description: 'Pessoas Expostas Politicamente (PEP) sem procedimento de Enhanced Due Diligence (EDD) — violação grave da Circular 3.978/2020.',
    severity: 'critical',
    columnHints: ['pep', 'pessoa_exposta', 'politically_exposed', 'edd', 'due_diligence', 'diligencia_reforcada', 'enhanced_dd', 'pep_status', 'tipo_pep'],
    evaluator: (row, mapped) => {
      const pepVal = row[mapped['pep_column']]
      const eddVal = row[mapped['edd_column']]
      if (pepVal === undefined) return false

      const pepTrimmed = pepVal.toString().trim().toLowerCase()
      const isPep = pepTrimmed === 'sim' || pepTrimmed === 'yes' || pepTrimmed === 'true' || pepTrimmed === '1' || pepTrimmed === 's' || pepTrimmed === 'pep'

      if (!isPep) return false

      if (eddVal === undefined) return true
      const eddTrimmed = eddVal.toString().trim().toLowerCase()
      return eddTrimmed === '' || eddTrimmed === 'não' || eddTrimmed === 'nao' || eddTrimmed === 'no' || eddTrimmed === 'false' || eddTrimmed === '0' || eddTrimmed === '-' || eddTrimmed === 'n/a'
    },
  },
  {
    id: 'sanctions_penetration',
    name: 'Penetração de Listas de Sanções',
    description: 'Clientes cujo nome ou documento corresponde a registros em listas de sanções (OFAC, ONU, EU) sem bloqueio ou alerta — teste de penetração de sanções.',
    severity: 'critical',
    columnHints: ['sancao', 'sanction', 'sanctions', 'lista_sancao', 'ofac', 'onu', 'un_list', 'sanctions_hit', 'match_sancao', 'bloqueio', 'blocked', 'sanction_status', 'resultado_screening'],
    evaluator: (row, mapped) => {
      const hitVal = row[mapped['sanctions_hit_column']]
      const blockedVal = row[mapped['blocked_column']]
      if (hitVal === undefined) return false
      const hit = hitVal.toString().trim().toLowerCase()
      const isHit = hit === 'sim' || hit === 'yes' || hit === 'true' || hit === '1' || hit === 's' || hit === 'match' || hit === 'positivo'
      if (!isHit) return false
      if (blockedVal === undefined) return true
      const blocked = blockedVal.toString().trim().toLowerCase()
      return blocked === '' || blocked === 'não' || blocked === 'nao' || blocked === 'no' || blocked === 'false' || blocked === '0' || blocked === '-'
    },
  },
  {
    id: 'coaf_timeliness',
    name: 'Tempestividade de Comunicações ao COAF',
    description: 'Situações atípicas cuja comunicação ao COAF ultrapassou o prazo regulatório de 24h (Art. 11 da Lei 9.613/98) — risco de multa.',
    severity: 'high',
    columnHints: ['coaf', 'comunicacao', 'data_deteccao', 'data_comunicacao', 'dt_deteccao', 'dt_comunicacao', 'detection_date', 'report_date', 'sla_coaf', 'prazo_coaf', 'dias_comunicacao'],
    evaluator: (row, mapped) => {
      const detectVal = row[mapped['detection_date_column']]
      const reportVal = row[mapped['report_date_column']]
      if (detectVal === undefined || reportVal === undefined) return false
      const detectDate = parseFlexibleDate(detectVal.toString().trim())
      const reportDate = parseFlexibleDate(reportVal.toString().trim())
      if (!detectDate || !reportDate) return false
      const hoursElapsed = (reportDate.getTime() - detectDate.getTime()) / (1000 * 60 * 60)
      return hoursElapsed > 24
    },
  },
  {
    id: 'kyc_risk_scoring',
    name: 'Inconsistência no Risk Scoring de KYC',
    description: 'Clientes alto-risco com score de risco baixo ou clientes com perfil de risco inconsistente — falha na metodologia de classificação.',
    severity: 'high',
    columnHints: ['score', 'risk_score', 'score_risco', 'pontuacao', 'rating', 'categoria_risco', 'risk_category', 'pep', 'pais', 'country', 'atividade', 'activity', 'faturamento', 'revenue', 'tipo_cliente'],
    evaluator: (row, mapped) => {
      const scoreVal = row[mapped['score_column']]
      const categoryVal = row[mapped['category_column']]
      const pepVal = row[mapped['pep_flag_column']]
      if (scoreVal === undefined && categoryVal === undefined) return false

      const score = parseFloat((scoreVal || '').toString())
      const category = (categoryVal || '').toString().trim().toLowerCase()
      const pep = (pepVal || '').toString().trim().toLowerCase()

      const isPep = pep === 'sim' || pep === 'yes' || pep === 'true' || pep === '1' || pep === 's'
      const isHighCategory = category.includes('alto') || category.includes('high') || category.includes('critico') || category.includes('critical')
      const isLowScore = !isNaN(score) && score <= 30

      if (isPep && isLowScore) return true
      if (isHighCategory && isLowScore) return true
      return false
    },
  },
  {
    id: 'alert_backtest',
    name: 'Back-Testing de Alertas de Monitoramento',
    description: 'Transações atípicas conhecidas que não geraram alertas no sistema de monitoramento — falha na calibração de cenários/regras.',
    severity: 'critical',
    columnHints: ['alerta', 'alert', 'alert_generated', 'gerou_alerta', 'cenario', 'scenario', 'regra', 'rule', 'valor', 'amount', 'tipo_operacao', 'operation_type', 'atipica', 'suspicious', 'stk'],
    evaluator: (row, mapped) => {
      const suspiciousVal = row[mapped['suspicious_column']]
      const alertVal = row[mapped['alert_column']]
      if (suspiciousVal === undefined) return false
      const suspicious = suspiciousVal.toString().trim().toLowerCase()
      const isSuspicious = suspicious === 'sim' || suspicious === 'yes' || suspicious === 'true' || suspicious === '1' || suspicious === 's' || suspicious === 'atipica' || suspicious === 'stk'
      if (!isSuspicious) return false
      if (alertVal === undefined) return true
      const alert = alertVal.toString().trim().toLowerCase()
      return alert === '' || alert === 'não' || alert === 'nao' || alert === 'no' || alert === 'false' || alert === '0' || alert === '-' || alert === 'n/a'
    },
  },
  {
    id: 'high_risk_no_review',
    name: 'Clientes Alto Risco sem Revisão Periódica',
    description: 'Clientes classificados como alto risco sem revisão cadastral nos últimos 12 meses — descumprimento da diligência reforçada.',
    severity: 'high',
    columnHints: ['risco', 'risk', 'risk_level', 'nivel_risco', 'ultima_revisao', 'last_review', 'dt_revisao', 'review_date', 'data_atualizacao', 'updated_at'],
    evaluator: (row, mapped) => {
      const riskVal = row[mapped['risk_level_column']]
      const reviewVal = row[mapped['review_date_column']]
      if (riskVal === undefined) return false
      const risk = riskVal.toString().trim().toLowerCase()
      const isHighRisk = risk === 'alto' || risk === 'high' || risk === 'critico' || risk === 'critical' || risk === '3' || risk === '4' || risk === '5'
      if (!isHighRisk) return false
      if (reviewVal === undefined) return true
      const trimmed = reviewVal.toString().trim()
      if (!trimmed || trimmed === '-') return true
      const date = parseFlexibleDate(trimmed)
      if (!date) return true
      const monthsAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30)
      return monthsAgo > 12
    },
  },
]

function parseFlexibleDate(str: string): Date | null {
  const cleaned = str.replace(/\s+/g, ' ').trim()
  // dd/mm/yyyy or dd-mm-yyyy
  const dmyMatch = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (dmyMatch) {
    const year = dmyMatch[3].length === 2 ? 2000 + parseInt(dmyMatch[3]) : parseInt(dmyMatch[3])
    const d = new Date(year, parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]))
    if (!isNaN(d.getTime())) return d
  }
  // yyyy-mm-dd
  const isoMatch = cleaned.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/)
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]))
    if (!isNaN(d.getTime())) return d
  }
  const fallback = new Date(cleaned)
  return isNaN(fallback.getTime()) ? null : fallback
}

async function mapColumnsWithAI(headers: string[], sampleRows: Record<string, string>[]): Promise<Record<string, string>> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')

  const openai = new OpenAI({ apiKey })

  const sampleData = sampleRows.slice(0, 3).map(row => {
    const entries: Record<string, string> = {}
    headers.slice(0, 20).forEach(h => { entries[h] = row[h] || '' })
    return entries
  })

  const prompt = `You are an expert AML/CFT auditor analyzing a dataset from a Brazilian financial institution.

Given these column headers and sample data, map the columns to the following audit rule fields.
Return ONLY a valid JSON object with the mappings. If a column cannot be mapped, set it to null.

COLUMN HEADERS: ${JSON.stringify(headers)}

SAMPLE DATA (first 3 rows): ${JSON.stringify(sampleData)}

Map to these fields:
- "risk_column": column with client risk classification/rating/score
- "screening_column": column with last screening/watchlist check date
- "kyc_col_1": first KYC identity field (CPF, CNPJ, document number)
- "kyc_col_2": second KYC field (address, income, occupation)
- "kyc_col_3": third KYC field (birth date, nationality)
- "kyc_col_4": fourth KYC field (any other required KYC field)
- "training_status_column": column with training completion status
- "training_date_column": column with training completion date
- "monitoring_column": column with last transaction monitoring date
- "pep_column": column indicating if client is a PEP
- "edd_column": column indicating enhanced due diligence status
- "sanctions_hit_column": column indicating a sanctions/watchlist match/hit
- "blocked_column": column indicating if the account/client was blocked
- "detection_date_column": column with date a suspicious activity was detected
- "report_date_column": column with date the COAF report was filed
- "score_column": column with the numeric risk score
- "category_column": column with risk category (alto/médio/baixo)
- "pep_flag_column": column specifically flagging PEP status (may be same as pep_column)
- "suspicious_column": column indicating if a transaction is suspicious/atypical
- "alert_column": column indicating if a monitoring alert was generated
- "risk_level_column": column with risk level classification (alto/high/médio/medium/baixo/low)
- "review_date_column": column with last review/update date

Return ONLY the JSON object, no explanation.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 500,
  })

  const content = response.choices[0]?.message?.content?.trim() || '{}'
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return {}

  try {
    const parsed = JSON.parse(jsonMatch[0])
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (value && typeof value === 'string' && headers.includes(value)) {
        result[key] = value
      }
    }
    return result
  } catch {
    return {}
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validation = validateBody(dataAnalyticsRequestSchema, body)
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { headers, rows, ruleIds } = validation.data

    const columnMapping = await mapColumnsWithAI(headers, rows)

    const rulesToRun = ruleIds
      ? AUDIT_RULES.filter(r => ruleIds.includes(r.id))
      : AUDIT_RULES

    const findings: RuleFinding[] = []

    for (const rule of rulesToRun) {
      const hasRelevantColumns = hasColumnsForRule(rule.id, columnMapping)
      if (!hasRelevantColumns) continue

      const issues: Record<string, string>[] = []
      for (const row of rows) {
        if (rule.evaluator(row, columnMapping)) {
          issues.push(row)
        }
      }

      if (issues.length > 0) {
        findings.push({
          ruleId: rule.id,
          ruleName: rule.name,
          description: rule.description,
          severity: rule.severity,
          totalIssues: issues.length,
          sampleRecords: issues.slice(0, 5),
        })
      }
    }

    findings.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 }
      return order[a.severity] - order[b.severity]
    })

    return NextResponse.json({
      findings,
      totalRowsAnalyzed: rows.length,
      columnMapping,
      rulesEvaluated: rulesToRun.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Data analytics error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function hasColumnsForRule(ruleId: string, mapping: Record<string, string>): boolean {
  switch (ruleId) {
    case 'risk_zero_clients':
      return !!mapping['risk_column']
    case 'missing_screening':
      return !!mapping['screening_column']
    case 'incomplete_kyc':
      return !!(mapping['kyc_col_1'] || mapping['kyc_col_2'] || mapping['kyc_col_3'] || mapping['kyc_col_4'])
    case 'training_gaps':
      return !!(mapping['training_status_column'] || mapping['training_date_column'])
    case 'inactive_monitoring':
      return !!mapping['monitoring_column']
    case 'pep_without_edd':
      return !!mapping['pep_column']
    case 'sanctions_penetration':
      return !!(mapping['sanctions_hit_column'] || mapping['blocked_column'])
    case 'coaf_timeliness':
      return !!(mapping['detection_date_column'] && mapping['report_date_column'])
    case 'kyc_risk_scoring':
      return !!(mapping['score_column'] || mapping['category_column'])
    case 'alert_backtest':
      return !!(mapping['suspicious_column'])
    case 'high_risk_no_review':
      return !!(mapping['risk_level_column'])
    default:
      return false
  }
}
