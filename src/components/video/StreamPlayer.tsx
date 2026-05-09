'use client'

import { useRef, useState, useEffect } from 'react'

interface VideoPlayerProps {
  src: string
  poster?: string
  onEnded?: () => void
}

export default function VideoPlayer({ src, poster, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onEndedRef = useRef(onEnded)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => { onEndedRef.current = onEnded })

  // native listener + timeupdate fallback: src が変わるたびにリセット
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let fired = false

    const fireOnce = () => {
      if (!fired) { fired = true; onEndedRef.current?.() }
    }

    const handleTimeUpdate = () => {
      if (video.duration > 0 && video.currentTime / video.duration >= 0.98) {
        fireOnce()
      }
    }

    video.addEventListener('ended', fireOnce)
    video.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      video.removeEventListener('ended', fireOnce)
      video.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [src])

  return (
    <div className="relative w-full aspect-video bg-black">
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-arena-gold/30 border-t-arena-gold rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500 text-sm">動画を読み込めませんでした</p>
        </div>
      )}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        onLoadedData={() => setIsLoading(false)}
        onError={() => { setIsLoading(false); setError(true) }}
        className={`w-full h-full object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  )
}
