'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Round {
  id: string
  title: string
  theme: string
  submission_end: string
}

interface VideoUploaderProps {
  rounds: Round[]
  userId: string
}

type UploadState = 'idle' | 'uploading' | 'saving' | 'done' | 'error'

// Canvas APIで動画のサムネイルを抽出する
async function extractThumbnail(file: File, timeSeconds = 2): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.src = url
    video.currentTime = timeSeconds
    video.muted = true

    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 640
        canvas.height = Math.round((640 / video.videoWidth) * video.videoHeight)
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url)
          resolve(blob)
        }, 'image/jpeg', 0.8)
      } catch {
        URL.revokeObjectURL(url)
        resolve(null)
      }
    }, { once: true })

    video.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }, { once: true })

    video.load()
  })
}

// 動画の尺をブラウザで取得する
function getVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.src = url
    video.preload = 'metadata'
    video.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url)
      resolve(isFinite(video.duration) ? Math.round(video.duration) : null)
    }, { once: true })
    video.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }, { once: true })
  })
}

export default function VideoUploader({ rounds, userId }: VideoUploaderProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedRoundId, setSelectedRoundId] = useState(rounds[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return

    if (!f.type.startsWith('video/')) {
      setError('動画ファイルを選択してください')
      return
    }
    if (f.size > 2 * 1024 * 1024 * 1024) {
      setError('ファイルサイズは2GB以内にしてください')
      return
    }

    setFile(f)
    setError(null)
    if (!title) {
      setTitle(f.name.replace(/\.[^/.]+$/, '').slice(0, 100))
    }
  }, [title])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (!f) return
    handleFileChange({ target: { files: [f] } } as unknown as React.ChangeEvent<HTMLInputElement>)
  }, [handleFileChange])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !selectedRoundId || !title.trim()) return

    setError(null)
    setUploadState('uploading')
    setProgress(0)

    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'mp4'
    const timestamp = Date.now()
    const storagePath = `rounds/${selectedRoundId}/${userId}/${timestamp}.${ext}`

    try {
      // Step 1: 動画をSupabase Storageにアップロード
      // supabase-jsはXHRプログレスに対応していないため、XMLHttpRequestで実装
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const uploadUrl = `${supabaseUrl}/storage/v1/object/videos/${storagePath}`

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (ev) => {
          if (ev.lengthComputable) {
            setProgress(Math.round((ev.loaded / ev.total) * 100))
          }
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            try {
              const body = JSON.parse(xhr.responseText)
              reject(new Error(body.error ?? `Upload failed: ${xhr.status}`))
            } catch {
              reject(new Error(`Upload failed: ${xhr.status}`))
            }
          }
        })
        xhr.addEventListener('error', () => reject(new Error('ネットワークエラーが発生しました')))

        xhr.open('POST', uploadUrl)
        xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token}`)
        xhr.setRequestHeader('x-upsert', 'false')

        const formData = new FormData()
        formData.append('', file, file.name)
        xhr.send(formData)
      })

      setProgress(100)

      // Step 2: サムネイルと尺を取得
      const [thumbnailBlob, durationSeconds] = await Promise.all([
        extractThumbnail(file),
        getVideoDuration(file),
      ])

      let thumbnailPath: string | null = null
      if (thumbnailBlob) {
        const thumbPath = `rounds/${selectedRoundId}/${userId}/${timestamp}.jpg`
        const { error: thumbError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbPath, thumbnailBlob, { contentType: 'image/jpeg', upsert: false })
        if (!thumbError) thumbnailPath = thumbPath
      }

      // Step 3: Supabaseにメタデータを保存
      setUploadState('saving')
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: selectedRoundId,
          title: title.trim(),
          storagePath,
          thumbnailPath,
          durationSeconds,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? '動画の保存に失敗しました')
      }

      const { id: newVideoId } = await res.json()
      setUploadState('done')

      setTimeout(() => {
        router.push(`/rounds/${selectedRoundId}/videos/${newVideoId}`)
      }, 800)

    } catch (err) {
      // アップロード失敗時はStorageのファイルを削除
      try {
        const supabaseClean = createClient()
        await supabaseClean.storage.from('videos').remove([storagePath])
      } catch { /* ignore */ }

      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      setUploadState('error')
    }
  }

  if (rounds.length === 0) {
    return (
      <div className="text-center py-12 border border-white/10">
        <p className="text-gray-500">現在受付中のラウンドがありません</p>
      </div>
    )
  }

  const isSubmitting = ['uploading', 'saving', 'done'].includes(uploadState)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ラウンド選択 */}
      <div className="space-y-2">
        <label className="block text-xs text-gray-400 uppercase tracking-widest">
          参戦ラウンド
        </label>
        {rounds.map((round) => (
          <label
            key={round.id}
            className={`flex items-start gap-4 p-4 border cursor-pointer transition-colors ${
              selectedRoundId === round.id
                ? 'border-arena-gold bg-arena-gold/5'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <input
              type="radio"
              name="round"
              value={round.id}
              checked={selectedRoundId === round.id}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              className="mt-1 accent-arena-gold"
            />
            <div>
              <div className="text-white font-medium">{round.title}</div>
              <div className="text-arena-gold text-sm">テーマ: {round.theme}</div>
              <div className="text-gray-600 text-xs mt-1">
                投稿期限:{' '}
                {new Date(round.submission_end).toLocaleDateString('ja-JP', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* タイトル */}
      <div className="space-y-1">
        <label className="block text-xs text-gray-400 uppercase tracking-widest">
          作品タイトル <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
          placeholder="作品のタイトルを入力"
          className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-600 focus:border-arena-gold focus:outline-none transition-colors"
        />
        <div className="text-right text-xs text-gray-600">{title.length}/100</div>
      </div>

      {/* 動画ファイル選択 */}
      <div className="space-y-2">
        <label className="block text-xs text-gray-400 uppercase tracking-widest">
          動画ファイル <span className="text-red-400">*</span>
        </label>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !isSubmitting && fileInputRef.current?.click()}
          className={`border-2 border-dashed p-10 text-center transition-colors ${
            isSubmitting
              ? 'opacity-50 cursor-default border-white/5'
              : file
                ? 'border-arena-gold/50 bg-arena-gold/5 cursor-pointer'
                : 'border-white/10 hover:border-white/20 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/mpeg,video/x-matroska"
            onChange={handleFileChange}
            disabled={isSubmitting}
            className="hidden"
          />
          {file ? (
            <div className="space-y-1">
              <div className="text-arena-gold font-medium truncate">{file.name}</div>
              <div className="text-gray-500 text-sm">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
              {!isSubmitting && <div className="text-gray-600 text-xs mt-2">クリックして変更</div>}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-3xl">🎬</div>
              <div className="text-white/60">ここにファイルをドロップ</div>
              <div className="text-gray-600 text-sm">またはクリックして選択</div>
              <div className="text-gray-700 text-xs mt-3">
                実写・60〜180秒・最大2GB<br />
                MP4, MOV, AVI, WebM, MKV 対応
              </div>
            </div>
          )}
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="border border-red-500 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* プログレスバー */}
      {uploadState === 'uploading' && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>アップロード中...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-white/5 h-1.5">
            <div
              className="h-1.5 bg-arena-gold transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {uploadState === 'saving' && (
        <div className="space-y-2">
          <div className="text-xs text-gray-400">サムネイル生成・登録中...</div>
          <div className="w-full bg-white/5 h-1.5">
            <div className="h-1.5 bg-arena-gold w-[95%] transition-all duration-500" />
          </div>
        </div>
      )}
      {uploadState === 'done' && (
        <div className="border border-arena-gold/30 bg-arena-gold/5 px-4 py-3 text-arena-gold text-sm text-center">
          投稿完了！動画ページに移動します…
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={!file || !title.trim() || !selectedRoundId || isSubmitting}
        className="w-full bg-arena-gold text-black font-bold py-4 uppercase tracking-widest hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg"
      >
        {uploadState === 'idle' || uploadState === 'error'
          ? '闘技場に投稿する'
          : uploadState === 'uploading'
            ? `アップロード中... ${progress}%`
            : uploadState === 'saving'
              ? '登録中...'
              : '投稿完了'}
      </button>

      <p className="text-xs text-gray-700 text-center">
        投稿後のキャンセルはできません。審査期間中は作者情報が匿名になります。
      </p>
    </form>
  )
}
