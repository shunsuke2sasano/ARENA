import Link from 'next/link'
import Image from 'next/image'

interface VideoCardProps {
  video: {
    id: string
    title: string
    storage_path: string
    thumbnail_path: string | null
    duration_seconds: number | null
    total_votes: number
    final_score: number | null
    base_score: number | null
    rank: number | null
    profiles: { username: string; display_name: string | null } | null
  }
  roundId: string
  isAnonymous: boolean
  isPublished: boolean
  supabaseUrl: string
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoCard({ video, roundId, isAnonymous, isPublished, supabaseUrl }: VideoCardProps) {
  const thumbnailUrl = video.thumbnail_path
    ? `${supabaseUrl}/storage/v1/object/public/thumbnails/${video.thumbnail_path}`
    : null

  const displayName = isAnonymous
    ? '匿名'
    : (video.profiles?.display_name ?? video.profiles?.username ?? '不明')

  const score = video.final_score ?? video.base_score

  return (
    <Link
      href={`/rounds/${roundId}/videos/${video.id}`}
      className="group bg-arena-black block overflow-hidden hover:bg-white/3 transition-colors"
    >
      {/* サムネイル */}
      <div className="relative aspect-video bg-white/5 overflow-hidden">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl opacity-20">🎬</div>
          </div>
        )}

        {/* 順位バッジ（結果発表済・Top3） */}
        {isPublished && video.rank && video.rank <= 3 && (
          <div className={`absolute top-2 left-2 font-bebas text-2xl w-10 h-10 flex items-center justify-center ${
            video.rank === 1 ? 'bg-arena-gold text-black' :
            video.rank === 2 ? 'bg-gray-300 text-black' :
            'bg-amber-600 text-black'
          }`}>
            {video.rank}
          </div>
        )}

        {/* 動画尺 */}
        {video.duration_seconds && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5">
            {formatDuration(video.duration_seconds)}
          </div>
        )}

        {/* 再生ボタン */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[18px] border-l-white ml-1" />
          </div>
        </div>
      </div>

      {/* メタ情報 */}
      <div className="p-3">
        <h3 className="text-white text-sm font-medium truncate group-hover:text-arena-gold transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <span className="text-gray-600 text-xs">
            {isAnonymous ? <span className="italic">匿名</span> : displayName}
          </span>
          {isPublished && score != null ? (
            <span className="font-bebas text-arena-gold text-lg leading-none">
              {score.toFixed(1)}
            </span>
          ) : !isPublished && video.total_votes > 0 ? (
            <span className="text-gray-700 text-xs">{video.total_votes}票</span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
