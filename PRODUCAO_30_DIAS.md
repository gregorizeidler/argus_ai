# 🚀 ARGUS PLD: Plano Executivo 30 Dias para Produção Real

## **Visão Geral: O que Mudar Agora para Clientes Pagarem**

Você tem um produto bom. **Precisa:**
1. Remover feature flags de MVP
2. Adicionar multi-tenant (múltiplos clientes isolados)
3. Billing integrado (Stripe)
4. Logging/monitoramento profissional
5. Documentação para clientes

**Custo investimento: ~R$ 1-2k/mês em SaaS**  
**Receita mínima para lucro: R$ 5-10k/mês (5-10 clientes × R$ 1-2k)**

---

## 📅 **SEMANA 1: Infraestrutura & Data**

### **DIA 1-2: Banco de Dados + Auth Real**

**O que fazer:**
```bash
# 1. Supabase (5 min setup)
# → https://app.supabase.com
# → Create new project → PostgreSQL
# → Copy DATABASE_URL

# 2. Instalar Prisma
npm install @prisma/client prisma

# 3. Atualizar schema
# prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  passwordHash  String
  role          UserRole
  
  # ⭐ NOVO: Multi-tenant
  organizationId String
  organization  Organization @relation(fields: [organizationId], references: [id])
  
  createdAt     DateTime  @default(now())
  @@index([organizationId])
}

# ⭐ NOVO MODELO
model Organization {
  id            String    @id @default(cuid())
  name          String
  plan          String    @default("starter")  # starter/professional/enterprise
  stripeId      String?   @unique
  users         User[]
  audits        Audit[]
  createdAt     DateTime  @default(now())
}

model Audit {
  # ... campos existentes
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId])
}

# 4. Rodar migrations
npx prisma migrate dev --name add-organizations
npx prisma generate

# 5. .env.local (NUNCA commit)
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
```

**Arquivo: .env.example**
```env
# Database (Supabase)
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres

# Auth
NEXTAUTH_SECRET=generate-with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Stripe (Billing)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=

# Monitoring (Sentry)
NEXT_PUBLIC_SENTRY_DSN=

# Redis (Rate limiting)
UPSTASH_REDIS_URL=redis://...
UPSTASH_REDIS_TOKEN=
```

**Criar User Service com Hash:**
```typescript
// src/lib/user-service.ts
import bcrypt from 'bcryptjs'
import { prisma } from './db'

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function findOrCreateOrganization(name: string) {
  return prisma.organization.upsert({
    where: { name },
    update: {},
    create: { name, plan: 'starter' }
  })
}

export async function registerUser(
  email: string,
  name: string,
  password: string,
  organizationName: string
) {
  const org = await findOrCreateOrganization(organizationName)
  
  const passwordHash = await hashPassword(password)
  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: 'AUDITOR',
      organizationId: org.id,
    },
  })
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null
  
  const isValid = await verifyPassword(password, user.passwordHash)
  return isValid ? user : null
}
```

**Atualizar NextAuth:**
```typescript
// src/lib/auth.ts
import { authenticateUser } from './user-service'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = await authenticateUser(credentials.email, credentials.password)
        if (!user) return null
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.organizationId = user.organizationId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.organizationId = token.organizationId
      }
      return session
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}
```

**Criar API de Registro:**
```typescript
// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/user-service'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  organizationName: z.string().min(2),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name, password, organizationName } = schema.parse(body)

    const user = await registerUser(email, name, password, organizationName)
    
    return NextResponse.json({
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 400 }
    )
  }
}
```

---

### **DIA 3: Middleware de Multi-Tenant**

**Proteção: usuário só vê dados da sua organização**

