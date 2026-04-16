import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 300

type TopVideo = {
  id: string
  title: string
  thumbnail_path: string | null
  final_score: number | null
  rank: number | null
  total_votes: number
  creator_id: string
  profiles: { username: string; display_name: string | null } | null
  rounds: { id: string; title: string; theme: string } | null
}

type CreatorStat = {
  creator_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  total_videos: number
  avg_score: number
  best_score: number
  total_votes: number
}

export default async function RankingPage() {
  const supabase = await createClient()

  // 全ラウンド通算トップ動画（スコアあり）
  const { data: topVideos } = await supabase
    .from('videos')
    .select(`
      id, title, thumbnail_path, final_score, rank, total_votes, creator_id,
      profiles (username, display_name),
      rounds (id, title, theme)
    `)
    .not('final_score', 'is', null)
    .order('final_score', { ascending: false })
    .limit(20)
    .returns<TopVideo[]>()

  // クリエイターランキング集計（publishedラウンドのみ）
  const { data: publishedVideos } = await supabase
    .from('videos')
    .select(`
      creator_id, final_score, total_votes,
      profiles (username, display_name, avatar_url),
      rounds (status)
    `)
    .not('final_score', 'is', null)
    .returns<{
      creator_id: string
      final_score: number
      total_votes: number
      profiles: { username: string; display_name: string | null; avatar_url: string | null } | null
      rounds: { status: string } | null
    }[]>()

  // クリエイター別集計
  const creatorMap = new Map<string, CreatorStat>()
  for (const v of publishedVideos ?? []) {
    if (v.rounds?.status !== 'published') continue
    const existing = creatorMap.get(v.creator_id)
    if (existing) {
      existing.total_videos++
      existing.avg_score = (existing.avg_score * (existing.total_videos - 1) + v.final_score) / existing.total_videos
      existing.best_score = Math.max(existing.best_score, v.final_score)
      existing.total_votes += v.total_votes
    } else {
      creatorMap.set(v.creator_id, {
        creator_id: v.creator_id,
        username: v.profiles?.username ?? '不明',
        display_name: v.profiles?.display_name ?? null,
        avatar_url: v.profiles?.avatar_url ?? null,
        total_videos: 1,
        avg_score: v.final_score,
        best_score: v.final_score,
        total_votes: v.total_votes,
      })
    }
  }

  const creatorRanking = Array.from(creatorMap.values())
    .sort((a, b) => b.avg_score - a.avg_score)
    .slice(0, 20)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* ヘッダー */}
      <div className="text-center mb-12">
        <p className="text-xs text-gray-600 uppercase tracking-[0.3em] mb-3">All Time</p>
        <h1 className="font-bebas text-6xl md:text-8xl text-white tracking-wide">RANKING</h1>
        <p className="text-gray-500 text-sm mt-2">全ラウンド通算ランキング</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 作品ランキング */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest">作品ランキング</p>
            <p className="text-xs text-gray-600">最終スコア順</p>
          </div>

          {!topVideos?.length ? (
            <div className="text-center py-16 text-gray-600 border border-white/5">
              まだ結果が発表されたラウンドがありません
            </div>
          ) : (
            <div className="space-y-px">
              {topVideos.map((video, i) => {
                const poster = video.thumbnail_path
                  ? `${supabaseUrl}/storage/v1/object/public/thumbnails/${video.thumbnail_path}`
                  : null
                const creator = video.profiles?.display_name ?? video.profiles?.username ?? '不明'
                const rankNum = i + 1

                return (
                  <Link
                    key={video.id}
                    href={`/rounds/${video.rounds?.id}/videos/${video.id}`}
                    className="flex items-center gap-3 bg-white/2 hover:bg-white/5 border border-white/5 hover:border-white/10 px-4 py-3 transition-colors group"
                  >
                    {/* 順位 */}
                    <span className={`font-bebas text-2xl w-8 text-center shrink-0 ${
                      rankNum === 1 ? 'text-arena-gold' :
                      rankNum === 2 ? 'text-gray-300' :
                      rankNum === 3 ? 'text-amber-700' : 'text-gray-600'
                    }`}>
                      {rankNum <= 3 ? ['👑', '2', '3'][rankNum - 1] : rankNum}
                    </span>

                    {/* サムネイル */}
                    <div className="w-14 h-8 bg-white/5 overflow-hidden shrink-0">
                      {poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={poster} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-white/5" />
                      )}
                    </div>

                    {/* タイトル・情報 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate group-hover:text-arena-gold transition-colors">
                        {video.title}
                      </p>
                      <p className="text-gray-600 text-xs truncate">
                        {creator} — {video.rounds?.title ?? ''}
                      </p>
                    </div>

                    {/* スコア */}
                    <div className="text-right shrink-0">
                      <p className="font-bebas text-2xl text-arena-gold leading-none">
                        {video.final_score?.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-gray-600">{video.total_votes}票</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* クリエイターランキング */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest">クリエイター</p>
            <p className="text-xs text-gray-600">平均スコア順</p>
          </div>

          {!creatorRanking.length ? (
            <div className="text-center py-16 text-gray-600 border border-white/5 text-xs">
              データなし
            </div>
          ) : (
            <div className="space-y-px">
              {creatorRanking.map((c, i) => (
                <div
                  key={c.creator_id}
                  className="flex items-center gap-3 bg-white/2 border border-white/5 px-3 py-3"
                >
                  {/* 順位 */}
                  <span className={`font-bebas text-xl w-6 text-center shrink-0 ${
                    i === 0 ? 'text-arena-gold' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-700' : 'text-gray-600'
                  }`}>{i + 1}</span>

                  {/* アバター */}
                  <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden shrink-0">
                    {c.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                        {(c.display_name ?? c.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* 名前 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs truncate">{c.display_name ?? c.username}</p>
                    <p className="text-gray-600 text-[10px]">{c.total_videos}作品</p>
                  </div>

                  {/* スコア */}
                  <div className="text-right shrink-0">
                    <p className="font-bebas text-xl text-arena-gold leading-none">
                      {c.avg_score.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-gray-600">avg</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ベストスコア上位 */}
          {creatorRanking.length > 0 && (
            <div className="mt-6">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">自己ベスト順</p>
              <div className="space-y-px">
                {[...creatorRanking]
                  .sort((a, b) => b.best_score - a.best_score)
                  .slice(0, 5)
                  .map((c, i) => (
                    <div key={c.creator_id} className="flex items-center gap-2 px-3 py-2 bg-white/2 border border-white/5">
                      <span className="text-gray-600 font-bebas text-lg w-5 text-center">{i + 1}</span>
                      <span className="flex-1 text-xs text-gray-400 truncate">{c.display_name ?? c.username}</span>
                      <span className="font-bebas text-lg text-arena-orange">{c.best_score.toFixed(1)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
