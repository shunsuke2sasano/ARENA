import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import VideoCard from '@/components/video/VideoCard'

export const revalidate = 30

type Video = {
  id: string
  title: string
  storage_path: string
  thumbnail_path: string | null
  duration_seconds: number | null
  total_votes: number
  final_score: number | null
  base_score: number | null
  rank: number | null
  creator_id: string
  profiles: { username: string; display_name: string | null } | null
}

type Round = {
  id: string; title: string; theme: string; description: string | null
  status: string; is_competition: boolean
  submission_end: string; review_end: string; published_at: string | null
}

export default async function RoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: round } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', id)
    .returns<Round[]>()
    .maybeSingle()

  if (!round) notFound()

  const isAnonymous = round.status === 'reviewing'
  const isPublished = round.status === 'published'

  const { data: videos } = await supabase
    .from('videos')
    .select(`
      id, title, storage_path, thumbnail_path,
      duration_seconds, total_votes, final_score, base_score, rank, creator_id,
      profiles (username, display_name)
    `)
    .eq('round_id', id)
    .order(isPublished ? 'rank' : 'created_at', { ascending: isPublished })
    .returns<Video[]>()

  const statusLabel = {
    open: '投稿受付中',
    reviewing: '匿名審査中',
    published: '結果発表済',
  }[round.status] ?? ''

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const myVideo = user ? videos?.find((v) => v.creator_id === user.id) : null

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* ラウンドヘッダー */}
      <div className="mb-10">
        <Link href="/rounds" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest mb-4 inline-block">
          ← ラウンド一覧
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-bebas text-4xl text-white tracking-wide">{round.title}</h1>
              {round.is_competition && (
                <span className="text-xs text-arena-orange border border-arena-orange/40 px-2 py-0.5 uppercase tracking-widest">
                  COMP
                </span>
              )}
            </div>
            <p className="text-arena-gold text-lg">テーマ: {round.theme}</p>
            {round.description && (
              <p className="text-gray-500 text-sm mt-2">{round.description}</p>
            )}
          </div>
          <div className="text-right space-y-1">
            <div className={`text-xs border px-3 py-1 inline-block ${
              round.status === 'open'      ? 'text-green-400 border-green-400/30' :
              round.status === 'reviewing' ? 'text-yellow-400 border-yellow-400/30' :
                                             'text-gray-400 border-gray-400/30'
            }`}>
              {statusLabel}
            </div>
            {round.status === 'open' && (
              <div className="text-gray-600 text-xs">
                締切: {new Date(round.submission_end).toLocaleDateString('ja-JP', {
                  month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 匿名審査期間バナー */}
      {isAnonymous && (
        <div className="border border-yellow-400/20 bg-yellow-400/5 px-6 py-4 mb-8 text-center">
          <p className="font-bebas text-xl text-yellow-400 tracking-wide mb-1">匿名審査期間</p>
          <p className="text-gray-500 text-sm">「作品を見ろ。顔を見るな。」— 作者情報は結果発表まで非表示です</p>
        </div>
      )}

      {/* 投稿ボタン（受付中・未投稿の場合） */}
      {round.status === 'open' && user && !myVideo && (
        <div className="mb-8 text-center">
          <Link
            href="/submit"
            className="inline-block px-8 py-3 bg-arena-gold text-black font-bold uppercase tracking-widest hover:bg-yellow-400 transition-colors"
          >
            このラウンドに投稿する
          </Link>
        </div>
      )}

      {/* 動画グリッド */}
      {!videos?.length ? (
        <div className="text-center py-20 text-gray-600">まだ投稿がありません</div>
      ) : (
        <div>
          {isPublished && (
            <p className="text-xs text-gray-600 mb-4 uppercase tracking-widest">
              {videos.length}作品 — スコア順
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                roundId={id}
                isAnonymous={isAnonymous}
                isPublished={isPublished}
                supabaseUrl={supabaseUrl}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