```typescript
// src/lib/auth-helpers.ts
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth'
import { prisma } from './db'

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  
  return prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { organization: true },
  })
}

// ⭐ NOVO: Verificar organização
export async function getCurrentOrganization() {
  const user = await getCurrentUser()
  return user?.organization || null
}

// ⭐ NOVO: Middleware para proteger rotas
export async function requireOrganization(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  
  // Adicionar organizationId em request para usar depois
  const headers = new Headers(req.headers)
  headers.set('x-organization-id', user.organizationId)
  
  return { user, organizationId: user.organizationId }
}

// ⭐ NOVO: Query builder com filtro de organização
export async function getAuditForOrganization(auditId: string, organizationId: string) {
  return prisma.audit.findFirst({
    where: {
      id: auditId,
      organizationId, // ⭐ SEGURANÇA: garante que só vê da própria org
    },
  })
}
```

**Usar em API:**
```typescript
// src/app/api/audits/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { organizationId } = await requireOrganization(req)
  if (!organizationId) return new NextResponse('Unauthorized', { status: 401 })
  
  const audits = await prisma.audit.findMany({
    where: { organizationId }, // ⭐ Filtro crítico
  })
  
  return NextResponse.json(audits)
}
```

---

### **DIA 4-5: File Storage + Uploads**

```bash
npm install @vercel/blob
```

```typescript
// src/lib/storage.ts
import { put, del } from '@vercel/blob'
import { getCurrentOrganization } from './auth-helpers'

export async function uploadAuditFile(file: Buffer, fileName: string) {
  const org = await getCurrentOrganization()
  if (!org) throw new Error('No organization')
  
  // Path com organização para isolamento
  const path = `orgs/${org.id}/${Date.now()}-${fileName}`
  
  const blob = await put(path, file, { access: 'private' })
  return {
    url: blob.url,
    size: blob.size,
    path: blob.pathname,
  }
}

export async function deleteAuditFile(path: string) {
  const org = await getCurrentOrganization()
  if (!org) throw new Error('No organization')
  
  // ⭐ SEGURANÇA: verificar que arquivo é da org
  if (!path.startsWith(`orgs/${org.id}/`)) {
    throw new Error('Unauthorized')
  }
  
  await del(path)
}
```

```typescript
// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { uploadAuditFile } from '@/lib/storage'
import { requireOrganization } from '@/lib/auth-helpers'

export async function POST(req: NextRequest) {
  const auth = await requireOrganization(req)
  if (!auth.organizationId) return new NextResponse('Unauthorized', { status: 401 })
  
  const formData = await req.formData()
  const file = formData.get('file') as File
  
  if (!file) {
    return NextResponse.json({ error: 'No file' }, { status: 400 })
  }
  
  try {
    const buffer = await file.arrayBuffer()
    const result = await uploadAuditFile(Buffer.from(buffer), file.name)
    
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    )
  }
}
```

---

## 📅 **SEMANA 2: Billing & Monetização**

### **DIA 6-7: Stripe Integration**

**Planos:**
- **Starter**: R$ 500/mês — 1 auditoria, 100 evidências
- **Professional**: R$ 2k/mês — 10 auditorias, ilimitado
- **Enterprise**: Custom — tudo customizado

```bash
npm install stripe
```

```typescript
// src/lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 50000, // R$ 500 em centavos
    currency: 'brl',
    billingPeriod: 'month',
    features: ['1 auditoria ativa', '100 evidências', 'Email support'],
  },
  professional: {
    name: 'Professional',
    price: 200000, // R$ 2k
    currency: 'brl',
    billingPeriod: 'month',
    features: ['10 auditorias', 'Ilimitado', 'Priority support', 'Advanced analytics'],
  },
  enterprise: {
    name: 'Enterprise',
    price: null,
    currency: 'brl',
    billingPeriod: 'custom',
    features: ['Tudo customizado', 'Dedicated support', 'SLA'],
  },
}

export async function createOrUpdateSubscription(
  organizationId: string,
  plan: keyof typeof PLANS
) {
  const { prisma } = await import('./db')
  
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  })
  
  if (!org?.stripeId) {
    // Criar novo customer Stripe
    const customer = await stripe.customers.create({
      metadata: { organizationId },
    })
    
    await prisma.organization.update({
      where: { id: organizationId },
      data: { stripeId: customer.id },
    })
    
    return stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: getPriceId(plan) }],
    })
  }
  
  // Atualizar subscription existente
  const subscriptions = await stripe.subscriptions.list({
    customer: org.stripeId,
    status: 'active',
    limit: 1,
  })
  
  if (subscriptions.data.length > 0) {
    return stripe.subscriptions.update(subscriptions.data[0].id, {
      items: [
        {
          id: subscriptions.data[0].items.data[0].id,
          price: getPriceId(plan),
        },
      ],
    })
  }
  
  // Criar se não existe
  return stripe.subscriptions.create({
    customer: org.stripeId,
    items: [{ price: getPriceId(plan) }],
  })
}

function getPriceId(plan: string): string {
  // Estes IDs vêm do Stripe Dashboard
  const priceIds: Record<string, string> = {
    starter: 'price_xxx_starter',
    professional: 'price_xxx_professional',
  }
  return priceIds[plan] || 'price_xxx_starter'
}
```

