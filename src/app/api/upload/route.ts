import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import Tesseract from 'tesseract.js'
import { uploadFieldsSchema, validateBody } from '@/lib/schemas'

const MAX_TEXT_LENGTH = 50_000

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'])
const TEXT_EXTS = new Set(['txt', 'md', 'json', 'xml', 'log', 'html', 'htm'])

async function runTesseractOCR(buffer: Buffer): Promise<{ text: string; confidence: number }> {
  const result = await Tesseract.recognize(buffer, 'por+eng', {
    logger: () => {},
  })
  return {
    text: result.data.text?.trim() || '',
    confidence: result.data.confidence ?? 0,
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const ocrMode = (formData.get('ocrMode') as string) || 'llm'

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    const fieldValidation = validateBody(uploadFieldsSchema, {
      fileName: file.name,
      fileSize: file.size,
      ocrMode,
    })
    if ('error' in fieldValidation) {
      return NextResponse.json({ error: fieldValidation.error }, { status: 400 })
    }

    const uploadsDir = join(process.cwd(), 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueName = `${timestamp}-${safeName}`
    const filePath = join(uploadsDir, uniqueName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(filePath, buffer)

    const ext = file.name.toLowerCase().split('.').pop() || ''
    const isImage = IMAGE_EXTS.has(ext)
    const useDedicatedOCR = ocrMode === 'dedicated'

    let textContent = ''
    let imageBase64 = ''
    let ocrConfidence: number | undefined

    if (isImage) {
      if (useDedicatedOCR) {
        const ocr = await runTesseractOCR(buffer)
        textContent = ocr.text || '[OCR não conseguiu extrair texto da imagem]'
        ocrConfidence = ocr.confidence
      } else {
        const mimeMap: Record<string, string> = {
          png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
          gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
        }
        const mime = mimeMap[ext] || 'image/png'
        imageBase64 = `data:${mime};base64,${buffer.toString('base64')}`
        textContent = '[Imagem - será analisada via GPT-4o Vision]'
      }
    } else {
      try {
        if (ext === 'pdf') {
          const { PDFParse } = await import('pdf-parse')
          const parser = new PDFParse({ data: new Uint8Array(buffer) })
          const result = await parser.getText()
          textContent = result.text || ''
          await parser.destroy()

          if (textContent.trim().length < 100) {
            if (useDedicatedOCR) {
              const ocr = await runTesseractOCR(buffer)
              textContent = ocr.text || '[OCR não conseguiu extrair texto do PDF escaneado]'
              ocrConfidence = ocr.confidence
            } else {
              textContent = '[PDF escaneado/com imagens - será analisado via GPT-4o Vision]'
            }
          }
        } else if (ext === 'csv') {
          textContent = buffer.toString('utf-8')
        } else if (['xlsx', 'xls'].includes(ext)) {
          const XLSX = await import('xlsx')
          const workbook = XLSX.read(buffer, { type: 'buffer' })
          const sheets = workbook.SheetNames.map(name => {
            const sheet = workbook.Sheets[name]
            return `=== ${name} ===\n${XLSX.utils.sheet_to_csv(sheet)}`
          })
          textContent = sheets.join('\n\n')
        } else if (TEXT_EXTS.has(ext)) {
          textContent = buffer.toString('utf-8')
        } else if (['doc', 'docx', 'ppt', 'pptx'].includes(ext)) {
          textContent = '[Formato Office - texto extraído parcialmente]'
        } else {
          textContent = '[Formato não suportado para extração direta de texto]'
        }
      } catch (parseError) {
        console.error('Text extraction error:', parseError)
        textContent = `[Erro ao extrair texto: ${parseError instanceof Error ? parseError.message : 'desconhecido'}]`
      }
    }

    textContent = textContent.slice(0, MAX_TEXT_LENGTH)

    return NextResponse.json({
      id: `upload-${timestamp}`,
      fileName: file.name,
      fileSize: file.size,
      textContent,
      uploadPath: `uploads/${uniqueName}`,
      isImage,
      imageBase64: isImage && !useDedicatedOCR ? imageBase64 : undefined,
      ocrMode,
      ocrConfidence,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Upload API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
