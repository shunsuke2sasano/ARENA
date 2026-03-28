'use client'

import { useEffect, useRef } from 'react'

interface StreamPlayerProps {
  videoId: string
  onEnded?: () => void
  autoplay?: boolean
}

export default function StreamPlayer({ videoId, onEnded, autoplay = false }: StreamPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!onEnded) return

    // Cloudflare Stream Player APIでiframe通信
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://iframe.videodelivery.net') return
      const data = event.data
      if (typeof data === 'object' && data?.type === 'ended') {
        onEnded()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onEnded])

  const src = `https://iframe.videodelivery.net/${videoId}?${new URLSearchParams({
    autoplay: autoplay ? 'true' : 'false',
    muted: autoplay ? 'true' : 'false',
    preload: 'auto',
    letterboxColor: '09080c',
  })}`

  return (
    <div className="relative w-full aspect-video bg-black">
      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="ARENA Video Player"
      />
    </div>
  )
}