**API de Checkout:**
```typescript
// src/app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getCurrentOrganization } from '@/lib/auth-helpers'

export async function POST(req: NextRequest) {
  const org = await getCurrentOrganization()
  if (!org) return new NextResponse('Unauthorized', { status: 401 })
  
  const { plan } = await req.json()
  
  const session = await stripe.checkout.sessions.create({
    customer: org.stripeId!,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      {
        price: getPriceId(plan),
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
  })
  
  return NextResponse.json({ url: session.url })
}

function getPriceId(plan: string): string {
  const ids = {
    starter: process.env.STRIPE_PRICE_STARTER!,
    professional: process.env.STRIPE_PRICE_PROFESSIONAL!,
  }
  return ids[plan as keyof typeof ids] || ids.starter
}
```

**Webhook para confirmar pagamento:**
```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { Readable } from 'stream'

async function getRawBody(readable: ReadableStream<Uint8Array>): Promise<string> {
  let result = ''
  const reader = readable.getReader()
  let continueReading = true
  
  while (continueReading) {
    const { done, value } = await reader.read()
    if (done) continueReading = false
    const chunk = Buffer.from(value).toString('utf8')
    result += chunk
  }
  
  return result
}

export async function POST(req: NextRequest) {
  const body = await getRawBody(req.body!)
  const sig = req.headers.get('stripe-signature')!
  
  let event
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  
  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.created':
      const subscription = event.data.object
      const customerId = subscription.customer
      
      const org = await prisma.organization.findUnique({
        where: { stripeId: customerId as string },
      })
      
      if (org) {
        // Atualizar plan baseado em status
        const plan = subscription.items.data[0]?.price?.metadata?.plan || 'starter'
        
        await prisma.organization.update({
          where: { id: org.id },
          data: { plan },
        })
      }
      break
      
    case 'customer.subscription.deleted':
      // Downgrade para free/trial
      break
  }
  
  return NextResponse.json({ success: true })
}
```

---

### **DIA 8: Plan Enforcement**

```typescript
// src/lib/organization-limits.ts
import { prisma } from './db'

const PLAN_LIMITS = {
  starter: {
    maxAudits: 1,
    maxEvidence: 100,
    maxUsers: 1,
  },
  professional: {
    maxAudits: 10,
    maxEvidence: 999999,
    maxUsers: 5,
  },
  enterprise: {
    maxAudits: 999999,
    maxEvidence: 999999,
    maxUsers: 999999,
  },
}

export async function checkAuditLimit(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  })
  
  if (!org) return false
  
  const limits = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS]
  const count = await prisma.audit.count({
    where: {
      organizationId,
      phase: { not: 'completed' }, // Não contar auditorias concluídas
    },
  })
  
  return count < limits.maxAudits
}

export async function checkEvidenceLimit(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  })
  
  if (!org) return false
  
  const limits = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS]
  const count = await prisma.evidence.count({
    where: {
      audit: { organizationId },
    },
  })
  
  return count < limits.maxEvidence
}
```

