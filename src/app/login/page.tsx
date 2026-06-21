'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Shield, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { email: 'admin@argus.com', password: 'admin123', role: 'ADMIN' },
  { email: 'auditor@argus.com', password: 'auditor123', role: 'SENIOR_AUDITOR' },
  { email: 'reviewer@argus.com', password: 'reviewer123', role: 'REVIEWER' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Credenciais inválidas. Verifique email e senha.')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  function fillDemoAccount(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email)
    setPassword(account.password)
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--sf-0)' }}>
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'var(--sf-1)' }}
          >
            <Shield className="w-8 h-8" style={{ color: 'var(--ln-1)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
            ARGUS PLD
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Sistema Avançado de Auditoria PLD-FT
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-2xl p-8 shadow-xl border"
          style={{
            background: 'var(--sf-1)',
            borderColor: 'var(--sf-2)',
          }}
        >
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-heading)' }}>
            Entrar na plataforma
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm border outline-none transition-colors focus:ring-2"
                  style={{
                    background: 'var(--sf-0)',
                    borderColor: 'var(--sf-2)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Senha
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm border outline-none transition-colors focus:ring-2"
                  style={{
                    background: 'var(--sf-0)',
                    borderColor: 'var(--sf-2)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg text-sm"
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: 'var(--ln-1)' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Demo Accounts */}
        <div
          className="mt-6 rounded-2xl p-6 border"
          style={{
            background: 'var(--sf-1)',
            borderColor: 'var(--sf-2)',
          }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>
            Contas de demonstração
          </h3>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                onClick={() => fillDemoAccount(account)}
                className="w-full flex items-center justify-between p-2.5 rounded-lg text-left text-sm transition-colors hover:opacity-80"
                style={{ background: 'var(--sf-0)' }}
              >
                <div>
                  <span style={{ color: 'var(--text-primary)' }}>{account.email}</span>
                  <span className="mx-2" style={{ color: 'var(--text-secondary)' }}>/</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{account.password}</span>
                </div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{ background: 'var(--sf-2)', color: 'var(--text-secondary)' }}
                >
                  {account.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
