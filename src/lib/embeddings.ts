import OpenAI from 'openai'

export interface EmbeddingChunk {
  id: string
  text: string
  embedding: number[]
  metadata: {
    auditId: string
    entityType: 'evidence' | 'finding' | 'test' | 'interview' | 'memo' | 'chat'
    entityId: string
    pillarCode?: string
    title?: string
  }
}

const EMBEDDING_STORAGE_KEY = 'argus-embeddings'
const EMBEDDING_MODEL = 'text-embedding-3-small'
const MAX_CHUNK_TOKENS = 500

function getStoredEmbeddings(): EmbeddingChunk[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(EMBEDDING_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveEmbeddings(chunks: EmbeddingChunk[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(EMBEDDING_STORAGE_KEY, JSON.stringify(chunks))
  } catch {
    const trimmed = chunks.slice(-500)
    localStorage.setItem(EMBEDDING_STORAGE_KEY, JSON.stringify(trimmed))
  }
}

export function splitIntoChunks(text: string, maxLength = MAX_CHUNK_TOKENS * 4): string[] {
  if (text.length <= maxLength) return [text]

  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxLength) {
      if (current) chunks.push(current.trim())
      current = para
    } else {
      current += (current ? '\n\n' : '') + para
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

export async function generateEmbeddings(
  texts: string[],
  apiKey: string,
): Promise<number[][]> {
  const openai = new OpenAI({ apiKey })
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  })
  return response.data.map(d => d.embedding)
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function indexDocument(params: {
  text: string
  metadata: EmbeddingChunk['metadata']
  apiKey: string
}): Promise<number> {
  const chunks = splitIntoChunks(params.text)
  const embeddings = await generateEmbeddings(chunks, params.apiKey)

  const stored = getStoredEmbeddings()

  const filtered = stored.filter(
    s => !(s.metadata.entityType === params.metadata.entityType && s.metadata.entityId === params.metadata.entityId)
  )

  const newChunks: EmbeddingChunk[] = chunks.map((text, i) => ({
    id: `emb-${Date.now()}-${i}`,
    text,
    embedding: embeddings[i],
    metadata: params.metadata,
  }))

  saveEmbeddings([...filtered, ...newChunks])
  return newChunks.length
}

export async function semanticSearch(params: {
  query: string
  apiKey: string
  auditId?: string
  entityType?: EmbeddingChunk['metadata']['entityType']
  topK?: number
  minScore?: number
}): Promise<Array<{ chunk: EmbeddingChunk; score: number }>> {
  const { query, apiKey, auditId, entityType, topK = 5, minScore = 0.3 } = params

  const [queryEmbedding] = await generateEmbeddings([query], apiKey)
  let chunks = getStoredEmbeddings()

  if (auditId) chunks = chunks.filter(c => c.metadata.auditId === auditId)
  if (entityType) chunks = chunks.filter(c => c.metadata.entityType === entityType)

  const scored = chunks
    .map(chunk => ({ chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return scored
}

export function clearEmbeddings(auditId?: string) {
  if (auditId) {
    const stored = getStoredEmbeddings()
    saveEmbeddings(stored.filter(s => s.metadata.auditId !== auditId))
  } else {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(EMBEDDING_STORAGE_KEY)
    }
  }
}
