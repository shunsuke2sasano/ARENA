'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type EvalValues = {
  attraction: number    // 引力
  transmission: number  // 伝達力
  completion: number    // 完成度
  originality: number   // 独自性
  afterglow: number     // 余韻
}

const ITEMS: { key: keyof EvalValues; label: string; desc: string }[] = [
  { key: 'attraction',   label: '引力',   desc: '見始めて引き込まれたか' },
  { key: 'transmission', label: '伝達力', desc: 'テーマや意図が伝わったか' },
  { key: 'completion',   label: '完成度', desc: '全体として作り込まれているか' },
  { key: 'originality',  label: '独自性', desc: 'ほかにない表現や視点があるか' },
  { key: 'afterglow',    label: '余韻',   desc: '見終わった後も残るものがあるか' },
]

// ペンタゴンの頂点座標を計算（上から時計回り）
function pentagonPoint(index: number, value: number, maxR: number, cx: number, cy: number) {
  const angle = -Math.PI / 2 + index * (2 * Math.PI / 5)
  const r = (value / 5) * maxR
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }
}

function labelPoint(index: number, maxR: number, cx: number, cy: number, offset = 18) {
  const angle = -Math.PI / 2 + index * (2 * Math.PI / 5)
  return {
    x: cx + (maxR + offset) * Math.cos(angle),
    y: cy + (maxR + offset) * Math.sin(angle),
  }
}

function gridPoint(index: number, ring: number, maxR: number, cx: number, cy: number) {
  const angle = -Math.PI / 2 + index * (2 * Math.PI / 5)
  const r = (ring / 5) * maxR
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function RadarChart({ values }: { values: EvalValues }) {
  const cx = 110
  const cy = 110
  const maxR = 72
  const keys = ITEMS.map((i) => i.key)

  // 値ポリゴン
  const pts = keys.map((k, i) => pentagonPoint(i, values[k], maxR, cx, cy))
  const polyPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z'

  // グリッドリング
  const rings = [1, 2, 3, 4, 5]

  return (
    <svg viewBox="0 0 220 220" className="w-full h-full">
      {/* グリッドリング */}
      {rings.map((ring) => {
        const gpts = keys.map((_, i) => gridPoint(i, ring, maxR, cx, cy))
        const gpath = gpts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z'
        return (
          <path
            key={ring}
            d={gpath}
            fill="none"
            stroke={ring === 5 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}
            strokeWidth={ring === 5 ? 1 : 0.5}
          />
        )
      })}

      {/* 軸線 */}
      {keys.map((_, i) => {
        const end = gridPoint(i, 5, maxR, cx, cy)
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={end.x.toFixed(2)} y2={end.y.toFixed(2)}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.5}
          />
        )
      })}

      {/* 値ポリゴン */}
      <path
        d={polyPath}
        fill="rgba(245,200,66,0.15)"
        stroke="#f5c842"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* 頂点ドット */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r={3} fill="#f5c842" />
      ))}

      {/* ラベル */}
      {ITEMS.map((item, i) => {
        const lp = labelPoint(i, maxR, cx, cy)
        const anchor =
          lp.x < cx - 5 ? 'end' :
          lp.x > cx + 5 ? 'start' : 'middle'
        return (
          <text
            key={item.key}
            x={lp.x.toFixed(2)}
            y={lp.y.toFixed(2)}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={9}
            fill="rgba(255,255,255,0.55)"
            fontFamily="'Bebas Neue', sans-serif"
            letterSpacing="0.05em"
          >
            {item.label}
          </text>
        )
      })}
    </svg>
  )
}

function DotSelector({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? value

  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          disabled={disabled}
          onClick={() => onChange(v)}
          onMouseEnter={() => setHovered(v)}
          onMouseLeave={() => setHovered(null)}
          className="group focus:outline-none disabled:cursor-not-allowed"
          aria-label={`${v}点`}
        >
          <span
            className={[
              'block w-4 h-4 rounded-full border transition-all duration-100',
              v <= display
                ? 'bg-arena-gold border-arena-gold'
                : 'bg-transparent border-white/20 group-hover:border-arena-gold/40',
            ].join(' ')}
          />
        </button>
      ))}
      <span className="font-bebas text-lg text-arena-gold leading-none ml-1 w-4">{value}</span>
    </div>
  )
}

