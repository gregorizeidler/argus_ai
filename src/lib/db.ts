/**
 * Prisma database client singleton.
 *
 * The schema is defined in prisma/schema.prisma and generated to src/generated/prisma/.
 * To initialize the database:
 *   1. Set DATABASE_URL in .env (e.g. file:./prisma/dev.db)
 *   2. Run: npx prisma db push
 *   3. Run: npx prisma generate
 *
 * Until then, the app runs with localStorage via Zustand (the current behavior).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prismaInstance: any = null

export function getPrisma() {
  if (prismaInstance) return prismaInstance

  try {
    // Dynamic import to avoid build errors when DB is not yet initialized
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require('@/generated/prisma/client')
    prismaInstance = new PrismaClient()
    return prismaInstance
  } catch {
    console.warn('[DB] Prisma client not available — using localStorage fallback')
    return null
  }
}

export const prisma = getPrisma()
