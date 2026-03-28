'use client'

import { useState } from 'react'
import VideoPlayer from './StreamPlayer'
import ViewerVotePanel from './ViewerVotePanel'

type VoteType = 'good' | 'touched' | 'shook'

interface VideoPlayerWithVoteProps {
  videoId: string
  videoUrl: string
  posterUrl?: string
  currentVote: VoteType | null
  isLoggedIn: boolean
  canVote: boolean
  isPublished: boolean
  totalVotes: number
  votesGood: number
  votesTouched: number
  votesShook: number
}

export default function VideoPlayerWithVote({
  videoId,
  videoUrl,
  posterUrl,
  currentVote,
  isLoggedIn,
  canVote,
  isPublished,
  totalVotes,
  votesGood,
  votesTouched,
  votesShook,
}: VideoPlayerWithVoteProps) {
  const [showVote, setShowVote] = useState(!!currentVote)

  return (
    <div className="space-y-0">
      <VideoPlayer
        src={videoUrl}
        poster={posterUrl}
        onEnded={() => {
          if (canVote) setShowVote(true)
        }}
      />

      {/* 投票パネル — 動画終了後にスライドアップ */}
      {canVote && showVote && (
        <div className="vote-panel-enter border border-t-0 border-white/10 bg-[#0d0c10] px-6 py-5">
          <ViewerVotePanel
            videoId={videoId}
            currentVote={currentVote}
            isLoggedIn={isLoggedIn}
            totalVotes={totalVotes}
            votesGood={votesGood}
            votesTouched={votesTouched}
            votesShook={votesShook}
            isPublished={isPublished}
          />
        </div>
      )}

      {/* 動画を最後まで見ていない場合の手動トリガー */}
      {canVote && !showVote && (
        <button
          onClick={() => setShowVote(true)}
          className="w-full text-xs text-gray-700 hover:text-gray-500 py-2.5 border-t border-white/5 uppercase tracking-widest transition-colors"
        >
          評価する ↓
        </button>
      )}
    </div>
  )
}
