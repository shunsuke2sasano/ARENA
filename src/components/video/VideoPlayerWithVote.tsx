'use client'

import { useState } from 'react'
import StreamPlayer from './StreamPlayer'
import ViewerVotePanel from './ViewerVotePanel'

type VoteType = 'good' | 'touched' | 'shook'

interface VideoPlayerWithVoteProps {
  videoId: string
  cloudflareVideoId: string
  currentVote: VoteType | null
  isLoggedIn: boolean
  canVote: boolean  // 審査中かpublishedのopen期間 (=審査中でもvote可)
}

export default function VideoPlayerWithVote({
  videoId,
  cloudflareVideoId,
  currentVote,
  isLoggedIn,
  canVote,
}: VideoPlayerWithVoteProps) {
  const [showVote, setShowVote] = useState(false)
  const [voted, setVoted] = useState(!!currentVote)

  return (
    <div className="space-y-4">
      <StreamPlayer
        videoId={cloudflareVideoId}
        onEnded={() => {
          if (canVote && !voted) setShowVote(true)
        }}
      />

      {/* 視聴後に投票パネルを表示 */}
      {canVote && (showVote || currentVote) && (
        <div className="border border-white/10 bg-white/2 p-6">
          <ViewerVotePanel
            videoId={videoId}
            currentVote={currentVote}
            isLoggedIn={isLoggedIn}
          />
        </div>
      )}

      {/* 投票を手動表示するボタン（まだ最後まで見ていない場合） */}
      {canVote && !showVote && !currentVote && (
        <button
          onClick={() => setShowVote(true)}
          className="w-full text-xs text-gray-600 hover:text-gray-400 py-2 uppercase tracking-widest"
        >
          評価する
        </button>
      )}
    </div>
  )
}
