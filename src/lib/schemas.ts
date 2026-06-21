import { z } from 'zod'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { data: T } | { error: string } {
  const result = schema.safeParse(body)
  if (!result.success) {
    return {
      error: result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
    }
  }
  return { data: result.data }
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

const chatMessageSchema = z
  .object({
    role: z.enum(['system', 'user', 'assistant', 'tool', 'function']),
    content: z
      .union([z.string(), z.null(), z.array(z.any())])
      .optional(),
  })
  .passthrough()

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  systemPrompt: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Analyze
// ---------------------------------------------------------------------------

const testProcedureItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
})

export const analyzeRequestSchema = z.object({
  textContent: z.string().optional(),
  evidenceName: z.string().min(1),
  pillarContext: z.string().optional(),
  imageBase64: z.string().optional(),
  uploadPath: z.string().optional(),
  testProcedures: z.array(testProcedureItemSchema).optional(),
})

// ---------------------------------------------------------------------------
// Upload  (FormData — validated after field extraction)
// ---------------------------------------------------------------------------

export const uploadFieldsSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  ocrMode: z.enum(['llm', 'dedicated']).default('llm'),
})

// ---------------------------------------------------------------------------
// Test Procedure
// ---------------------------------------------------------------------------

export const testProcedureRequestSchema = z.object({
  procedureCode: z.string().min(1),
  procedureDescription: z.string().min(1),
  procedureMethodology: z.string().optional(),
  regulatoryBasis: z.array(z.string()).optional(),
  evidenceContent: z.string().optional(),
  evidenceName: z.string().min(1),
  evidenceAnalysis: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Data Analytics
// ---------------------------------------------------------------------------

export const dataAnalyticsRequestSchema = z.object({
  headers: z.array(z.string()).min(1),
  rows: z.array(z.record(z.string(), z.string())).min(1),
  ruleIds: z.array(z.string()).optional(),
})

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export const reportRequestSchema = z.object({
  prompt: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Import  (FormData — validated after field extraction)
// ---------------------------------------------------------------------------

export const importFileSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
})

// ---------------------------------------------------------------------------
// OCR
// ---------------------------------------------------------------------------

export const ocrRequestSchema = z
  .object({
    uploadPath: z.string().optional(),
    imageBase64: z.string().optional(),
  })
  .refine((data) => data.uploadPath || data.imageBase64, {
    message: 'Either uploadPath or imageBase64 must be provided',
  })
