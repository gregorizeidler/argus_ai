import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import Tesseract from 'tesseract.js'
import { ocrRequestSchema, validateBody } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validation = validateBody(ocrRequestSchema, body)
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { uploadPath, imageBase64 } = validation.data

    let imageBuffer: Buffer

    if (imageBase64) {
      const base64Data = (imageBase64 as string).replace(/^data:image\/\w+;base64,/, '')
      imageBuffer = Buffer.from(base64Data, 'base64')
    } else {
      const filePath = join(process.cwd(), uploadPath as string)
      imageBuffer = await readFile(filePath)
    }

    const result = await Tesseract.recognize(imageBuffer, 'por+eng')

    const text = result.data.text?.trim() || ''
    const confidence = result.data.confidence ?? 0

    const wordCount = text.split(/\s+/).filter(Boolean).length

    return NextResponse.json({
      text,
      confidence,
      wordCount,
      method: 'tesseract',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro no OCR'
    console.error('OCR API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
