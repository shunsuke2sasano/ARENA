'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type VoteType = 'good' | 'touched' | 'shook'

interface Vote {
  type: VoteType
  label: string
  point: number
  /** 視覚的な重みを表すバーの高さ比率 (1–3) */
  weight: number
  desc: string
  color: string
  activeColor: string
  activeBg: string
  activeBorder: string
}

const VOTES: Vote[] = [
  {
    type: 'good',
    label: '良かった',
    point: 1,
    weight: 1,
    desc: '見て良かった',
    color: 'text-gray-400',
    activeColor: 'text-white',
    activeBg: 'bg-gray-600/20',
    activeBorder: 'border-gray-400',
  },
  {
    type: 'touched',
    label: '刺さった',
    point: 2,
    weight: 2,
    desc: '心に響いた',
    color: 'text-gray-400',
    activeColor: 'text-white',
    activeBg: 'bg-arena-orange/15',
    activeBorder: 'border-arena-orange',
  },
  {
    type: 'shook',
    label: '震えた',
    point: 3,
    weight: 3,
    desc: '圧倒された',
    color: 'text-gray-400',
    activeColor: 'text-white',
    activeBg: 'bg-arena-gold/15',
    activeBorder: 'border-arena-gold',
  },
]

const POINT_LABEL: Record<VoteType, string> = {
  good: '1点',
  touched: '2点',
  shook: '3点',
}

interface ViewerVotePanelProps {
  videoId: string
  currentVote: VoteType | null
  isLoggedIn: boolean
  /** 結果発表前でも合計票数だけ見せる（open/reviewing期間） */
  totalVotes: number
  votesGood: number
  votesTouched: number
  votesShook: number
  /** 結果発表済みかどうか（棒グラフ内訳を見せるか） */
  isPublished: boolean
}

export default function ViewerVotePanel({
  videoId,
  currentVote: initialVote,
  isLoggedIn,
  totalVotes: initialTotal,
  votesGood: initialGood,
  votesTouched: initialTouched,
  votesShook: initialShook,
  isPublished,
}: ViewerVotePanelProps) {
  const [currentVote, setCurrentVote] = useState<VoteType | null>(initialVote)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<VoteType | null>(initialVote)

  // リアルタイム票数
  const [total, setTotal] = useState(initialTotal)
  const [good, setGood] = useState(initialGood)
  const [touched, setTouched] = useState(initialTouched)
  const [shook, setShook] = useState(initialShook)
  const countRef = useRef<HTMLSpanElement>(null)

  // Supabase Realtime で votes テーブルを購読
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`video-votes-${videoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'videos', filter: `id=eq.${videoId}` },
        (payload) => {
          const row = payload.new as {
            total_votes: number
            votes_good: number
            votes_touched: number
            votes_shook: number
          }
          setTotal(row.total_votes)
          setGood(row.votes_good)
          setTouched(row.votes_touched)
          setShook(row.votes_shook)

          // カウントポップアニメーション
          if (countRef.current) {
            countRef.current.classList.remove('count-pop')
            void countRef.current.offsetWidth // reflow
            countRef.current.classList.add('count-pop')
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [videoId])

  async function handleVote(voteType: VoteType) {
    if (!isLoggedIn) {
      window.location.href = `/auth/login?redirectTo=${encodeURIComponent(window.location.pathname)}`
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
      setError('投票に失敗しました。もう一度お試しください。')
    } else {
      setCurrentVote(voteType)
      setConfirmed(voteType)
      // 確定フラッシュは短時間で消す
      setTimeout(() => setConfirmed(null), 600)
    }
    setLoading(false)
  }

  const maxVotes = Math.max(good, touched, shook, 1)

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 uppercase tracking-widest">視聴者評価</p>
        <div className="flex items-center gap-2">
          <span ref={countRef} className="font-bebas text-lg text-white leading-none">
            {total}
          </span>
          <span className="text-xs text-gray-600">票</span>
        </div>
      </div>

      {/* 投票ボタン */}
      <div className="grid grid-cols-3 gap-2">
        {VOTES.map((v) => {
          const isSelected = currentVote === v.type
          const isFlashing = confirmed === v.type
          return (
            <button
              key={v.type}
              onClick={() => handleVote(v.type)}
              disabled={loading}
              className={[
                'relative flex flex-col items-center justify-between pt-4 pb-3 px-2 border-2 transition-all duration-200 select-none',
                'disabled:cursor-not-allowed disabled:opacity-60',
                isSelected
                  ? `${v.activeBorder} ${v.activeBg} ${v.activeColor}`
                  : `border-white/10 ${v.color} hover:border-white/25 hover:text-gray-200`,
                isFlashing ? 'vote-confirmed' : '',
              ].join(' ')}
            >
              {/* 得点バー（視覚的重み） */}
              <div className="w-full flex justify-center items-end gap-px mb-3" style={{ height: 24 }}>
                {Array.from({ length: v.weight }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 rounded-sm transition-colors ${
                      isSelected ? 'bg-current opacity-80' : 'bg-white/15'
                    }`}
                    style={{ height: `${8 + i * 8}px` }}
                  />
                ))}
              </div>

              {/* ラベル */}
              <span className="font-bebas text-xl tracking-wide leading-none">{v.label}</span>

              {/* 点数 */}
              <span className={`text-[10px] mt-1 tracking-widest uppercase ${isSelected ? 'opacity-80' : 'opacity-40'}`}>
                {POINT_LABEL[v.type]}
              </span>

              {/* 選択済みチェック */}
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 text-[10px] font-bold opacity-70">✓</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 結果発表後: 棒グラフ内訳 */}
      {isPublished && total > 0 && (
        <div className="space-y-2 pt-1">
          {[
            { key: 'shook' as VoteType,   label: '震えた',   value: shook,   color: 'bg-arena-gold' },
            { key: 'touched' as VoteType, label: '刺さった', value: touched, color: 'bg-arena-orange' },
            { key: 'good' as VoteType,    label: '良かった', value: good,    color: 'bg-gray-500' },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-14 text-right shrink-0">{item.label}</span>
              <div className="flex-1 bg-white/5 h-1.5">
                <div
                  className={`h-1.5 ${item.color} transition-all duration-500`}
                  style={{ width: `${Math.round((item.value / maxVotes) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 w-6 text-right shrink-0">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* 押し直し案内 */}
      {currentVote && (
        <p className="text-[11px] text-gray-700 text-center">
          別のボタンを押すと変更できます
        </p>
      )}

      {/* 未ログイン案内 */}
      {!isLoggedIn && (
        <p className="text-xs text-gray-600 text-center">
          <a
            href={`/auth/login?redirectTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
            className="text-arena-gold hover:underline"
          >
            ログイン
          </a>
          {' '}して投票する
        </p>
      )}

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  )
}