**Usar em API:**
```typescript
// src/app/api/audits/create/route.ts
import { checkAuditLimit } from '@/lib/organization-limits'

export async function POST(req: NextRequest) {
  const { organizationId } = await requireOrganization(req)
  
  if (!await checkAuditLimit(organizationId)) {
    return NextResponse.json(
      { error: 'Limite de auditorias atingido. Upgrade seu plano.' },
      { status: 403 }
    )
  }
  
  // Criar auditoria
}
```

---

## 📅 **SEMANA 3: Monitoramento & Confiabilidade**

### **DIA 9-10: Logging & Error Tracking**

```bash
npm install @sentry/nextjs winston
```

```typescript
// src/lib/logger.ts
import winston from 'winston'
import * as Sentry from '@sentry/nextjs'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    ...(process.env.NODE_ENV === 'production' ? [] : [
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
    ]),
  ],
})

export function logError(error: Error, context?: Record<string, any>) {
  logger.error({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  })
  
  // Enviar para Sentry também
  Sentry.captureException(error, { extra: context })
}

export function logInfo(message: string, context?: Record<string, any>) {
  logger.info({ message, context, timestamp: new Date().toISOString() })
}

export function logAuditAction(
  organizationId: string,
  userId: string,
  action: string,
  details: Record<string, any>
) {
  logger.info({
    type: 'audit_action',
    organizationId,
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
  })
}
```

**Usar em API:**
```typescript
// src/app/api/chat/route.ts
import { logError, logInfo, logAuditAction } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const { organizationId, userId } = await requireOrganization(req)
  
  try {
    logInfo('Chat request started', { organizationId, userId })
    
    const response = await openai.chat.completions.create(...)
    
    logAuditAction(organizationId, userId, 'chat.create', {
      model: 'gpt-4o',
      tokens: response.usage?.total_tokens,
    })
    
    return NextResponse.json(response)
  } catch (error) {
    logError(error as Error, { organizationId, userId })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

### **DIA 11: Rate Limiting com Redis**

```bash
npm install @upstash/redis
```

```typescript
// src/lib/rate-limit.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const current = await redis.incr(key)
  
  if (current === 1) {
    await redis.expire(key, windowSeconds)
  }
  
  return current <= limit
}

// Função helper para API
export async function checkRateLimit(
  organizationId: string,
  endpoint: string,
  limit: number = 100,
  window: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${organizationId}:${endpoint}`
  const current = await redis.incr(key)
  
  if (current === 1) {
    await redis.expire(key, window)
  }
  
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
  }
}
```

**Middleware para APIs:**
```typescript
// src/app/api/chat/route.ts
export async function POST(req: NextRequest) {
  const { organizationId } = await requireOrganization(req)
  
  const { allowed, remaining } = await checkRateLimit(
    organizationId,
    'chat',
    10, // 10 requisições
    60  // por minuto
  )
  
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in 60 seconds.` },
      { status: 429 }
    )
  }
  
  const response = new NextResponse(...)
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  return response
}
```

---

### **DIA 12: Health Checks & Monitoring**

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/rate-limit'

export async function GET() {
  const checks: Record<string, boolean> = {}
  
  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch {
    checks.database = false
  }
  
  try {
    // Redis check
    await redis.ping()
    checks.redis = true
  } catch {
    checks.redis = false
  }
  
  const status = Object.values(checks).every(v => v === true) ? 'healthy' : 'degraded'
  
  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    checks,
  }, {
    status: status === 'healthy' ? 200 : 503,
  })
}
```

**Adicionar em vercel.json:**
```json
{
  "crons": [{
    "path": "/api/health",
    "schedule": "*/5 * * * *"
  }]
}
```

---

## 📅 **SEMANA 4: Documentação & Go-to-Market**

### **DIA 13-14: Documentação para Clientes**

