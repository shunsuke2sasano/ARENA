'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'メールアドレスまたはパスワードが正しくありません'
        : error.message
      )
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="border border-red-500 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="email" className="block text-xs text-gray-400 uppercase tracking-widest">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-600 focus:border-arena-gold focus:outline-none transition-colors"
          placeholder="arena@example.com"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-xs text-gray-400 uppercase tracking-widest">
          パスワード
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-600 focus:border-arena-gold focus:outline-none transition-colors"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-arena-gold text-black font-bold py-3 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-widest"
      >
        {loading ? '入場中...' : '入場する'}
      </button>

      <p className="text-center text-sm text-gray-500">
        アカウントをお持ちでない方は{' '}
        <Link href="/auth/register" className="text-arena-gold hover:underline">
          新規登録
        </Link>
      </p>
    </form>
  )
}
