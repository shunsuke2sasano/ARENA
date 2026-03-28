'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RoundCreateForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    theme: '',
    description: '',
    is_competition: false,
    submission_start: '',
    submission_end: '',
    review_start: '',
    review_end: '',
  })

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // 日時入力をローカルからISO文字列へ変換
  function toISO(local: string): string {
    return local ? new Date(local).toISOString() : ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        theme: form.theme,
        description: form.description || null,
        is_competition: form.is_competition,
        submission_start: toISO(form.submission_start),
        submission_end: toISO(form.submission_end),
        review_start: toISO(form.review_start),
        review_end: toISO(form.review_end),
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error ?? '作成に失敗しました')
      setLoading(false)
      return
    }

    setOpen(false)
    setForm({ title: '', theme: '', description: '', is_competition: false,
              submission_start: '', submission_end: '', review_start: '', review_end: '' })
    setLoading(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-6 py-2 bg-arena-gold text-black text-sm font-bold uppercase tracking-widest hover:bg-yellow-400 transition-colors"
      >
        + 新しいラウンドを作成
      </button>
    )
  }

  const inputClass = "w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:border-arena-gold focus:outline-none"
  const labelClass = "block text-xs text-gray-500 uppercase tracking-widest mb-1"

  return (
    <form onSubmit={handleSubmit} className="border border-white/10 p-6 space-y-4">
      <h3 className="font-bebas text-xl text-white tracking-wide">新しいラウンドを作成</h3>

      {error && (
        <div className="border border-red-500 bg-red-500/10 px-3 py-2 text-red-400 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>ラウンド名 *</label>
          <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)}
            required placeholder="ARENA #001" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>テーマ *</label>
          <input type="text" value={form.theme} onChange={(e) => set('theme', e.target.value)}
            required placeholder="静寂" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>説明</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
          rows={2} placeholder="任意の説明文"
          className={`${inputClass} resize-none`} />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={form.is_competition}
          onChange={(e) => set('is_competition', e.target.checked)}
          className="accent-arena-gold w-4 h-4" />
        <span className="text-sm text-gray-300">コンペ回（審査員評価あり）</span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>投稿開始 *</label>
          <input type="datetime-local" value={form.submission_start}
            onChange={(e) => set('submission_start', e.target.value)}
            required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>投稿締切 *</label>
          <input type="datetime-local" value={form.submission_end}
            onChange={(e) => set('submission_end', e.target.value)}
            required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>審査開始 *</label>
          <input type="datetime-local" value={form.review_start}
            onChange={(e) => set('review_start', e.target.value)}
            required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>審査終了 *</label>
          <input type="datetime-local" value={form.review_end}
            onChange={(e) => set('review_end', e.target.value)}
            required className={inputClass} />
        </div>
      </div>

      <p className="text-xs text-gray-700">
        ※ ステータスは作成後に手動で変更します。日時はスケジュールの参考情報です。
      </p>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="px-6 py-2 bg-arena-gold text-black text-sm font-bold disabled:opacity-50 hover:bg-yellow-400 transition-colors">
          {loading ? '作成中...' : '作成する'}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={loading}
          className="px-6 py-2 border border-white/20 text-gray-400 text-sm hover:border-white/40 transition-colors">
          キャンセル
        </button>
      </div>
    </form>
  )
}
