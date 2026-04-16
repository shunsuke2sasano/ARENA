import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BadgeGrid from '@/components/profile/BadgeGrid'

export const revalidate = 60

type ProfileRow = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  theme_color: string
  created_at: string
}

type BadgeRow = {
  awarded_at: string
  video_id: string | null
  badges: { id: string; name: string; description: string; icon: string; category: string } | null
  videos: { rounds: { status: string } | null } | null
}

type VideoSummary = {
  id: string
  title: string
  final_score: number | null
  rank: number | null
  total_votes: number
  created_at: string
  rounds: { id: string; title: string; status: string } | null
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user: me } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, theme_color, created_at')
    .eq('username', username)
    .returns<ProfileRow[]>()
    .maybeSingle()

  if (!profile) notFound()

  const isOwn = me?.id === profile.id

  // バッジ取得（関連動画・ラウンドの status も取得して匿名審査中を除外）
  const { data: rawBadges } = await supabase
    .from('user_badges')
    .select(`
      awarded_at, video_id,
      badges (id, name, description, icon, category),
      videos (rounds (status))
    `)
    .eq('user_id', profile.id)
    .order('awarded_at', { ascending: false })
    .returns<BadgeRow[]>()

  // 匿名審査中のラウンドに紐づくバッジを非表示
  const badges = (rawBadges ?? []).filter((b) => {
    const roundStatus = b.videos?.rounds?.status
    return roundStatus !== 'reviewing'
  })

  // 公開済み動画サマリ
  const { data: videos } = await supabase
    .from('videos')
    .select('id, title, final_score, rank, total_votes, created_at, rounds (id, title, status)')
    .eq('creator_id', profile.id)
    .order('created_at', { ascending: false })
    .returns<VideoSummary[]>()

  const publishedVideos = (videos ?? []).filter((v) => v.rounds?.status === 'published')
  const totalVideos = (videos ?? []).length
  const bestScore = publishedVideos.reduce<number | null>((best, v) => {
    if (v.final_score == null) return best
    return best == null || v.final_score > best ? v.final_score : best
  }, null)
  const wins = publishedVideos.filter((v) => v.rank === 1).length

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const avatarUrl = profile.avatar_url
    ? `${supabaseUrl}/storage/v1/object/public/thumbnails/${profile.avatar_url}`
    : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* プロフィールヘッダー */}
      <div className="flex items-start gap-6 mb-10">
        <div className="w-20 h-20 rounded-full bg-white/10 overflow-hidden shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bebas text-3xl text-gray-500">
              {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bebas text-3xl text-white tracking-wide leading-tight">
            {profile.display_name ?? profile.username}
          </h1>
          <p className="text-gray-600 text-sm">@{profile.username}</p>
          {profile.bio && <p className="text-gray-400 text-sm mt-2">{profile.bio}</p>}
          <p className="text-gray-700 text-xs mt-2">
            {new Date(profile.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })} 入場
          </p>
        </div>
        {isOwn && (
          <Link
            href="/dashboard"
            className="shrink-0 text-xs text-gray-600 hover:text-gray-400 border border-white/5 hover:border-white/10 px-3 py-1.5 transition-colors uppercase tracking-widest"
          >
            ダッシュボード
          </Link>
        )}
      </div>

      {/* スタッツ */}
      <div className="grid grid-cols-4 gap-px bg-white/5 mb-10">
        {[
          { label: '参加',     value: totalVideos,            unit: '回' },
          { label: '最高点',   value: bestScore?.toFixed(1),  unit: bestScore != null ? 'pts' : undefined },
          { label: '優勝',     value: wins,                   unit: '回' },
          { label: 'バッジ',   value: badges.length,          unit: '個' },
        ].map((s) => (
          <div key={s.label} className="bg-[#09080c] p-4 text-center">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">{s.label}</p>
            <p className="font-bebas text-3xl text-white leading-none">
              {s.value ?? '—'}<span className="text-sm text-gray-600 ml-0.5">{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* バッジグリッド */}
      <div className="mb-10">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">獲得バッジ</p>
        {badges.length === 0 ? (
          <div className="border border-white/5 py-10 text-center text-gray-700 text-xs">
            まだバッジがありません
          </div>
        ) : (
          <BadgeGrid badges={badges.map((b) => ({
            name:        b.badges?.name ?? '',
            description: b.badges?.description ?? '',
            icon:        b.badges?.icon ?? '',
            category:    b.badges?.category ?? '',
            awarded_at:  b.awarded_at,
          }))} />
        )}
      </div>

      {/* 公開済み作品 */}
      {publishedVideos.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">戦績</p>
          <div className="space-y-px">
            {publishedVideos.map((video) => (
              <Link
                key={video.id}
                href={`/rounds/${video.rounds?.id}/videos/${video.id}`}
                className="flex items-center gap-4 bg-white/2 hover:bg-white/5 border border-white/5 hover:border-white/10 px-4 py-3 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate group-hover:text-arena-gold transition-colors">
                    {video.title}
                  </p>
                  <p className="text-gray-600 text-xs">{video.rounds?.title}</p>
                </div>
                <div className="flex items-center gap-4 text-right shrink-0">
                  {video.rank != null && (
                    <span className={`text-xs ${video.rank === 1 ? 'text-arena-gold font-bebas text-lg leading-none' : 'text-gray-600'}`}>
                      {video.rank}位
                    </span>
                  )}
                  {video.final_score != null && (
                    <span className="font-bebas text-xl text-arena-gold leading-none">
                      {video.final_score.toFixed(1)}
                    </span>
                  )}
                  <span className="text-xs text-gray-700">{video.total_votes}票</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
