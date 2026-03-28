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
}

export default function VideoPlayerWithVote({
  videoId,
  videoUrl,
  posterUrl,
  currentVote,
  isLoggedIn,
  canVote,
}: VideoPlayerWithVoteProps) {
  const [showVote, setShowVote] = useState(!!currentVote)

  return (
    <div className="space-y-4">
      <VideoPlayer
        src={videoUrl}
        poster={posterUrl}
        onEnded={() => {
          if (canVote) setShowVote(true)
        }}
      />

      {canVote && showVote && (
        <div className="border border-white/10 bg-white/2 p-6">
          <ViewerVotePanel
            videoId={videoId}
            currentVote={currentVote}
            isLoggedIn={isLoggedIn}
          />
        </div>
      )}

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
