import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import RoundStatusButton from '@/components/admin/RoundStatusButton'
import RoundCreateForm from '@/components/admin/RoundCreateForm'

type Round = {
  id: string; title: string; theme: string; status: string
  is_competition: boolean
  submission_start: string; submission_end: string
  review_start: string; review_end: string
  published_at: string | null; created_at: string
}

type VideoCount = { round_id: string; count: number }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.id)) {
    redirect('/')
  }

  const { data: rounds } = await supabase
    .from('rounds')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Round[]>()

  // 各ラウンドの投稿数を取得
  const { data: videoCounts } = await supabase
    .from('videos')
    .select('round_id')
    .returns<{ round_id: string }[]>()

  const countByRound = (videoCounts ?? []).reduce<Record<string, number>>((acc, v) => {
    acc[v.round_id] = (acc[v.round_id] ?? 0) + 1
    return acc
  }, {})

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-bebas text-4xl text-white tracking-wide">管理パネル</h1>
          <p className="text-gray-600 text-xs mt-1">ラウンドの作成・ステータス管理</p>
        </div>
        <span className="text-xs text-gray-700 border border-white/5 px-3 py-1">
          ADMIN: {user.email}
        </span>
      </div>

      {/* ラウンド作成フォーム */}
      <div className="mb-8">
        <RoundCreateForm />
      </div>

      {/* ラウンド一覧 */}
      <div className="space-y-px">
        {!rounds?.length ? (
          <p className="text-gray-600 text-sm py-8 text-center">ラウンドがありません</p>
        ) : (
          rounds.map((round) => (
            <div key={round.id} className="bg-white/2 border border-white/5 p-5">
              <div className="flex flex-wrap gap-6 justify-between">
                {/* 左: 基本情報 */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/rounds/${round.id}`} className="font-bebas text-xl text-white hover:text-arena-gold transition-colors">
                      {round.title}
                    </Link>
                    {round.is_competition && (
                      <span className="text-[10px] text-arena-orange border border-arena-orange/40 px-1.5 py-0.5 uppercase">COMP</span>
                    )}
                  </div>
                  <p className="text-arena-gold/70 text-sm">テーマ: {round.theme}</p>
                  <div className="text-gray-600 text-xs space-y-0.5 mt-2">
                    <p>投稿: {fmt(round.submission_start)} 〜 {fmt(round.submission_end)}</p>
                    <p>審査: {fmt(round.review_start)} 〜 {fmt(round.review_end)}</p>
                    {round.published_at && <p>発表: {fmt(round.published_at)}</p>}
                  </div>
                </div>

                {/* 右: 投稿数・ステータス変更 */}
                <div className="flex flex-col items-end gap-3">
                  <div className="text-right">
                    <span className="font-bebas text-2xl text-white">{countByRound[round.id] ?? 0}</span>
                    <span className="text-gray-600 text-xs ml-1">作品</span>
                  </div>
                  <RoundStatusButton
                    roundId={round.id}
                    currentStatus={round.status as 'open' | 'reviewing' | 'published'}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
