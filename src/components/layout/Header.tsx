'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface HeaderProps {
  user: User | null
  isAdmin?: boolean
}

export default function Header({ user, isAdmin }: HeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="border-b border-white/10 bg-arena-black/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bebas text-2xl text-arena-gold tracking-widest hover:text-yellow-400 transition-colors">
          ARENA
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/rounds" className="text-gray-400 hover:text-white transition-colors uppercase tracking-wide text-xs">
            ラウンド
          </Link>
          <Link href="/ranking" className="text-gray-400 hover:text-white transition-colors uppercase tracking-wide text-xs">
            ランキング
          </Link>

          {user ? (
            <>
              <Link href="/submit" className="text-gray-400 hover:text-white transition-colors uppercase tracking-wide text-xs">
                投稿
              </Link>
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors uppercase tracking-wide text-xs">
                ダッシュボード
              </Link>
              {isAdmin && (
                <Link href="/admin" className="text-arena-gold/60 hover:text-arena-gold transition-colors uppercase tracking-wide text-xs">
                  管理
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-wide"
              >
                退場
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="px-4 py-1.5 border border-arena-gold text-arena-gold text-xs uppercase tracking-widest hover:bg-arena-gold hover:text-black transition-colors"
            >
              入場
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
