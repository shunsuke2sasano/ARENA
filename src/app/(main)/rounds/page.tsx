import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 60

type Round = {
  id: string
  title: string
  theme: string
  description: string | null
  status: string
  is_competition: boolean
  submission_end: string
  review_end: string
  published_at: string | null
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  open:      { label: '投稿受付中', color: 'text-green-400 border-green-400/30 bg-green-400/5' },
  reviewing: { label: '審査中',   color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5' },
  published: { label: '結果発表済', color: 'text-gray-400 border-gray-400/30 bg-gray-400/5' },
}

export default async function RoundsPage() {
  const supabase = await createClient()

  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, title, theme, description, status, is_competition, submission_end, review_end, published_at')
    .order('submission_end', { ascending: false })
    .returns<Round[]>()

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-end justify-between mb-8">
        <h1 className="font-bebas text-4xl text-white tracking-wide">ラウンド一覧</h1>
        <Link
          href="/submit"
          className="text-xs text-arena-gold border border-arena-gold/40 px-4 py-2 hover:bg-arena-gold/10 transition-colors uppercase tracking-widest"
        >
          投稿する
        </Link>
      </div>

      {!rounds?.length ? (
        <div className="text-center py-20 text-gray-600">
          まだラウンドが開催されていません
        </div>
      ) : (
        <div className="space-y-px">
          {rounds.map((round) => {
            const status = STATUS_LABEL[round.status] ?? STATUS_LABEL.published
            return (
              <Link
                key={round.id}
                href={`/rounds/${round.id}`}
                className="flex items-center gap-6 bg-white/2 border border-white/5 px-6 py-5 hover:border-white/15 hover:bg-white/4 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bebas text-xl text-white group-hover:text-arena-gold transition-colors">
                      {round.title}
                    </span>
                    {round.is_competition && (
                      <span className="text-[10px] text-arena-orange border border-arena-orange/40 px-2 py-0.5 uppercase tracking-widest">
                        COMP
                      </span>
                    )}
                  </div>
                  <div className="text-arena-gold/80 text-sm">テーマ: {round.theme}</div>
                  {round.description && (
                    <div className="text-gray-600 text-xs mt-1 truncate">{round.description}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`text-xs border px-2 py-0.5 ${status.color}`}>
                    {status.label}
                  </span>
                  <span className="text-gray-600 text-xs">
                    {round.status === 'open'
                      ? `締切 ${new Date(round.submission_end).toLocaleDateString('ja-JP')}`
                      : round.published_at
                        ? `発表 ${new Date(round.published_at).toLocaleDateString('ja-JP')}`
                        : new Date(round.submission_end).toLocaleDateString('ja-JP')
                    }
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