interface EvaluateFormProps {
  videoId: string
  roundId: string
  existing: {
    attraction: number
    transmission: number
    completion: number
    originality: number
    afterglow: number
    comment: string | null
  } | null
}

export default function EvaluateForm({ videoId, roundId, existing }: EvaluateFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [values, setValues] = useState<EvalValues>({
    attraction:   existing?.attraction   ?? 3,
    transmission: existing?.transmission ?? 3,
    completion:   existing?.completion   ?? 3,
    originality:  existing?.originality  ?? 3,
    afterglow:    existing?.afterglow    ?? 3,
  })
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const isEdit = !!existing
  const total = Object.values(values).reduce((s, v) => s + v, 0)
  const scorePreview = Math.round((total / 25) * 100 * 10) / 10

  function setItem(key: keyof EvalValues, v: number) {
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('ログインが必要です'); return }

      const { error: err } = await supabase
        .from('creator_evaluations')
        .upsert(
          {
            video_id: videoId,
            evaluator_id: user.id,
            attraction:   values.attraction,
            transmission: values.transmission,
            completion:   values.completion,
            originality:  values.originality,
            afterglow:    values.afterglow,
            comment: comment.trim() || null,
          },
          { onConflict: 'video_id,evaluator_id' }
        )

      if (err) {
        setError('送信に失敗しました。もう一度お試しください。')
        return
      }

      setSubmitted(true)
      setTimeout(() => {
        router.push(`/rounds/${roundId}/videos/${videoId}`)
      }, 1200)
    })
  }

  if (submitted) {
    return (
      <div className="text-center py-16 border border-arena-gold/20">
        <p className="font-bebas text-3xl text-arena-gold tracking-wide mb-2">
          {isEdit ? '評価を更新しました' : '評価しました'}
        </p>
        <p className="text-gray-600 text-xs">作品ページに戻ります…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* レーダーチャート */}
        <div className="aspect-square w-full max-w-[280px] mx-auto md:mx-0">
          <RadarChart values={values} />
        </div>

        {/* ドット選択 */}
        <div className="space-y-5">
          {ITEMS.map((item) => (
            <div key={item.key}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-bebas text-xl text-white tracking-wide">{item.label}</span>
                <span className="text-xs text-gray-600">{item.desc}</span>
              </div>
              <DotSelector
                value={values[item.key]}
                onChange={(v) => setItem(item.key, v)}
                disabled={isPending}
              />
            </div>
          ))}
        </div>
      </div>

      {/* スコアプレビュー */}
      <div className="flex items-center gap-3 border-t border-white/5 pt-5">
        <span className="text-xs text-gray-600 uppercase tracking-widest">評価スコア換算</span>
        <span className="font-bebas text-3xl text-arena-gold leading-none">{scorePreview}</span>
        <span className="text-xs text-gray-600">/ 100</span>
        <span className="text-xs text-gray-700 ml-auto">合計 {total} / 25点</span>
      </div>

      {/* コメント */}
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
          コメント <span className="text-gray-700 normal-case tracking-normal">(任意・一言可)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isPending}
          maxLength={300}
          rows={3}
          placeholder="作品への一言…"
          className="w-full bg-white/3 border border-white/10 text-white text-sm px-3 py-2 resize-none focus:outline-none focus:border-arena-gold/30 placeholder:text-gray-700 disabled:opacity-50"
        />
        <p className="text-right text-xs text-gray-700 mt-1">{comment.length} / 300</p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* 送信 */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-3 bg-arena-gold text-black font-bold text-sm uppercase tracking-widest hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? '送信中…' : isEdit ? '評価を更新する' : 'この評価を送る'}
        </button>
        <a
          href={`/rounds/${roundId}/videos/${videoId}`}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-widest"
        >
          キャンセル
        </a>
      </div>
    </form>
  )
}
