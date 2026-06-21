import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { reportRequestSchema, validateBody } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validation = validateBody(reportRequestSchema, body)
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { prompt } = validation.data

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY não configurada' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um auditor sênior de PLD-FT elaborando o relatório final de auditoria. Escreva em português formal, técnico e detalhado, no padrão de relatórios de Big Four. Use markdown para formatação.'
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 8192,
    })

    const content = response.choices[0]?.message?.content || ''

    return NextResponse.json({ content })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Report API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
