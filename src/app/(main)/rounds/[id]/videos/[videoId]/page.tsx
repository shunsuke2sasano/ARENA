import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import VideoPlayerWithVote from '@/components/video/VideoPlayerWithVote'

type VoteType = 'good' | 'touched' | 'shook'

type VideoRow = {
  id: string; title: string; storage_path: string; thumbnail_path: string | null
  duration_seconds: number | null
  total_votes: number; votes_good: number; votes_touched: number; votes_shook: number
  viewer_score: number | null; creator_score: number | null
  base_score: number | null; final_score: number | null
  rank: number | null; creator_id: string; created_at: string
  profiles: { username: string; display_name: string | null } | null
}

type RoundRow = {
  id: string; title: string; theme: string; status: string
  is_competition: boolean; submission_end: string
}

type VoteRow = { vote_type: string }

export const revalidate = 30

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string; videoId: string }>
}) {
  const { id: roundId, videoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const { data: video } = await supabase
    .from('videos')
    .select(`
      id, title, storage_path, thumbnail_path, duration_seconds,
      total_votes, votes_good, votes_touched, votes_shook,
      viewer_score, creator_score, base_score, final_score, rank,
      creator_id, created_at,
      profiles (username, display_name)
    `)
    .eq('id', videoId)
    .eq('round_id', roundId)
    .returns<VideoRow[]>()
    .maybeSingle()

  if (!video) notFound()

  const { data: round } = await supabase
    .from('rounds')
    .select('id, title, theme, status, is_competition, submission_end')
    .eq('id', roundId)
    .returns<RoundRow[]>()
    .maybeSingle()

  if (!round) notFound()

  const isAnonymous = round.status === 'reviewing'
  const isPublished = round.status === 'published'
  const isOwn = user?.id === video.creator_id

  let myVote: VoteType | null = null
  if (user) {
    const { data: voteData } = await supabase
      .from('viewer_votes')
      .select('vote_type')
      .eq('video_id', videoId)
      .eq('voter_id', user.id)
      .returns<VoteRow[]>()
      .maybeSingle()
    if (voteData) myVote = voteData.vote_type as VoteType
  }

  // Supabase Storage の公開URL
  const videoUrl = `${supabaseUrl}/storage/v1/object/public/videos/${video.storage_path}`
  const posterUrl = video.thumbnail_path
    ? `${supabaseUrl}/storage/v1/object/public/thumbnails/${video.thumbnail_path}`
    : undefined

  const profiles = video.profiles
  const creatorDisplay = isAnonymous ? '匿名' : (profiles?.display_name ?? profiles?.username ?? '不明')

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* パンくず */}
      <div className="flex items-center gap-2 text-xs text-gray-600 mb-6">
        <Link href="/rounds" className="hover:text-gray-400">ラウンド</Link>
        <span>/</span>
        <Link href={`/rounds/${roundId}`} className="hover:text-gray-400">{round.title}</Link>
        <span>/</span>
        <span className="text-gray-500 truncate max-w-[200px]">{video.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* プレイヤー */}
        <div className="lg:col-span-2 space-y-4">
          <VideoPlayerWithVote
            videoId={videoId}
            videoUrl={videoUrl}
            posterUrl={posterUrl}
            currentVote={myVote}
            isLoggedIn={!!user}
            canVote={!isOwn}
            isPublished={isPublished}
            totalVotes={video.total_votes}
            votesGood={video.votes_good}
            votesTouched={video.votes_touched}
            votesShook={video.votes_shook}
          />

          <div>
            <h1 className="text-xl text-white font-medium">{video.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {isAnonymous ? (
                <span className="italic">匿名</span>
              ) : (
                <span>{creatorDisplay}</span>
              )}
              <span>{new Date(video.created_at).toLocaleDateString('ja-JP')}</span>
              {video.duration_seconds && (
                <span>
                  {Math.floor(video.duration_seconds / 60)}:{(video.duration_seconds % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>
          </div>

        </div>

        {/* サイドバー */}
        <div className="space-y-4">
          {/* スコア（結果発表済のみ） */}
          {isPublished && video.final_score != null && (
            <div className="border border-arena-gold/30 bg-arena-gold/5 p-6 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">最終スコア</p>
              <p className="font-bebas text-6xl text-arena-gold leading-none">
                {video.final_score.toFixed(1)}
              </p>
              {video.rank && (
                <p className="text-gray-400 text-sm mt-2">
                  <span className="font-bebas text-2xl text-white mr-1">{video.rank}</span>位
                </p>
              )}
            </div>
          )}

          {/* スコア内訳 */}
          {isPublished && (video.viewer_score != null || video.creator_score != null) && (
            <div className="border border-white/10 p-4 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest">スコア内訳</p>
              {[
                { label: '視聴者 (60%)',      value: video.viewer_score,  color: 'bg-arena-gold' },
                { label: 'クリエイター (40%)', value: video.creator_score, color: 'bg-arena-orange' },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="text-white">{item.value?.toFixed(1) ?? '—'}</span>
                  </div>
                  <div className="w-full bg-white/5 h-1">
                    <div className={`h-1 ${item.color}`} style={{ width: `${item.value ?? 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ラウンド情報 */}
          <div className="border border-white/10 p-4 space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-widest">ラウンド</p>
            <Link href={`/rounds/${roundId}`} className="text-white hover:text-arena-gold transition-colors block">
              {round.title}
            </Link>
            <p className="text-arena-gold text-sm">テーマ: {round.theme}</p>
          </div>

          {/* 匿名審査中バナー */}
          {isAnonymous && (
            <div className="border border-yellow-400/20 bg-yellow-400/5 p-4 text-center">
              <p className="text-yellow-400 text-xs font-medium">匿名審査期間中</p>
              <p className="text-gray-600 text-xs mt-1">作者情報は結果発表まで非表示</p>
              <p className="text-gray-700 text-xs mt-2 italic">クリエイター相互評価は結果発表後に解禁</p>
            </div>
          )}

          {/* クリエイター相互評価ボタン（結果発表後・他者の動画のみ） */}
          {isPublished && !isOwn && user && (
            <Link
              href={`/rounds/${roundId}/videos/${videoId}/evaluate`}
              className="block text-center border border-arena-orange/40 text-arena-orange text-xs px-4 py-3 hover:bg-arena-orange/10 transition-colors uppercase tracking-widest"
            >
              クリエイターとして評価する
            </Link>
          )}
          {isPublished && !isOwn && !user && (
            <Link
              href={`/auth/login?redirectTo=/rounds/${roundId}/videos/${videoId}/evaluate`}
              className="block text-center border border-white/10 text-gray-600 text-xs px-4 py-3 hover:border-white/20 transition-colors"
            >
              ログインしてクリエイター評価
            </Link>
          )}

          {/* 自分の動画 */}
          {isOwn && (
            <div className="border border-white/10 p-4 text-center">
              <p className="text-xs text-gray-500">あなたの作品</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