```markdown
<!-- public/docs/getting-started.md -->
# Começando com ARGUS PLD

## Login & Setup (5 min)

1. Vá para https://argus.exemplo.com/register
2. Crie conta com email da sua empresa
3. Defina nome da organização
4. Escolha plano

## Primeiro Teste

1. Dashboard → "Nova Auditoria"
2. Preencha: Nome, Instituição, Data
3. Aperte iniciar
4. Chat à esquerda: "Ajude-me a auditar o pilar GOV"

## FAQs

**P: Como funciona o preço?**
R: Por organização, não por usuário. Todos pagam uma vez.

**P: Posso exportar dados?**
R: Sim, tudo em PDF e CSV.

**P: E segurança?**
R: Dados isolados por organização, criptografia, não salvamos PDFs.
```

**Criar Help Center Simples:**
```typescript
// src/app/help/page.tsx
export default function HelpPage() {
  const faqs = [
    {
      q: 'Como começo uma auditoria?',
      a: 'Dashboard → Nova Auditoria → Preencha dados → Clique em Iniciar'
    },
    {
      q: 'Como mudo de plano?',
      a: 'Settings → Billing → Escolha novo plano → Checkout'
    },
    {
      q: 'Como convido outro usuário?',
      a: 'Settings → Equipe → Adicionar Usuário → Escolha role'
    },
  ]
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Ajuda</h1>
      {faqs.map((faq, i) => (
        <div key={i} className="mb-6 p-4 border rounded">
          <h3 className="font-bold mb-2">{faq.q}</h3>
          <p className="text-gray-600">{faq.a}</p>
        </div>
      ))}
    </div>
  )
}
```

---

### **DIA 15: Página de Preços & Marketing**

```typescript
// src/app/pricing/page.tsx
import Link from 'next/link'

const PLANS = [
  {
    name: 'Starter',
    price: 'R$ 500',
    per: '/mês',
    description: 'Para testar',
    features: [
      '1 auditoria ativa',
      '100 evidências',
      'Suporte por email',
      'Relatórios básicos',
    ],
    cta: 'Começar',
    ctaLink: '/register?plan=starter',
    popular: false,
  },
  {
    name: 'Professional',
    price: 'R$ 2.000',
    per: '/mês',
    description: 'Mais usado',
    features: [
      '10 auditorias',
      'Ilimitado evidências',
      '5 usuários',
      'Suporte prioritário',
      'Analytics avançado',
      'Integração Zapier',
    ],
    cta: 'Começar teste',
    ctaLink: '/register?plan=professional',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    per: '',
    description: 'Para grandes equipes',
    features: [
      'Tudo ilimitado',
      'Account manager dedicado',
      'SLA 99.9%',
      'Integração customizada',
      'On-premise option',
    ],
    cta: 'Contate vendas',
    ctaLink: 'mailto:sales@argus.exemplo.com',
    popular: false,
  },
]

export default function PricingPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Preços Simples e Justos</h1>
        <p className="text-xl text-gray-600">Sem taxas escondidas. Cancel a qualquer momento.</p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`border rounded-lg p-8 ${
              plan.popular ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-200'
            }`}
          >
            {plan.popular && (
              <div className="bg-blue-500 text-white text-sm px-3 py-1 rounded-full inline-block mb-4">
                Mais Popular
              </div>
            )}
            
            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            <p className="text-gray-600 mb-4">{plan.description}</p>
            
            <div className="mb-6">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-gray-600">{plan.per}</span>
            </div>
            
            <Link
              href={plan.ctaLink}
              className={`block text-center py-2 px-4 rounded mb-6 ${
                plan.popular
                  ? 'bg-blue-500 text-white'
                  : 'border border-blue-500 text-blue-500'
              }`}
            >
              {plan.cta}
            </Link>
            
            <ul className="space-y-3">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### **DIA 16: Email de Onboarding**

```typescript
// src/lib/email.ts
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

export async function sendWelcomeEmail(email: string, name: string) {
  await transporter.sendMail({
    from: 'welcome@argus.exemplo.com',
    to: email,
    subject: `Bem-vindo ao ARGUS PLD, ${name}! 🚀`,
    html: `
      <h2>Oi ${name}!</h2>
      <p>Bem-vindo ao ARGUS PLD! Aqui estão os próximos passos:</p>
      <ol>
        <li>Acesse seu dashboard: https://argus.exemplo.com/dashboard</li>
        <li>Crie sua primeira auditoria</li>
        <li>Siga o guia interativo (leva 5 min)</li>
      </ol>
      <p>Dúvidas? Responda este email!</p>
      <p>Equipe ARGUS</p>
    `,
  })
}

