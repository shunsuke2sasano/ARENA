import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import VideoPlayerWithVote from '@/components/video/VideoPlayerWithVote'

type VoteType = 'good' | 'touched' | 'shook'

type VideoRow = {
  id: string; title: string; cloudflare_video_id: string; duration_seconds: number | null
  total_votes: number; votes_good: number; votes_touched: number; votes_shook: number
  viewer_score: number | null; creator_score: number | null; base_score: number | null
  final_score: number | null; rank: number | null; creator_id: string; created_at: string
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null
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

  // 動画取得
  const { data: video } = await supabase
    .from('videos')
    .select(`
      id, title, cloudflare_video_id, duration_seconds,
      total_votes, votes_good, votes_touched, votes_shook,
      viewer_score, creator_score, base_score, final_score, rank,
      creator_id, created_at,
      profiles (username, display_name, avatar_url)
    `)
    .eq('id', videoId)
    .eq('round_id', roundId)
    .returns<VideoRow[]>()
    .maybeSingle()

  if (!video) notFound()

  // ラウンド取得
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

  // 自分の投票を取得
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

  // 視聴者評価の仕訳（結果発表後のみ）
  const voteBreakdown = isPublished ? {
    good: video.votes_good,
    touched: video.votes_touched,
    shook: video.votes_shook,
    total: video.total_votes,
  } : null

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
        {/* メインカラム: プレイヤー */}
        <div className="lg:col-span-2 space-y-4">
          <VideoPlayerWithVote
            videoId={videoId}
            cloudflareVideoId={video.cloudflare_video_id}
            currentVote={myVote}
            isLoggedIn={!!user}
            canVote={!isOwn && (round.status === 'open' || round.status === 'reviewing' || isPublished)}
          />

          {/* 動画タイトル */}
          <div>
            <h1 className="text-xl text-white font-medium">{video.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {!isAnonymous && (
                <Link
                  href={`/creators/${profiles?.username}`}
                  className="hover:text-arena-gold transition-colors"
                >
                  {creatorDisplay}
                </Link>
              )}
              {isAnonymous && <span className="italic">匿名</span>}
              <span>{new Date(video.created_at).toLocaleDateString('ja-JP')}</span>
              {video.duration_seconds && (
                <span>{Math.floor(video.duration_seconds / 60)}:{(video.duration_seconds % 60).toString().padStart(2, '0')}</span>
              )}
            </div>
          </div>

          {/* 投票内訳（結果発表済のみ） */}
          {voteBreakdown && voteBreakdown.total > 0 && (
            <div className="border border-white/10 p-4 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest">視聴者反応</p>
              <div className="space-y-2">
                {[
                  { key: 'shook', label: '震えた ⚡', value: voteBreakdown.shook, color: 'bg-arena-gold' },
                  { key: 'touched', label: '刺さった 🎯', value: voteBreakdown.touched, color: 'bg-arena-orange' },
                  { key: 'good', label: '良かった 👍', value: voteBreakdown.good, color: 'bg-gray-500' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20">{item.label}</span>
                    <div className="flex-1 bg-white/5 h-2">
                      <div
                        className={`h-2 ${item.color} transition-all`}
                        style={{ width: `${voteBreakdown.total > 0 ? (item.value / voteBreakdown.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-8 text-right">{item.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-700">合計: {voteBreakdown.total}票</p>
            </div>
          )}
        </div>

        {/* サイドカラム: スコア・情報 */}
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
          {isPublished && (
            <div className="border border-white/10 p-4 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest">スコア内訳</p>
              {[
                { label: '視聴者 (60%)', value: video.viewer_score, color: 'bg-arena-gold' },
                { label: 'クリエイター (40%)', value: video.creator_score, color: 'bg-arena-orange' },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="text-white">{item.value?.toFixed(1) ?? '—'}</span>
                  </div>
                  <div className="w-full bg-white/5 h-1">
                    <div
                      className={`h-1 ${item.color}`}
                      style={{ width: `${item.value ?? 0}%` }}
                    />
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

          {/* 審査中の注意 */}
          {isAnonymous && (
            <div className="border border-yellow-400/20 bg-yellow-400/5 p-4 text-center">
              <p className="text-yellow-400 text-xs">匿名審査期間中</p>
              <p className="text-gray-600 text-xs mt-1">作者情報は結果発表まで非表示</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
