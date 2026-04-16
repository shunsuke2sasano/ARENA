'use client'

import { useState } from 'react'

type BadgeItem = {
  name: string
  description: string
  icon: string
  category: string
  awarded_at: string
}

const CATEGORY_LABEL: Record<string, string> = {
  action:  '行動',
  score:   'スコア',
  item:    '部門',
  special: '特別',
}

const CATEGORY_COLOR: Record<string, string> = {
  action:  'border-gray-600/40 bg-gray-600/5 hover:border-gray-500/60',
  score:   'border-arena-gold/40 bg-arena-gold/5 hover:border-arena-gold/70',
  item:    'border-arena-orange/40 bg-arena-orange/5 hover:border-arena-orange/70',
  special: 'border-arena-crimson/40 bg-arena-crimson/5 hover:border-arena-crimson/70',
}

const CATEGORY_TAG: Record<string, string> = {
  action:  'text-gray-500 border-gray-600/30',
  score:   'text-arena-gold border-arena-gold/30',
  item:    'text-arena-orange border-arena-orange/30',
  special: 'text-arena-crimson border-arena-crimson/30',
}

export default function BadgeGrid({ badges }: { badges: BadgeItem[] }) {
  const [tooltip, setTooltip] = useState<string | null>(null)

  // カテゴリ順: special → score → item → action
  const ORDER = ['special', 'score', 'item', 'action']
  const sorted = [...badges].sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category))

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {sorted.map((badge, i) => (
        <div
          key={`${badge.name}-${i}`}
          className={`relative flex flex-col items-center gap-2 p-4 border cursor-default transition-all duration-150 ${CATEGORY_COLOR[badge.category] ?? 'border-white/10'}`}
          onMouseEnter={() => setTooltip(badge.name)}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* アイコン */}
          <span className="text-3xl leading-none select-none" role="img" aria-label={badge.name}>
            {badge.icon}
          </span>

          {/* バッジ名 */}
          <p className="text-xs text-white text-center font-medium leading-tight">{badge.name}</p>

          {/* カテゴリタグ */}
          <span className={`text-[9px] border px-1.5 py-0.5 uppercase tracking-widest ${CATEGORY_TAG[badge.category] ?? 'text-gray-600 border-white/10'}`}>
            {CATEGORY_LABEL[badge.category] ?? badge.category}
          </span>

          {/* ツールチップ */}
          {tooltip === badge.name && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-40 bg-[#1a1820] border border-white/10 px-3 py-2 text-center pointer-events-none shadow-lg">
              <p className="text-white text-xs font-medium mb-1">{badge.name}</p>
              <p className="text-gray-500 text-[10px] leading-snug">{badge.description}</p>
              <p className="text-gray-700 text-[9px] mt-1.5">
                {new Date(badge.awarded_at).toLocaleDateString('ja-JP')}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
