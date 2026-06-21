import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { analyzeRequestSchema, validateBody } from '@/lib/schemas'

function buildAnalysisPrompt(evidenceName: string, pillarContext: string): string {
  const nameLower = (evidenceName || '').toLowerCase()
  const ctxLower = (pillarContext || '').toLowerCase()

  let specializedCriteria = ''

  if (nameLower.includes('efetividade') || nameLower.includes('effectiveness') || ctxLower.includes('efetividade')) {
    specializedCriteria = `
## CRITÉRIOS ESPECIALIZADOS: AVALIAÇÃO DE EFETIVIDADE PLD-FT
Você está analisando um RELATÓRIO DE AVALIAÇÃO DE EFETIVIDADE. Aplique os seguintes critérios rigorosos de Big Four:

### A. Escopo e Abrangência
- Cobre TODOS os pilares do programa de PLD-FT? (governança, KYC, monitoramento, alertas, COAF, treinamento, etc.)
- Define claramente o período de avaliação?
- Inclui critérios de avaliação para cada componente?

### B. Metodologia
- A metodologia é clara, documentada e consistente?
- Usa indicadores quantitativos E qualitativos?
- Os critérios de "efetivo" vs. "não efetivo" estão bem definidos?
- Existe scoring/rating para cada componente?

### C. Testes Realizados
- Quais testes substantivos foram realizados?
- Amostras foram utilizadas? Qual tamanho e método de seleção?
- Há evidência de walkthrough de processos?
- Testes de design E de efetividade operacional?

### D. Resultados e Conclusões
- As conclusões são suportadas por evidências concretas?
- Há coerência entre os testes realizados e as conclusões?
- Deficiências foram identificadas com clareza?
- O nível de severidade das deficiências é adequado?

### E. Planos de Ação
- Deficiências geraram planos de ação com responsável e prazo?
- Há follow-up de planos de ação anteriores?
- Os prazos são realistas e proporcionais à severidade?

### F. Governança e Trilha de Auditoria
- Quem elaborou? Quem revisou? Há independência?
- Foi aprovado pela Alta Administração / Comitê de PLD?
- Há trilha de auditoria (versões, datas, aprovações)?
- Evidência de apresentação ao Comitê/Diretoria?

### G. Conformidade Regulatória
- Atende ao Art. 7º da Circular 3.978/2020?
- Periodicidade compatível com o perfil de risco da instituição?
- Contempla avaliação da adequação dos procedimentos e controles internos?

### H. Red Flags
- Relatório muito genérico / superficial (pro forma)
- Ausência de deficiências identificadas (improvável em qualquer instituição)
- Falta de dados quantitativos
- Conclusões não suportadas por testes
- Mesmo avaliador e executor (falta de independência)
`
  } else if (nameLower.includes('rair') || nameLower.includes('avaliação interna de risco') || nameLower.includes('risk assessment')) {
    specializedCriteria = `
## CRITÉRIOS ESPECIALIZADOS: RAIR / AVALIAÇÃO INTERNA DE RISCOS
Aplique critérios rigorosos para avaliação do RAIR:

### A. Fatores de Risco
- Contempla: clientes, produtos/serviços, canais, geografias?
- Os fatores são ponderados adequadamente?
- Há fundamentação técnica para os pesos?

### B. Metodologia de Risco
- Risco inerente vs. risco residual está claramente separado?
- Controles mitigadores estão mapeados para cada risco?
- A eficácia dos controles é avaliada objetivamente?
- Há backtesting ou validação da metodologia?

### C. Abrangência
- Cobre todos os produtos/serviços da instituição?
- Considera riscos emergentes (crypto, fintechs, novos canais)?
- Contempla riscos de terceiros/parceiros?

### D. Aprovação e Atualização
- Aprovado pela Alta Administração?
- Atualizado nos últimos 2 anos ou quando houve mudança material?
- Comunicado às áreas relevantes?

### E. Conformidade: Art. 10 a 15 da Circular 3.978/2020
`
  } else if (nameLower.includes('política') || nameLower.includes('policy') || nameLower.includes('pld')) {
    specializedCriteria = `
## CRITÉRIOS ESPECIALIZADOS: POLÍTICA DE PLD-FT
Verifique se a política contempla todos os elementos do Art. 2º da Circular 3.978/2020:
- I: Procedimentos de identificação e qualificação de clientes
- II: Procedimentos de monitoramento, seleção e análise
- III: Procedimentos de comunicação ao COAF
- IV: Avaliação interna de risco
- V: Procedimentos de avaliação de efetividade
- VI: Programa de treinamento
- VII: Procedimentos para análise de novos produtos/serviços

### Também verifique:
- Aprovação formal pela Alta Administração (ata)
- Data de aprovação e versão anterior
- Divulgação aos colaboradores
- Periodicidade de revisão definida
- Linguagem clara e aplicável
`
  } else if (nameLower.includes('ata') || nameLower.includes('comitê') || nameLower.includes('comite') || nameLower.includes('reunião')) {
    specializedCriteria = `
## CRITÉRIOS ESPECIALIZADOS: ATA DE REUNIÃO / COMITÊ
Avalie:
- Composição e quórum do Comitê
- Pauta: temas de PLD-FT foram discutidos?
- Deliberações concretas ou apenas informativas?
- Acompanhamento de ações anteriores?
- Indicadores/métricas apresentados (alertas, comunicações, etc.)?
- Tom da discussão (engajamento real vs. pro forma)
- Frequência adequada das reuniões
`
  } else if (nameLower.includes('treinamento') || nameLower.includes('capacitação') || nameLower.includes('training')) {
    specializedCriteria = `
## CRITÉRIOS ESPECIALIZADOS: TREINAMENTO PLD-FT
Avalie:
- Conteúdo programático cobre tipologias atuais?
- Inclui obrigações regulatórias específicas (Circular 3.978, Lei 9.613)?
- Diferencia conteúdo por público (operacional, compliance, alta admin)?
- Metodologia de avaliação de aprendizado
- Taxa de conclusão e cobertura
- Periodicidade e frequência de atualização
- Evidência de efetividade (pré/pós testes)
`
  } else if (nameLower.includes('monitoramento') || nameLower.includes('cenário') || nameLower.includes('regra') || nameLower.includes('alerta')) {
    specializedCriteria = `
## CRITÉRIOS ESPECIALIZADOS: MONITORAMENTO / CENÁRIOS / ALERTAS
Avalie:
- Cobertura das tipologias da CC 4.001/2020
- Parâmetros/thresholds são adequados ao perfil?
- Taxa de falso positivo e conversion rate
- Processo de calibração periódica
- Cenários para operações em espécie, câmbio, TED de alto valor
- Monitoramento de PEPs e pessoas sancionadas
- SLAs de tratamento de alertas
`
  } else if (nameLower.includes('coaf') || nameLower.includes('comunicação') || nameLower.includes('comunicacao') || nameLower.includes('siscoaf') || nameLower.includes('cos') || nameLower.includes('reporte')) {
    specializedCriteria = `
## CRITÉRIOS ESPECIALIZADOS: COMUNICAÇÕES AO COAF / SISCOAF
Avalie com rigor:

### A. Qualidade da Narrativa
- A comunicação descreve os fatos de forma clara e completa?
- Inclui contexto do relacionamento com o cliente?
- Descreve as operações suspeitas com detalhes (valores, datas, contrapartes)?
- A fundamentação da suspeita é objetiva e baseada em fatos?

### B. Documentação de Suporte
- Há trilha de decisão documentada (quem detectou, quem analisou, quem aprovou)?
- As evidências de suporte estão referenciadas?
- O dossiê do caso investigado está completo?

### C. Base Legal e Regulatória
- Cita a tipologia aplicável (CC 4.001/2020)?
- Referencia o artigo da Lei 9.613/1998 ou Circular 3.978/2020?
- Indica se é comunicação automática (Art. 35) ou de situação atípica (Art. 34)?

### D. Tempestividade
- Prazo entre detecção e comunicação (máximo 24h para Art. 11, §1º da Lei 9.613)?
- Data de recebimento do protocolo SISCOAF?
- Evidência de envio bem-sucedido?

### E. Completude dos Campos
- Dados do comunicante, do envolvido, da operação
- Valores, datas, tipo de operação
- Classificação da comunicação

### F. Decisões de Não-Comunicação
- Há registro documentado de situações analisadas e NÃO comunicadas?
- A justificativa para não comunicar é adequada e fundamentada?
- Quem tomou a decisão e com que alçada?

### G. Reconciliação
- As comunicações automáticas (espécie, câmbio) estão reconciliadas com as operações?
- Há gaps entre operações acima do threshold e comunicações enviadas?
`
  } else if (nameLower.includes('kyc') || nameLower.includes('cadastro') || nameLower.includes('dossiê') || nameLower.includes('dossie') || nameLower.includes('onboarding') || nameLower.includes('abertura')) {
    specializedCriteria = `
## CRITÉRIOS ESPECIALIZADOS: KYC / DOSSIÊ CADASTRAL
Avalie:

### A. Completude do Cadastro
- Todos os campos obrigatórios preenchidos (nome, CPF/CNPJ, endereço, profissão/atividade, renda/faturamento)?
- Documento de identidade válido e dentro da validade?
- Comprovante de endereço recente (últimos 3-6 meses)?
- Dados consistentes entre campos (renda vs. profissão, endereço vs. CEP)?

### B. Verificação de Identidade
- Procedimento de verificação não presencial adequado (se aplicável)?
- Liveness check ou validação facial (se digital)?
- Consulta a bases públicas (Receita Federal, Detran)?

### C. Beneficiário Final (PJ)
- Cadeia societária identificada até o beneficiário final pessoa física?
- Participações acima de 25% identificadas?
- Estruturas complexas (trusts, offshore, fundos) adequadamente documentadas?

### D. Classificação de Risco
- Classificação de risco atribuída e coerente com o perfil?
- PEP identificado e com EDD aplicada?
- País de origem/residência avaliado para risco geográfico?

### E. Due Diligence Reforçada (se alto risco)
- Procedimentos adicionais documentados?
- Aprovação por alçada superior?
- Origem dos recursos verificada?

### F. Conformidade com Art. 16-28 da Circular 3.978/2020
`
  } else if (nameLower.includes('auditoria interna') || nameLower.includes('internal audit') || nameLower.includes('relatório de auditoria')) {
    specializedCriteria = `
## CRITÉRIOS ESPECIALIZADOS: RELATÓRIO DE AUDITORIA INTERNA
Avalie conforme ISA 610 (Reliance on Internal Audit):

### A. Competência e Objetividade
- O auditor interno possui competência em PLD-FT?
- Há independência organizacional da área auditada?
- O plano de auditoria foi aprovado pelo Comitê de Auditoria/Conselho?

### B. Escopo e Metodologia
- O escopo cobre os requisitos regulatórios relevantes?
- A metodologia é adequada (amostras, walkthroughs, testes)?
- O período auditado é claramente definido?

### C. Achados e Recomendações
- Os achados são bem fundamentados (CCCE)?
- As recomendações são específicas e acionáveis?
- A severidade é adequada ao impacto?

### D. Follow-up de Achados Anteriores
- Há follow-up de achados anteriores?
- Status de implementação dos planos de ação?
- Achados recorrentes foram escalados?

### E. Grau de Confiança (ISA 610)
- Podemos confiar no trabalho realizado?
- Há necessidade de testes adicionais?
`
  }

  return `Você é o ARGUS, um auditor sênior de PLD-FT (Prevenção à Lavagem de Dinheiro e ao Financiamento do Terrorismo) com mais de 20 anos de experiência em Big Four, analisando um documento/imagem recebido como evidência de auditoria.

Analise o conteúdo de forma técnica, profunda e profissional. Sua análise DEVE cobrir:

1. **Resumo**: O que é o documento/imagem e seu propósito
2. **Cobertura Regulatória**: Quais requisitos regulatórios o documento atende (cite artigos específicos da Circular 3.978/2020, CC 4.001/2020, Lei 9.613/1998, Resolução BCB nº 343/2023)
3. **Pontos Positivos**: Aspectos bem cobertos e boas práticas observadas
4. **Gaps e Deficiências**: O que está faltando, é insuficiente ou apresenta risco - seja ESPECÍFICO
5. **Qualidade e Maturidade**: Avaliação da qualidade, profundidade e nível de maturidade
6. **Dados Relevantes Extraídos**: Números, datas, valores, métricas, nomes, períodos importantes
7. **Perguntas de Follow-up**: Questões que o auditor deve fazer à instituição com base neste documento
8. **Recomendações**: Testes adicionais, documentos complementares e ações de auditoria
9. **Rating Preliminar**: Sua avaliação preliminar da evidência (Satisfatória / Parcialmente Satisfatória / Insatisfatória / Inconclusiva)

Para IMAGENS (screenshots, organogramas, fluxogramas, prints de tela):
- Descreva DETALHADAMENTE tudo que você vê
- Identifique cada campo, dado, estrutura, fluxo visível
- Leia e transcreva textos, números e dados visíveis na imagem
- Avalie se a evidência é suficiente para o procedimento de teste
- Aponte informações que deveriam estar visíveis mas não estão

${specializedCriteria}

Seja EXTREMAMENTE específico, técnico e SEMPRE cite referências regulatórias. Formato: Markdown com seções claras. NÃO seja genérico - aponte achados concretos.`
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'])

interface TestProcedureInput {
  id: string
  code: string
  description: string
}

interface MatchedProcedure {
  code: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

function buildMatchingPrompt(testProcedures: TestProcedureInput[]): string {
  const procedureList = testProcedures
    .map(tp => `- ${tp.code}: ${tp.description}`)
    .join('\n')

  return `Você é um auditor sênior de PLD-FT. Com base no conteúdo do documento analisado, determine quais procedimentos de teste abaixo são atendidos (total ou parcialmente) por este documento/evidência.

## Procedimentos de Teste Disponíveis
${procedureList}

Para cada procedimento que o documento atende, retorne:
- "code": o código do procedimento
- "confidence": "high" se o documento claramente atende ao procedimento, "medium" se atende parcialmente ou indiretamente, "low" se há apenas uma relação tangencial
- "reason": breve justificativa em português (1-2 frases)

Retorne APENAS procedimentos que realmente são atendidos pelo documento. Se nenhum for atendido, retorne um array vazio.
Responda EXCLUSIVAMENTE com um JSON válido no formato: { "matches": [...] }`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validation = validateBody(analyzeRequestSchema, body)
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { textContent, evidenceName, pillarContext, imageBase64, uploadPath, testProcedures } = validation.data

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY não configurada' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })

    let resolvedImageBase64 = imageBase64 || ''

    if (!resolvedImageBase64 && uploadPath) {
      const ext = uploadPath.toLowerCase().split('.').pop() || ''
      if (IMAGE_EXTS.has(ext)) {
        try {
          const filePath = join(process.cwd(), uploadPath)
          const fileBuffer = await readFile(filePath)
          const mimeMap: Record<string, string> = {
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
            gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
          }
          const mime = mimeMap[ext] || 'image/png'
          resolvedImageBase64 = `data:${mime};base64,${fileBuffer.toString('base64')}`
        } catch {
          // file not found, proceed without image
        }
      }
    }

    const userPrompt = `## Documento: ${evidenceName}\n\n## Contexto do Pilar\n${pillarContext || 'Não informado'}`

    type ContentPart =
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string; detail: 'high' | 'low' | 'auto' } }

    const contentParts: ContentPart[] = [{ type: 'text', text: userPrompt }]

    if (resolvedImageBase64) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: resolvedImageBase64, detail: 'high' },
      })

      if (textContent && !textContent.startsWith('[')) {
        contentParts.push({
          type: 'text',
          text: `\n\n## Texto Extraído Complementar\n${(textContent || '').substring(0, 20000)}`,
        })
      }
    } else {
      const truncated = (textContent || '').substring(0, 30000)
      contentParts.push({
        type: 'text',
        text: `\n\n## Conteúdo do Documento\n${truncated}`,
      })
    }

    const systemPrompt = buildAnalysisPrompt(evidenceName || '', pillarContext || '')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contentParts },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    })

    const analysis = response.choices[0]?.message?.content || 'Não foi possível analisar o documento.'

    let matchedProcedures: MatchedProcedure[] = []

    const procedures = testProcedures as TestProcedureInput[] | undefined
    if (procedures && procedures.length > 0) {
      try {
        const matchingSystemPrompt = buildMatchingPrompt(procedures)

        const matchingUserParts: ContentPart[] = [
          { type: 'text', text: `## Documento: ${evidenceName}\n\n## Análise do Documento\n${analysis}` },
        ]

        if (resolvedImageBase64) {
          matchingUserParts.push({
            type: 'image_url',
            image_url: { url: resolvedImageBase64, detail: 'low' },
          })
        }

        if (textContent && !textContent.startsWith('[')) {
          matchingUserParts.push({
            type: 'text',
            text: `\n\n## Conteúdo do Documento\n${(textContent || '').substring(0, 15000)}`,
          })
        }

        const matchResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: matchingSystemPrompt },
            { role: 'user', content: matchingUserParts },
          ],
          temperature: 0.1,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        })

        const matchContent = matchResponse.choices[0]?.message?.content
        if (matchContent) {
          const parsed = JSON.parse(matchContent)
          if (Array.isArray(parsed.matches)) {
            matchedProcedures = parsed.matches.filter(
              (m: Record<string, unknown>) =>
                typeof m.code === 'string' &&
                ['high', 'medium', 'low'].includes(m.confidence as string) &&
                typeof m.reason === 'string'
            )
          }
        }
      } catch (matchError) {
        console.error('Procedure matching error:', matchError)
      }
    }

    return NextResponse.json({ analysis, matchedProcedures })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Analyze API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
