'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type VoteType = 'good' | 'touched' | 'shook'

const VOTES: { type: VoteType; label: string; emoji: string; point: string; desc: string }[] = [
  { type: 'good',    label: '良かった', emoji: '👍', point: '1点', desc: '良い作品だった' },
  { type: 'touched', label: '刺さった', emoji: '🎯', point: '2点', desc: '心に響いた' },
  { type: 'shook',   label: '震えた',   emoji: '⚡', point: '3点', desc: '圧倒された' },
]

interface ViewerVotePanelProps {
  videoId: string
  currentVote: VoteType | null
  isLoggedIn: boolean
}

export default function ViewerVotePanel({ videoId, currentVote: initialVote, isLoggedIn }: ViewerVotePanelProps) {
  const [currentVote, setCurrentVote] = useState<VoteType | null>(initialVote)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVote(voteType: VoteType) {
    if (!isLoggedIn) {
      window.location.href = `/auth/login?redirectTo=${window.location.pathname}`
      return
    }

    if (loading) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { error: err } = await supabase
      .from('viewer_votes')
      .upsert(
        { video_id: videoId, voter_id: user.id, vote_type: voteType },
        { onConflict: 'video_id,voter_id' }
      )

    if (err) {
      setError('投票に失敗しました')
    } else {
      setCurrentVote(voteType)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 uppercase tracking-widest">あなたの評価</p>
      <div className="grid grid-cols-3 gap-2">
        {VOTES.map((v) => (
          <button
            key={v.type}
            onClick={() => handleVote(v.type)}
            disabled={loading}
            className={`flex flex-col items-center gap-1 p-3 border transition-all ${
              currentVote === v.type
                ? 'border-arena-gold bg-arena-gold/10 text-white'
                : 'border-white/10 text-gray-500 hover:border-white/25 hover:text-white'
            } disabled:opacity-50`}
          >
            <span className="text-2xl">{v.emoji}</span>
            <span className="text-xs font-medium">{v.label}</span>
            <span className="text-[10px] text-gray-600">{v.point}</span>
          </button>
        ))}
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {!isLoggedIn && (
        <p className="text-xs text-gray-600 text-center">
          投票するには
          <a href="/auth/login" className="text-arena-gold hover:underline mx-1">ログイン</a>
          が必要です
        </p>
      )}
      <p className="text-xs text-gray-700 text-center">1アカウント1票（押し直し可）</p>
    </div>
  )
}
