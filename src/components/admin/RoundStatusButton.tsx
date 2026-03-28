'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type RoundStatus = 'open' | 'reviewing' | 'published'

interface RoundStatusButtonProps {
  roundId: string
  currentStatus: RoundStatus
}

const NEXT_STATUS: Record<RoundStatus, { next: RoundStatus; label: string; description: string; color: string } | null> = {
  open:      { next: 'reviewing', label: '審査期間へ移行',   description: '投稿を締め切り、匿名審査期間に入ります。作者情報が非表示になります。', color: 'border-yellow-500 text-yellow-400 hover:bg-yellow-500/10' },
  reviewing: { next: 'published', label: '結果を発表する',   description: 'スコアを集計し、ランキングと作者情報を公開します。この操作は取り消せません。', color: 'border-arena-gold text-arena-gold hover:bg-arena-gold/10' },
  published: null,
}

const STATUS_BADGE: Record<RoundStatus, string> = {
  open:      'text-green-400 border-green-400/30 bg-green-400/5',
  reviewing: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
  published: 'text-gray-400 border-gray-400/30 bg-gray-400/5',
}

const STATUS_LABEL: Record<RoundStatus, string> = {
  open: '投稿受付中',
  reviewing: '匿名審査中',
  published: '結果発表済',
}

export default function RoundStatusButton({ roundId, currentStatus }: RoundStatusButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const transition = NEXT_STATUS[currentStatus]

  async function handleTransition() {
    if (!transition) return
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/admin/rounds/${roundId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: transition.next }),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error ?? '更新に失敗しました')
      setLoading(false)
      setShowConfirm(false)
      return
    }

    setShowConfirm(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <span className={`inline-block text-xs border px-3 py-1 ${STATUS_BADGE[currentStatus]}`}>
        {STATUS_LABEL[currentStatus]}
      </span>

      {transition && !showConfirm && (
        <div>
          <button
            onClick={() => setShowConfirm(true)}
            className={`block text-xs border px-4 py-2 transition-colors ${transition.color}`}
          >
            {transition.label} →
          </button>
        </div>
      )}

      {transition && showConfirm && (
        <div className="border border-white/10 bg-white/3 p-4 space-y-3 max-w-sm">
          <p className="text-sm text-white font-medium">{transition.label}</p>
          <p className="text-xs text-gray-400">{transition.description}</p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleTransition}
              disabled={loading}
              className="px-4 py-1.5 bg-arena-gold text-black text-xs font-bold disabled:opacity-50 hover:bg-yellow-400 transition-colors"
            >
              {loading ? '処理中...' : '実行する'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={loading}
              className="px-4 py-1.5 border border-white/20 text-gray-400 text-xs hover:border-white/40 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {currentStatus === 'published' && (
        <span className="text-xs text-gray-600">完了</span>
      )}
    </div>
  )
}