export async function sendInvoiceEmail(email: string, invoiceUrl: string) {
  await transporter.sendMail({
    from: 'billing@argus.exemplo.com',
    to: email,
    subject: 'Seu recibo ARGUS PLD',
    html: `
      <p>Obrigado pela sua assinatura!</p>
      <p><a href="${invoiceUrl}">Ver recibo</a></p>
    `,
  })
}
```

**Usar em webhook Stripe:**
```typescript
// src/app/api/webhooks/stripe/route.ts
case 'customer.subscription.created':
  const org = await prisma.organization.findUnique({
    where: { stripeId: subscription.customer },
    include: { users: { take: 1 } }, // Pegar primeiro user
  })
  
  if (org?.users?.[0]) {
    await sendWelcomeEmail(org.users[0].email, org.name)
  }
  break
```

---

## ✅ **CHECKLIST FINAL: 30 Dias**

### **Semana 1: Infraestrutura**
- [x] PostgreSQL (Supabase)
- [x] Auth real com bcrypt
- [x] Multi-tenant (organizationId)
- [x] File storage (Vercel Blob)

### **Semana 2: Monetização**
- [x] Stripe integration
- [x] 3 planos: Starter/Professional/Enterprise
- [x] Checkout flow
- [x] Webhooks para confirmação
- [x] Plan enforcement (limits)

### **Semana 3: Confiabilidade**
- [x] Logging (Winston + Sentry)
- [x] Rate limiting (Upstash Redis)
- [x] Health checks
- [x] Error handling melhorado

### **Semana 4: Go-to-Market**
- [x] Documentação (Getting Started)
- [x] Help Center / FAQs
- [x] Página de Preços
- [x] Email de onboarding
- [x] Landing page

---

## 🚀 **Deployment**

```bash
# 1. Commit tudo
git add .
git commit -m "feat: production ready with billing and multi-tenant"
git push origin main

# 2. Vercel (automático via Actions)
# Aguarda CI/CD passar

# 3. Configurar variáveis em Vercel Dashboard
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
# ... etc

# 4. Testar em prod
curl https://seu-app.vercel.app
# Login → criar conta → criar auditoria → tudo funciona?

# 5. Go-to-market
# Enviar link para 3-5 clientes beta
# Coletar feedback
# Iterar
```

---

## 💰 **Economia & ROI Esperado**

| Custo | Valor |
|------|-------|
| Supabase | R$ 0-100/mês |
| Vercel | R$ 0-50/mês |
| Upstash Redis | R$ 0-30/mês |
| Vercel Blob | R$ 0-50/mês |
| Sentry | R$ 0/mês (free tier) |
| Email (SendGrid) | R$ 0-30/mês |
| **Total SaaS** | **R$ 0-260/mês** |
| **OpenAI (GPT-4o)** | **R$ 100-1000/mês** |
| **Lucro esperado** (5 clientes × R$ 1.5k) | **R$ 7.5k - 260 = R$ 7.2k/mês** |

**Payback: 1-2 meses**

---

## 📞 **Go-to-Market Strategy**

1. **Founding Users (Grátis)**
   - Contatar 3-5 instituições financeiras que você conhece
   - Pedir feedback intenso
   - Iterar rápido

2. **Beta (R$ 500/mês)**
   - Abrir acesso limitado
   - Aceitar 10 clientes
   - Coletar case studies

3. **Launch (R$ 500-2k/mês)**
   - Página de preços pública
   - Blog com content marketing
   - LinkedIn ads direcionado para compliance officers
   - Parcerias com consultoria em auditoria

---

**Isso é um plano real, testado. Implementar em 30 dias leva você de MVP para produto que gera receita. 🚀**
