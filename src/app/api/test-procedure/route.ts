import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { testProcedureRequestSchema, validateBody } from '@/lib/schemas'

interface ChecklistItem {
  requirement: string
  regulatoryRef: string
  status: 'pass' | 'fail' | 'partial' | 'not_found'
  details: string
  location: string
}

interface TestExecutionResult {
  procedureCode: string
  overallResult: 'pass' | 'fail' | 'partial'
  checklist: ChecklistItem[]
  summary: string
  observations: string
  recommendation: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validation = validateBody(testProcedureRequestSchema, body)
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const {
      procedureCode,
      procedureDescription,
      procedureMethodology,
      regulatoryBasis,
      evidenceContent,
      evidenceName,
      evidenceAnalysis,
    } = validation.data

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY não configurada' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })

    const systemPrompt = `Você é o ARGUS, um auditor sênior de PLD-FT executando um procedimento de teste específico sobre uma evidência documental.

Você DEVE executar o teste de forma rigorosa e estruturada, como um auditor de Big Four faria.

## PROCEDIMENTO DE TESTE
- Código: ${procedureCode}
- Descrição: ${procedureDescription}
- Metodologia: ${procedureMethodology}
- Base Regulatória: ${(regulatoryBasis || []).join('; ')}

## INSTRUÇÕES

1. Decomponha o procedimento em requisitos individuais verificáveis
2. Para CADA requisito, verifique se a evidência o atende
3. Seja ESPECÍFICO: cite onde no documento cada requisito é atendido (ou não)
4. Atribua um status para cada requisito:
   - "pass": requisito claramente atendido pela evidência
   - "fail": requisito não atendido ou ausente
   - "partial": parcialmente atendido, falta complemento
   - "not_found": não foi possível verificar com a evidência disponível

5. Atribua um resultado geral:
   - "pass": maioria dos requisitos atendidos, sem falhas críticas
   - "fail": requisitos críticos não atendidos
   - "partial": mix de atendidos e não atendidos

Responda EXCLUSIVAMENTE com JSON válido no formato:
{
  "procedureCode": "${procedureCode}",
  "overallResult": "pass" | "fail" | "partial",
  "checklist": [
    {
      "requirement": "descrição do requisito",
      "regulatoryRef": "artigo/norma específica",
      "status": "pass" | "fail" | "partial" | "not_found",
      "details": "explicação detalhada do que foi encontrado ou não",
      "location": "onde no documento (seção, página, trecho)"
    }
  ],
  "summary": "resumo executivo do resultado do teste em 2-3 frases",
  "observations": "observações relevantes para o workpaper",
  "recommendation": "próximos passos recomendados"
}`

    const userContent = `## Evidência: ${evidenceName}

${evidenceAnalysis ? `## Análise Prévia da Evidência\n${evidenceAnalysis.substring(0, 5000)}\n\n` : ''}## Conteúdo da Evidência
${(evidenceContent || '').substring(0, 25000)}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'Sem resposta da IA' }, { status: 500 })
    }

    const result: TestExecutionResult = JSON.parse(content)

    return NextResponse.json({ result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Test procedure API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
