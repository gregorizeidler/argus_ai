import { writeFile, mkdir, readFile, unlink, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export interface StorageProvider {
  upload(key: string, buffer: Buffer, contentType?: string): Promise<string>
  download(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  getUrl(key: string): string
}

class LocalStorageProvider implements StorageProvider {
  private baseDir: string

  constructor(baseDir?: string) {
    this.baseDir = baseDir || join(process.cwd(), 'uploads')
  }

  async upload(key: string, buffer: Buffer): Promise<string> {
    const dir = join(this.baseDir, ...key.split('/').slice(0, -1))
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
    const filePath = join(this.baseDir, key)
    await writeFile(filePath, buffer)
    return `uploads/${key}`
  }

  async download(key: string): Promise<Buffer> {
    const filePath = join(this.baseDir, key)
    return readFile(filePath)
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.baseDir, key)
    try {
      await unlink(filePath)
    } catch {
      // already deleted
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = join(this.baseDir, key)
    try {
      await stat(filePath)
      return true
    } catch {
      return false
    }
  }

  getUrl(key: string): string {
    return `/api/files/${key}`
  }
}

/**
 * S3 Storage Provider — requires @aws-sdk/client-s3 to be installed.
 * Install with: npm install @aws-sdk/client-s3
 * Set env vars: S3_BUCKET, S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */
class S3StorageProvider implements StorageProvider {
  private bucket: string
  private region: string

  constructor() {
    this.bucket = process.env.S3_BUCKET || ''
    this.region = process.env.S3_REGION || 'us-east-1'
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getS3(): Promise<{ client: any; commands: any }> {
    // Dynamic import — only loaded when S3 provider is actually used
    // Install: npm install @aws-sdk/client-s3
    const modPath = '@aws-sdk/client-s3'
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(modPath)
    return { client: new mod.S3Client({ region: this.region }), commands: mod }
  }

  async upload(key: string, buffer: Buffer, contentType?: string): Promise<string> {
    const { client, commands } = await this.getS3()
    await client.send(new commands.PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: buffer,
      ContentType: contentType || 'application/octet-stream',
    }))
    return `s3://${this.bucket}/${key}`
  }

  async download(key: string): Promise<Buffer> {
    const { client, commands } = await this.getS3()
    const result = await client.send(new commands.GetObjectCommand({
      Bucket: this.bucket, Key: key,
    }))
    const stream = result.Body as NodeJS.ReadableStream
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  async delete(key: string): Promise<void> {
    const { client, commands } = await this.getS3()
    await client.send(new commands.DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async exists(key: string): Promise<boolean> {
    const { client, commands } = await this.getS3()
    try {
      await client.send(new commands.HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch {
      return false
    }
  }

  getUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
  }
}

let _provider: StorageProvider | null = null

export function getStorageProvider(): StorageProvider {
  if (!_provider) {
    const storageType = process.env.STORAGE_PROVIDER || 'local'
    _provider = storageType === 's3'
      ? new S3StorageProvider()
      : new LocalStorageProvider()
  }
  return _provider
}

export function generateUploadKey(fileName: string): string {
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${timestamp}-${safeName}`
}
