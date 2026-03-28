'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterForm() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('ユーザーIDは3〜20文字の英数字・アンダースコアのみ使用できます')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で設定してください')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName || username,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        setError('このメールアドレスはすでに登録されています')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">✉️</div>
        <h2 className="font-bebas text-2xl text-arena-gold">確認メールを送信しました</h2>
        <p className="text-gray-400 text-sm">
          {email} に確認メールを送信しました。<br />
          メール内のリンクをクリックして登録を完了してください。
        </p>
        <Link
          href="/auth/login"
          className="inline-block mt-4 text-sm text-gray-500 hover:text-arena-gold transition-colors"
        >
          ログインページへ
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="border border-red-500 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="username" className="block text-xs text-gray-400 uppercase tracking-widest">
          ユーザーID <span className="text-red-400">*</span>
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-600 focus:border-arena-gold focus:outline-none transition-colors"
          placeholder="fighter_name"
        />
        <p className="text-xs text-gray-600">3〜20文字、英数字・アンダースコアのみ</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="displayName" className="block text-xs text-gray-400 uppercase tracking-widest">
          表示名
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-600 focus:border-arena-gold focus:outline-none transition-colors"
          placeholder="ARENA FIGHTER"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="block text-xs text-gray-400 uppercase tracking-widest">
          メールアドレス <span className="text-red-400">*</span>
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
          パスワード <span className="text-red-400">*</span>
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-600 focus:border-arena-gold focus:outline-none transition-colors"
          placeholder="••••••••（8文字以上）"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-arena-gold text-black font-bold py-3 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-widest"
      >
        {loading ? '登録中...' : '闘技場に登録する'}
      </button>

      <p className="text-center text-sm text-gray-500">
        すでにアカウントをお持ちの方は{' '}
        <Link href="/auth/login" className="text-arena-gold hover:underline">
          ログイン
        </Link>
      </p>
    </form>
  )
}
