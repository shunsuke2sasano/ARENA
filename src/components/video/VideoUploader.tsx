'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Round {
  id: string
  title: string
  theme: string
  submission_end: string
}

interface VideoUploaderProps {
  rounds: Round[]
}

type UploadState = 'idle' | 'uploading' | 'saving' | 'done' | 'error'

export default function VideoUploader({ rounds }: VideoUploaderProps) {
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
    // 2GB制限
    if (f.size > 2 * 1024 * 1024 * 1024) {
      setError('ファイルサイズは2GB以内にしてください')
      return
    }

    setFile(f)
    setError(null)
    // ファイル名からタイトルを自動設定（拡張子除く）
    if (!title) {
      setTitle(f.name.replace(/\.[^/.]+$/, '').slice(0, 100))
    }
  }, [title])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (!f) return
    const fakeEvent = { target: { files: [f] } } as unknown as React.ChangeEvent<HTMLInputElement>
    handleFileChange(fakeEvent)
  }, [handleFileChange])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !selectedRoundId || !title.trim()) return

    setError(null)
    setUploadState('uploading')
    setProgress(0)

    try {
      // Step 1: ダイレクトアップロードURLを取得
      const urlRes = await fetch('/api/videos/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId: selectedRoundId }),
      })

      if (!urlRes.ok) {
        const err = await urlRes.json()
        throw new Error(err.error ?? 'アップロードURLの取得に失敗しました')
      }

      const { videoId, uploadURL } = await urlRes.json()

      // Step 2: Cloudflare Streamに直接アップロード（XHRでプログレス取得）
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        })
        xhr.addEventListener('error', () => reject(new Error('ネットワークエラーが発生しました')))

        xhr.open('POST', uploadURL)
        const formData = new FormData()
        formData.append('file', file)
        xhr.send(formData)
      })

      // Step 3: Supabaseに動画メタデータを保存
      setUploadState('saving')
      const saveRes = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: selectedRoundId,
          title: title.trim(),
          cloudflareVideoId: videoId,
        }),
      })

      if (!saveRes.ok) {
        const err = await saveRes.json()
        throw new Error(err.error ?? '動画の保存に失敗しました')
      }

      const { id: newVideoId } = await saveRes.json()
      setUploadState('done')

      // 動画ページへリダイレクト
      setTimeout(() => {
        router.push(`/rounds/${selectedRoundId}/videos/${newVideoId}`)
      }, 1000)

    } catch (err) {
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
                投稿期限: {new Date(round.submission_end).toLocaleDateString('ja-JP', {
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
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
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
            file
              ? 'border-arena-gold/50 bg-arena-gold/5'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div className="space-y-1">
              <div className="text-arena-gold font-medium">{file.name}</div>
              <div className="text-gray-500 text-sm">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </div>
              <div className="text-gray-600 text-xs mt-2">クリックして変更</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-3xl">🎬</div>
              <div className="text-white/60">ここにファイルをドロップ</div>
              <div className="text-gray-600 text-sm">またはクリックして選択</div>
              <div className="text-gray-700 text-xs mt-3">
                実写・60〜180秒・最大2GB<br />
                MP4, MOV, AVI など主要フォーマット対応
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

      {/* アップロード中のプログレス */}
      {(uploadState === 'uploading' || uploadState === 'saving' || uploadState === 'done') && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>
              {uploadState === 'uploading' && `アップロード中... ${progress}%`}
              {uploadState === 'saving' && '動画を登録中...'}
              {uploadState === 'done' && '投稿完了！'}
            </span>
            <span>{uploadState === 'uploading' ? `${progress}%` : ''}</span>
          </div>
          <div className="w-full bg-white/5 h-1">
            <div
              className="h-1 bg-arena-gold transition-all duration-300"
              style={{
                width: uploadState === 'uploading'
                  ? `${progress}%`
                  : uploadState === 'saving' ? '95%'
                  : '100%'
              }}
            />
          </div>
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={!file || !title.trim() || !selectedRoundId || ['uploading', 'saving', 'done'].includes(uploadState)}
        className="w-full bg-arena-gold text-black font-bold py-4 uppercase tracking-widest hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg"
      >
        {uploadState === 'idle' || uploadState === 'error' ? '闘技場に投稿する' :
         uploadState === 'uploading' ? `アップロード中... ${progress}%` :
         uploadState === 'saving' ? '登録中...' :
         '投稿完了'}
      </button>

      <p className="text-xs text-gray-700 text-center">
        投稿後のキャンセルはできません。審査期間中は作者情報が匿名になります。
      </p>
    </form>
  )
}
