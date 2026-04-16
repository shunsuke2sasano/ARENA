import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 60

type VideoResult = {
  id: string
  title: string
  thumbnail_path: string | null
  duration_seconds: number | null
  viewer_score: number | null
  creator_score: number | null
  judge_bonus: number | null
  base_score: number | null
  final_score: number | null
  rank: number | null
  total_votes: number
  votes_good: number
  votes_touched: number
  votes_shook: number
  creator_id: string
  profiles: { username: string; display_name: string | null } | null
}

type Round = {
  id: string; title: string; theme: string; description: string | null
  status: string; is_competition: boolean; published_at: string | null
}

export default async function RoundResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: round } = await supabase
    .from('rounds')
    .select('id, title, theme, description, status, is_competition, published_at')
    .eq('id', id)
    .returns<Round[]>()
    .maybeSingle()

  if (!round) notFound()
  if (round.status !== 'published') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="font-bebas text-3xl text-gray-500 tracking-wide mb-4">結果はまだ発表されていません</p>
        <Link href={`/rounds/${id}`} className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest">
          ← ラウンドに戻る
        </Link>
      </div>
    )
  }

  const { data: videos } = await supabase
    .from('videos')
    .select(`
      id, title, thumbnail_path, duration_seconds,
      viewer_score, creator_score, judge_bonus, base_score, final_score, rank,
      total_votes, votes_good, votes_touched, votes_shook,
      creator_id,
      profiles (username, display_name)
    `)
    .eq('round_id', id)
    .not('rank', 'is', null)
    .order('rank', { ascending: true })
    .returns<VideoResult[]>()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const top3 = videos?.slice(0, 3) ?? []
  const rest = videos?.slice(3) ?? []

  function creatorName(v: VideoResult) {
    return v.profiles?.display_name ?? v.profiles?.username ?? '不明'
  }

  function posterUrl(v: VideoResult) {
    if (!v.thumbnail_path) return null
    return `${supabaseUrl}/storage/v1/object/public/thumbnails/${v.thumbnail_path}`
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* パンくず */}
      <div className="flex items-center gap-2 text-xs text-gray-600 mb-8">
        <Link href="/rounds" className="hover:text-gray-400">ラウンド</Link>
        <span>/</span>
        <Link href={`/rounds/${id}`} className="hover:text-gray-400">{round.title}</Link>
        <span>/</span>
        <span className="text-gray-500">結果発表</span>
      </div>

      {/* ヘッダー */}
      <div className="text-center mb-12">
        <p className="text-xs text-gray-600 uppercase tracking-[0.3em] mb-3">結果発表</p>
        <h1 className="font-bebas text-5xl md:text-7xl text-white tracking-wide mb-2">{round.title}</h1>
        <p className="text-arena-gold text-lg">テーマ: {round.theme}</p>
        {round.is_competition && (
          <span className="inline-block mt-3 text-xs text-arena-orange border border-arena-orange/40 px-3 py-1 uppercase tracking-widest">
            COMPETITION
          </span>
        )}
        {round.published_at && (
          <p className="text-gray-600 text-xs mt-3">
            {new Date(round.published_at).toLocaleDateString('ja-JP', {
              year: 'numeric', month: 'long', day: 'numeric',
            })} 発表
          </p>
        )}
      </div>

      {!videos?.length ? (
        <div className="text-center py-20 text-gray-600">結果データがありません</div>
      ) : (
        <>
          {/* 表彰台 TOP3 */}
          <div className="mb-16">
            <div className="flex items-end justify-center gap-2 md:gap-6">
              {/* 2位 */}
              {top3[1] && (
                <PodiumCard
                  video={top3[1]}
                  rank={2}
                  height="h-32 md:h-40"
                  posterUrl={posterUrl(top3[1])}
                  roundId={id}
                  isCompetition={round.is_competition}
                  creatorName={creatorName(top3[1])}
                />
              )}
              {/* 1位 */}
              {top3[0] && (
                <PodiumCard
                  video={top3[0]}
                  rank={1}
                  height="h-40 md:h-56"
                  posterUrl={posterUrl(top3[0])}
                  roundId={id}
                  isCompetition={round.is_competition}
                  creatorName={creatorName(top3[0])}
                />
              )}
              {/* 3位 */}
              {top3[2] && (
                <PodiumCard
                  video={top3[2]}
                  rank={3}
                  height="h-24 md:h-32"
                  posterUrl={posterUrl(top3[2])}
                  roundId={id}
                  isCompetition={round.is_competition}
                  creatorName={creatorName(top3[2])}
                />
              )}
            </div>
          </div>

          {/* 全順位リスト */}
          {rest.length > 0 && (
            <div className="space-y-px">
              <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">全順位</p>
              {rest.map((video) => (
                <RankRow
                  key={video.id}
                  video={video}
                  roundId={id}
                  isCompetition={round.is_competition}
                  creatorName={creatorName(video)}
                  posterUrl={posterUrl(video)}
                />
              ))}
            </div>
          )}

          {/* 全作品リンク */}
          <div className="mt-12 text-center">
            <Link
              href={`/rounds/${id}`}
              className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest border border-white/10 px-6 py-3 hover:border-white/20 transition-colors inline-block"
            >
              全作品を見る
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function PodiumCard({
  video,
  rank,
  height,
  posterUrl,
  roundId,
  isCompetition,
  creatorName,
}: {
  video: VideoResult
  rank: number
  height: string
  posterUrl: string | null
  roundId: string
  isCompetition: boolean
  creatorName: string
}) {
  const rankColor = rank === 1 ? 'text-arena-gold border-arena-gold/50' : rank === 2 ? 'text-gray-300 border-gray-300/30' : 'text-amber-700 border-amber-700/30'
  const podiumBg = rank === 1 ? 'bg-arena-gold/10' : rank === 2 ? 'bg-white/5' : 'bg-white/3'

  return (
    <Link
      href={`/rounds/${roundId}/videos/${video.id}`}
      className={`flex-1 max-w-[200px] flex flex-col items-center group`}
    >
      {/* 順位バッジ */}
      <div className={`font-bebas text-5xl md:text-6xl leading-none mb-2 ${rank === 1 ? 'text-arena-gold' : rank === 2 ? 'text-gray-400' : 'text-amber-700'}`}>
        {rank === 1 ? '👑' : rank}
      </div>

      {/* サムネイル */}
      <div className={`w-full aspect-video bg-white/5 overflow-hidden mb-2 border ${rankColor} group-hover:opacity-90 transition-opacity`}>
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">NO IMG</div>
        )}
      </div>

      {/* 台座 */}
      <div className={`w-full ${height} ${podiumBg} border border-t-0 ${rankColor} flex flex-col items-center justify-start pt-3 px-2`}>
        {/* スコア */}
        {video.final_score != null && (
          <p className={`font-bebas text-2xl md:text-3xl leading-none ${rank === 1 ? 'text-arena-gold' : 'text-white'}`}>
            {video.final_score.toFixed(1)}
          </p>
        )}
        {/* タイトル */}
        <p className="text-xs text-gray-300 text-center mt-1 line-clamp-2 leading-tight">{video.title}</p>
        {/* クリエイター */}
        <p className="text-[10px] text-gray-500 text-center mt-1 truncate w-full text-center">{creatorName}</p>
        {/* 審査員ボーナス */}
        {isCompetition && video.judge_bonus != null && video.judge_bonus > 0 && (
          <p className="text-[10px] text-arena-orange mt-1">+{video.judge_bonus} judge</p>
        )}
      </div>
    </Link>
  )
}

