import { NextRequest, NextResponse } from 'next/server'
import { importFileSchema, validateBody } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    const fieldValidation = validateBody(importFileSchema, {
      fileName: file.name,
      fileSize: file.size,
    })
    if ('error' in fieldValidation) {
      return NextResponse.json({ error: fieldValidation.error }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let headers: string[] = []
    let rows: Record<string, string>[] = []
    let totalRows = 0

    if (fileName.endsWith('.csv')) {
      const text = buffer.toString('utf-8')
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length > 0) {
        headers = parseCSVLine(lines[0])
        for (let i = 1; i < Math.min(lines.length, 1001); i++) {
          const values = parseCSVLine(lines[i])
          const row: Record<string, string> = {}
          headers.forEach((h, idx) => { row[h] = values[idx] || '' })
          rows.push(row)
        }
        totalRows = lines.length - 1
      }
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

      if (jsonData.length > 0) {
        headers = Object.keys(jsonData[0])
        totalRows = jsonData.length
        rows = jsonData.slice(0, 1000).map(row => {
          const r: Record<string, string> = {}
          headers.forEach(h => { r[h] = String(row[h] ?? '') })
          return r
        })
      }
    } else {
      return NextResponse.json({ error: 'Formato não suportado. Use CSV ou Excel.' }, { status: 400 })
    }

    return NextResponse.json({ headers, rows, totalRows })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Import API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}
