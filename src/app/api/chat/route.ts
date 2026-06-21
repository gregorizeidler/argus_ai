import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { chatRequestSchema, validateBody } from '@/lib/schemas'

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'request_evidence',
      description: 'Solicitar uma evidência/documento à instituição auditada',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome da evidência' },
          description: { type: 'string', description: 'Descrição detalhada do que é solicitado' },
          type: { type: 'string', enum: ['policy', 'procedure', 'report', 'system_screenshot', 'sample', 'training_material', 'meeting_minutes', 'correspondence', 'data_extract', 'other'] },
        },
        required: ['name', 'description', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_finding',
      description: 'Registrar um achado de auditoria identificado durante a análise',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título do achado' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          condition: { type: 'string', description: 'Condição: o que foi encontrado' },
          criteria: { type: 'string', description: 'Critério: o que deveria ser (base regulatória)' },
          cause: { type: 'string', description: 'Causa: por que ocorre a deficiência' },
          effect: { type: 'string', description: 'Efeito: impacto/risco para a instituição' },
          recommendation: { type: 'string', description: 'Recomendação de melhoria' },
          regulatoryReference: { type: 'array', items: { type: 'string' }, description: 'Referências regulatórias' },
        },
        required: ['title', 'severity', 'condition', 'criteria', 'cause', 'effect', 'recommendation'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rate_pillar',
      description: 'Atribuir rating de efetividade a um pilar ou sub-área',
      parameters: {
        type: 'object',
        properties: {
          pillarId: { type: 'string' },
          rating: { type: 'string', enum: ['effective', 'largely_effective', 'partially_effective', 'ineffective'] },
          justification: { type: 'string', description: 'Justificativa para o rating' },
        },
        required: ['pillarId', 'rating', 'justification'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_sample',
      description: 'Solicitar seleção de amostra para teste substantivo',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Descrição da amostra' },
          population: { type: 'string', description: 'Descrição da população' },
          populationSize: { type: 'number' },
          sampleSize: { type: 'number' },
          selectionMethod: { type: 'string', enum: ['random', 'stratified', 'judgmental', 'monetary_unit'] },
        },
        required: ['description', 'population', 'sampleSize', 'selectionMethod'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_test_procedure',
      description: 'Registrar resultado de um procedimento de teste com base na análise das evidências',
      parameters: {
        type: 'object',
        properties: {
          testProcedureCode: { type: 'string', description: 'Código do procedimento (ex: GOV-1.1)' },
          result: { type: 'string', enum: ['pass', 'fail', 'partial', 'not_applicable'], description: 'Resultado do teste' },
          observations: { type: 'string', description: 'Observações detalhadas e justificativa do resultado' },
          conclusion: { type: 'string', description: 'Conclusão do procedimento de teste' },
        },
        required: ['testProcedureCode', 'result', 'observations'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'link_evidence',
      description: 'Vincular uma evidência existente a um procedimento de teste',
      parameters: {
        type: 'object',
        properties: {
          evidenceName: { type: 'string', description: 'Nome (ou parte do nome) da evidência a vincular' },
          testProcedureCode: { type: 'string', description: 'Código do procedimento de teste (ex: KYC-1.2)' },
        },
        required: ['evidenceName', 'testProcedureCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_sub_area_rating',
      description: 'Atribuir rating de efetividade a uma sub-área específica de um pilar',
      parameters: {
        type: 'object',
        properties: {
          subAreaCode: { type: 'string', description: 'Código da sub-área (ex: GOV-1)' },
          rating: { type: 'string', enum: ['effective', 'largely_effective', 'partially_effective', 'ineffective'] },
          justification: { type: 'string', description: 'Justificativa para o rating atribuído' },
        },
        required: ['subAreaCode', 'rating', 'justification'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_evidence_status',
      description: 'Aceitar ou rejeitar formalmente uma evidência recebida, ou solicitar esclarecimentos',
      parameters: {
        type: 'object',
        properties: {
          evidenceName: { type: 'string', description: 'Nome da evidência' },
          newStatus: { type: 'string', enum: ['accepted', 'rejected', 'pending_clarification'], description: 'Novo status da evidência' },
          reviewNotes: { type: 'string', description: 'Observações de revisão / motivo da rejeição ou solicitação de esclarecimento' },
        },
        required: ['evidenceName', 'newStatus', 'reviewNotes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_audit_phase',
      description: 'Avançar a fase da auditoria (Planejamento → Trabalho de Campo → Testes → Relatório → Concluído). Só avança para a próxima fase se os requisitos mínimos forem atendidos.',
      parameters: {
        type: 'object',
        properties: {
          targetPhase: { type: 'string', enum: ['fieldwork', 'testing', 'reporting', 'completed'], description: 'Fase de destino' },
          justification: { type: 'string', description: 'Justificativa para a mudança de fase' },
        },
        required: ['targetPhase', 'justification'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_management_response',
      description: 'Registrar a resposta formal da administração a um achado de auditoria (concordância/discordância e plano de ação)',
      parameters: {
        type: 'object',
        properties: {
          findingTitle: { type: 'string', description: 'Título do achado' },
          agreement: { type: 'string', enum: ['agree', 'partially_agree', 'disagree'], description: 'Concordância da administração' },
          responseText: { type: 'string', description: 'Texto da resposta da administração' },
          actionOwner: { type: 'string', description: 'Responsável pelo plano de ação' },
          actionTargetDate: { type: 'string', description: 'Data alvo para implementação (YYYY-MM-DD)' },
          actionDescription: { type: 'string', description: 'Descrição do plano de ação' },
        },
        required: ['findingTitle', 'agreement', 'responseText'],
      },
    },
  },
]

function truncateMessages(
  messages: OpenAI.ChatCompletionMessageParam[]
): OpenAI.ChatCompletionMessageParam[] {
  const MAX_MESSAGES = 30
  if (messages.length <= MAX_MESSAGES) return messages

  const contextMessages = messages.slice(0, 2)
  const recentMessages = messages.slice(-20)
  const droppedCount = messages.length - 22

  const summaryMessage: OpenAI.ChatCompletionMessageParam = {
    role: 'system',
    content: `[${droppedCount} mensagens anteriores foram omitidas para manter o contexto dentro do limite. O histórico completo incluía discussões sobre evidências, achados e análises dos pilares.]`,
  }

  return [...contextMessages, summaryMessage, ...recentMessages]
}

function sendSSE(
  controller: ReadableStreamDefaultController,
  data: Record<string, unknown>
) {
  const payload = `data: ${JSON.stringify(data)}\n\n`
  controller.enqueue(new TextEncoder().encode(payload))
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY não configurada' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Request body inválido' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const validation = validateBody(chatRequestSchema, rawBody)
  if ('error' in validation) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { messages, systemPrompt } = validation.data
  const openai = new OpenAI({ apiKey })

  const allMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...(messages as OpenAI.ChatCompletionMessageParam[]),
  ]
  const truncated = truncateMessages(allMessages)

  const MAX_TOOL_ITERATIONS = 5

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const conversationMessages: OpenAI.ChatCompletionMessageParam[] = [...truncated]
        let fullContentBuffer = ''
        let iterations = 0

        while (iterations < MAX_TOOL_ITERATIONS) {
          const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: conversationMessages,
            tools,
            temperature: 0.3,
            max_tokens: 4096,
            stream: true,
          })

          let iterationContent = ''
          const toolCalls: Record<number, { id: string; name: string; arguments: string }> = {}

          for await (const chunk of response) {
            const delta = chunk.choices[0]?.delta
            if (!delta) continue

            if (delta.content) {
              iterationContent += delta.content
              sendSSE(controller, { type: 'text', content: delta.content })
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index
                if (!toolCalls[idx]) {
                  toolCalls[idx] = { id: tc.id || '', name: '', arguments: '' }
                }
                if (tc.id) toolCalls[idx].id = tc.id
                if (tc.function?.name) toolCalls[idx].name = tc.function.name
                if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments
              }
            }
          }

          fullContentBuffer += iterationContent

          const validToolCalls = Object.values(toolCalls).filter(
            (call) => call.name && call.arguments
          )

          if (validToolCalls.length === 0) break

          const assistantToolCalls: OpenAI.ChatCompletionMessageToolCall[] = []

          for (const call of validToolCalls) {
            try {
              const args = JSON.parse(call.arguments)
              sendSSE(controller, {
                type: 'function_call',
                name: call.name,
                arguments: args,
              })
              assistantToolCalls.push({
                id: call.id,
                type: 'function' as const,
                function: { name: call.name, arguments: call.arguments },
              })
            } catch {
              sendSSE(controller, {
                type: 'error',
                message: `Erro ao processar chamada de função: ${call.name}`,
              })
            }
          }

          if (assistantToolCalls.length === 0) break

          const assistantMessage: OpenAI.ChatCompletionAssistantMessageParam = {
            role: 'assistant',
            ...(iterationContent ? { content: iterationContent } : {}),
            tool_calls: assistantToolCalls,
          }
          conversationMessages.push(assistantMessage)

          for (const tc of assistantToolCalls) {
            let parsedArgs: Record<string, unknown> = {}
            try {
              parsedArgs = JSON.parse(tc.function.arguments)
            } catch {
              // keep empty
            }
            const toolResultMessage: OpenAI.ChatCompletionToolMessageParam = {
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify({
                status: 'success',
                tool: tc.function.name,
                result: `A ação "${tc.function.name}" foi executada com sucesso no sistema. ${
                  tc.function.name === 'request_evidence' ? `Evidência "${parsedArgs.name || ''}" foi registrada como solicitada.` :
                  tc.function.name === 'create_finding' ? `Achado "${parsedArgs.title || ''}" foi registrado com severidade ${parsedArgs.severity || 'N/A'}.` :
                  tc.function.name === 'rate_pillar' ? `O pilar foi avaliado como "${parsedArgs.rating || 'N/A'}".` :
                  tc.function.name === 'request_sample' ? `Amostra de ${parsedArgs.sampleSize || 'N'} itens foi criada.` :
                  tc.function.name === 'run_test_procedure' ? `Procedimento ${parsedArgs.procedureCode || ''} foi executado.` :
                  tc.function.name === 'link_evidence' ? `Evidência vinculada ao procedimento de teste.` :
                  tc.function.name === 'update_sub_area_rating' ? `Sub-área avaliada como "${parsedArgs.rating || 'N/A'}".` :
                  tc.function.name === 'update_evidence_status' ? `Status da evidência atualizado para "${parsedArgs.status || 'N/A'}".` :
                  tc.function.name === 'update_audit_phase' ? `Fase da auditoria atualizada para "${parsedArgs.phase || 'N/A'}".` :
                  tc.function.name === 'record_management_response' ? `Resposta da gestão registrada.` :
                  'Ação executada.'
                } Continue com sua análise e responda ao auditor.`,
              }),
            }
            conversationMessages.push(toolResultMessage)
          }

          iterations++
        }

        sendSSE(controller, { type: 'done', content: fullContentBuffer })
        controller.close()
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido na API OpenAI'
        sendSSE(controller, { type: 'error', message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
