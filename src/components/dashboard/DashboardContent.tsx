'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { VideoStats } from '@/app/(main)/dashboard/page'

// ───────── レーダーチャート（EvaluateFormと同じペンタゴン実装） ─────────
const RADAR_ITEMS = ['引力', '伝達力', '完成度', '独自性', '余韻'] as const

function radarPt(i: number, v: number, max: number, cx: number, cy: number) {
  const a = -Math.PI / 2 + i * (2 * Math.PI / 5)
  const r = (v / 5) * max
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function gridPt(i: number, ring: number, max: number, cx: number, cy: number) {
  const a = -Math.PI / 2 + i * (2 * Math.PI / 5)
  const r = (ring / 5) * max
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function labelPt(i: number, max: number, cx: number, cy: number, off = 18) {
  const a = -Math.PI / 2 + i * (2 * Math.PI / 5)
  return { x: cx + (max + off) * Math.cos(a), y: cy + (max + off) * Math.sin(a) }
}

type EvalAvg = {
  attraction: number; transmission: number; completion: number
  originality: number; afterglow: number; count: number
}

function RadarChart({ avg }: { avg: EvalAvg }) {
  const cx = 110; const cy = 110; const maxR = 72
  const vals = [avg.attraction, avg.transmission, avg.completion, avg.originality, avg.afterglow]
  const pts = vals.map((v, i) => radarPt(i, v, maxR, cx, cy))
  const poly = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'

  return (
    <svg viewBox="0 0 220 220" className="w-full h-full">
      {[1, 2, 3, 4, 5].map((ring) => {
        const gpts = vals.map((_, i) => gridPt(i, ring, maxR, cx, cy))
        const gpath = gpts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'
        return <path key={ring} d={gpath} fill="none" stroke={ring === 5 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'} strokeWidth={ring === 5 ? 1 : 0.5} />
      })}
      {vals.map((_, i) => {
        const end = gridPt(i, 5, maxR, cx, cy)
        return <line key={i} x1={cx} y1={cy} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
      })}
      <path d={poly} fill="rgba(245,200,66,0.15)" stroke="#f5c842" strokeWidth={1.5} strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={3} fill="#f5c842" />)}
      {RADAR_ITEMS.map((label, i) => {
        const lp = labelPt(i, maxR, cx, cy)
        const anchor = lp.x < cx - 5 ? 'end' : lp.x > cx + 5 ? 'start' : 'middle'
        return (
          <text key={label} x={lp.x.toFixed(1)} y={lp.y.toFixed(1)}
            textAnchor={anchor} dominantBaseline="middle"
            fontSize={9} fill="rgba(255,255,255,0.55)"
            fontFamily="'Bebas Neue', sans-serif" letterSpacing="0.05em">
            {label}
          </text>
        )
      })}
    </svg>
  )
}

// ───────── 棒グラフ（視聴者反応） ─────────
function VoteBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-14 text-right shrink-0">{label}</span>
      <div className="flex-1 bg-white/5 h-2 overflow-hidden">
        <div className={`h-2 ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right shrink-0">{value}</span>
    </div>
  )
}

// ───────── スコアバー ─────────
function ScoreBar({ label, value, color, note }: { label: string; value: number | null; color: string; note?: string }) {
  if (value == null) return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-700">—</span>
      </div>
      <div className="w-full bg-white/5 h-1.5" />
    </div>
  )
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">{label}{note && <span className="text-gray-700 ml-1">{note}</span>}</span>
        <span className="text-white">{value.toFixed(1)}</span>
      </div>
      <div className="w-full bg-white/5 h-1.5">
        <div className={`h-1.5 ${color} transition-all duration-500`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  )
}

// ───────── メトリクスカード ─────────
function MetricCard({
  label, value, unit, sub, size = 'normal',
}: {
  label: string; value: string | number | null; unit?: string; sub?: string; size?: 'large' | 'normal'
}) {
  return (
    <div className="border border-white/10 p-5 text-center space-y-1">
      <p className="text-xs text-gray-600 uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline justify-center gap-1">
        <span className={`font-bebas leading-none ${size === 'large' ? 'text-6xl text-arena-gold' : 'text-4xl text-white'}`}>
          {value ?? '—'}
        </span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {sub && <p className="text-xs text-gray-700">{sub}</p>}
    </div>
  )
}

// ───────── 過去作品テーブル ─────────
function HistoryTable({ videos, selectedId }: { videos: VideoStats[]; selectedId: string }) {
  const published = videos.filter((v) => v.rounds?.status === 'published')
  if (!published.length) return (
    <p className="text-xs text-gray-700 text-center py-6">結果発表済みの作品がまだありません</p>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-600 uppercase tracking-widest border-b border-white/5">
            <th className="text-left py-2 pr-4 font-normal">作品</th>
            <th className="text-right py-2 px-3 font-normal">最終</th>
            <th className="text-right py-2 px-3 font-normal">視聴者</th>
            <th className="text-right py-2 px-3 font-normal">評価</th>
            <th className="text-right py-2 px-3 font-normal">順位</th>
            <th className="text-right py-2 pl-3 font-normal">票数</th>
          </tr>
        </thead>
        <tbody>
          {published.map((v) => (
            <tr
              key={v.id}
              className={`border-b border-white/5 transition-colors ${v.id === selectedId ? 'bg-arena-gold/5' : 'hover:bg-white/3'}`}
            >
              <td className="py-2.5 pr-4">
                <Link
                  href={`/rounds/${v.rounds?.id}/videos/${v.id}`}
                  className={`hover:text-arena-gold transition-colors ${v.id === selectedId ? 'text-arena-gold' : 'text-gray-300'}`}
                >
                  {v.title}
                </Link>
                <div className="text-gray-700 mt-0.5">{v.rounds?.title}</div>
              </td>
              <td className="text-right py-2.5 px-3">
                <span className={`font-bebas text-lg leading-none ${v.id === selectedId ? 'text-arena-gold' : 'text-white'}`}>
                  {v.final_score?.toFixed(1) ?? '—'}
                </span>
              </td>
              <td className="text-right py-2.5 px-3 text-gray-400">
                {v.viewer_score?.toFixed(1) ?? '—'}
              </td>
              <td className="text-right py-2.5 px-3 text-gray-400">
                {v.creator_score?.toFixed(1) ?? '—'}
              </td>
              <td className="text-right py-2.5 px-3">
                {v.rank != null
                  ? <span className={v.rank === 1 ? 'text-arena-gold font-bebas text-base' : 'text-gray-400'}>{v.rank}位</span>
                  : <span className="text-gray-700">—</span>
                }
              </td>
              <td className="text-right py-2.5 pl-3 text-gray-600">{v.total_votes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ───────── メインコンポーネント ─────────
export default function DashboardContent({ videos }: { videos: VideoStats[] }) {
  const [selectedId, setSelectedId] = useState(videos[0]?.id ?? '')
  const video = videos.find((v) => v.id === selectedId) ?? videos[0]

  if (!video) return null

  const round = video.rounds
  const isPublished = round?.status === 'published'
  const maxVotes = Math.max(video.votes_good, video.votes_touched, video.votes_shook, 1)

  const statusColor = {
    open: 'text-green-400 border-green-400/30',
    reviewing: 'text-yellow-400 border-yellow-400/30',
    published: 'text-gray-400 border-gray-400/30',
  }[round?.status ?? ''] ?? 'text-gray-600 border-white/10'

  const statusLabel = { open: '投稿受付中', reviewing: '匿名審査中', published: '結果発表済' }[round?.status ?? ''] ?? ''

  return (
    <div className="space-y-8">
      {/* 作品セレクター */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <label className="block text-xs text-gray-600 uppercase tracking-widest mb-1">作品を選択</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-arena-gold/30 appearance-none cursor-pointer"
          >
            {videos.map((v) => (
              <option key={v.id} value={v.id} className="bg-[#09080c]">
                {v.title} — {v.rounds?.title ?? ''}
                {v.rounds?.status === 'published' && v.final_score != null ? ` (${v.final_score.toFixed(1)}pts)` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="shrink-0 flex items-end gap-3 pb-0.5">
          <span className={`text-xs border px-2 py-1 ${statusColor}`}>{statusLabel}</span>
          <Link
            href={`/rounds/${round?.id}/videos/${video.id}`}
            className="text-xs text-gray-600 hover:text-gray-400 border border-white/5 hover:border-white/10 px-3 py-1 transition-colors uppercase tracking-widest"
          >
            作品を見る →
          </Link>
        </div>
      </div>

      {/* ① メトリクスカード */}
      <div className="grid grid-cols-3 gap-px bg-white/5">
        <MetricCard
          label="最終スコア"
          value={isPublished && video.final_score != null ? video.final_score.toFixed(1) : null}
          size="large"
          sub={isPublished ? undefined : '結果発表後に表示'}
        />
        <MetricCard
          label="順位"
          value={isPublished && video.rank != null ? video.rank : null}
          unit={isPublished && video.rank != null ? '位' : undefined}
          sub={isPublished ? undefined : '結果発表後に表示'}
        />
        <MetricCard
          label="総投票数"
          value={video.total_votes}
          unit="票"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ② 視聴者反応 */}
        <div className="border border-white/10 p-5 space-y-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest">視聴者反応</p>
          <div className="space-y-3">
            <VoteBar label="震えた" value={video.votes_shook}   max={maxVotes} color="bg-arena-gold" />
            <VoteBar label="刺さった" value={video.votes_touched} max={maxVotes} color="bg-arena-orange" />
            <VoteBar label="良かった" value={video.votes_good}   max={maxVotes} color="bg-gray-500" />
          </div>
          <div className="pt-2 border-t border-white/5">
            {video.total_votes > 0 ? (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">視聴者スコア換算</span>
                {video.viewer_score != null
                  ? <span className="text-arena-gold font-bebas text-lg leading-none">{video.viewer_score.toFixed(1)}</span>
                  : <span className="text-gray-700">結果発表後に表示</span>
                }
              </div>
            ) : (
              <p className="text-xs text-gray-700 text-center">まだ投票がありません</p>
            )}
          </div>
        </div>

        {/* ③ レーダーチャート */}
        <div className="border border-white/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-widest">クリエイター評価</p>
            {video.eval_avg && (
              <span className="text-xs text-gray-600">{video.eval_avg.count}件の評価</span>
            )}
          </div>
          {video.eval_avg ? (
            <div className="aspect-square w-full max-w-[220px] mx-auto">
              <RadarChart avg={video.eval_avg} />
            </div>
          ) : (
            <div className="aspect-square w-full max-w-[220px] mx-auto flex items-center justify-center">
              <p className="text-xs text-gray-700 text-center">
                {isPublished ? 'まだ評価がありません' : '結果発表後に解禁されます'}
              </p>
            </div>
          )}
          {video.eval_avg && (
            <div className="mt-3 grid grid-cols-5 gap-1 text-center">
              {(['attraction', 'transmission', 'completion', 'originality', 'afterglow'] as const).map((k, i) => (
                <div key={k}>
                  <p className="text-[9px] text-gray-600">{RADAR_ITEMS[i]}</p>
                  <p className="font-bebas text-base text-arena-gold leading-none">{video.eval_avg![k].toFixed(1)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ④ スコア内訳 */}
      {isPublished && (
        <div className="border border-white/10 p-5 space-y-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest">スコア内訳</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <ScoreBar label="視聴者スコア" value={video.viewer_score} color="bg-arena-gold" note="(60%)" />
              <ScoreBar label="クリエイター評価" value={video.creator_score} color="bg-arena-orange" note="(40%)" />
              {video.judge_bonus != null && video.judge_bonus > 0 && (
                <ScoreBar label="審査員ボーナス" value={video.judge_bonus} color="bg-arena-crimson" note="(+max 15)" />
              )}
            </div>
            <div className="flex flex-col items-center justify-center gap-1 border border-white/5 p-4">
              <p className="text-xs text-gray-600 uppercase tracking-widest">最終スコア</p>
              <p className="font-bebas text-6xl text-arena-gold leading-none">
                {video.final_score?.toFixed(1) ?? '—'}
              </p>
              {video.rank != null && (
                <p className="text-gray-400 text-sm">
                  <span className="font-bebas text-2xl text-white">{video.rank}</span>位
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ⑤ 過去作品との比較 */}
      <div className="border border-white/10 p-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">過去作品との比較</p>
        <HistoryTable videos={videos} selectedId={selectedId} />
      </div>
    </div>
  )
}