function RankRow({
  video,
  roundId,
  isCompetition,
  creatorName,
  posterUrl,
}: {
  video: VideoResult
  roundId: string
  isCompetition: boolean
  creatorName: string
  posterUrl: string | null
}) {
  return (
    <Link
      href={`/rounds/${roundId}/videos/${video.id}`}
      className="flex items-center gap-4 bg-white/2 hover:bg-white/5 border border-white/5 hover:border-white/10 px-4 py-3 transition-colors group"
    >
      {/* 順位 */}
      <span className="font-bebas text-2xl text-gray-500 w-8 text-center shrink-0">{video.rank}</span>

      {/* サムネイル */}
      <div className="w-14 h-8 bg-white/5 overflow-hidden shrink-0">
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-white/5" />
        )}
      </div>

      {/* タイトル・クリエイター */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm truncate group-hover:text-arena-gold transition-colors">{video.title}</p>
        <p className="text-gray-600 text-xs truncate">{creatorName}</p>
      </div>

      {/* スコア内訳 */}
      <div className="hidden md:flex items-center gap-4 text-xs shrink-0">
        {video.viewer_score != null && (
          <div className="text-center">
            <p className="text-gray-600">視聴者</p>
            <p className="text-gray-300">{video.viewer_score.toFixed(1)}</p>
          </div>
        )}
        {video.creator_score != null && (
          <div className="text-center">
            <p className="text-gray-600">評価</p>
            <p className="text-gray-300">{video.creator_score.toFixed(1)}</p>
          </div>
        )}
        {isCompetition && video.judge_bonus != null && (
          <div className="text-center">
            <p className="text-gray-600">審査員</p>
            <p className="text-arena-orange">+{video.judge_bonus.toFixed(1)}</p>
          </div>
        )}
      </div>

      {/* 最終スコア */}
      {video.final_score != null && (
        <div className="text-right shrink-0">
          <p className="font-bebas text-2xl text-arena-gold leading-none">{video.final_score.toFixed(1)}</p>
          <p className="text-[10px] text-gray-600">{video.total_votes}票</p>
        </div>
      )}
    </Link>
  )
}
