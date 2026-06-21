import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export type Role = 'ADMIN' | 'SENIOR_AUDITOR' | 'AUDITOR' | 'REVIEWER' | 'READONLY'

interface DemoUser {
  id: string
  name: string
  email: string
  password: string
  role: Role
}

const demoUsers: DemoUser[] = [
  {
    id: '1',
    name: 'Admin ARGUS',
    email: 'admin@argus.com',
    password: 'admin123',
    role: 'ADMIN',
  },
  {
    id: '2',
    name: 'Auditor Sênior',
    email: 'auditor@argus.com',
    password: 'auditor123',
    role: 'SENIOR_AUDITOR',
  },
  {
    id: '3',
    name: 'Revisor',
    email: 'reviewer@argus.com',
    password: 'reviewer123',
    role: 'REVIEWER',
  },
]

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = demoUsers.find(
          (u) => u.email === credentials.email && u.password === credentials.password
        )

        if (!user) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role: Role }).role
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: Role }).role = token.role as Role
        (session.user as { id?: string }).id = token.userId as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
