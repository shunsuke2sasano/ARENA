import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import EvaluateForm from '@/components/video/EvaluateForm'

type VideoRow = {
  id: string
  title: string
  creator_id: string
  profiles: { username: string; display_name: string | null } | null
}

type RoundRow = {
  id: string
  title: string
  status: string
}

type EvalRow = {
  attraction: number
  transmission: number
  completion: number
  originality: number
  afterglow: number
  comment: string | null
}

export default async function EvaluatePage({
  params,
}: {
  params: Promise<{ id: string; videoId: string }>
}) {
  const { id: roundId, videoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?redirectTo=/rounds/${roundId}/videos/${videoId}/evaluate`)
  }

  // is_creator チェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_creator')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_creator) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="font-bebas text-3xl text-gray-500 tracking-wide mb-4">
          動画を投稿するとクリエイター評価が解放されます
        </p>
        <Link
          href={`/rounds/${roundId}/videos/${videoId}`}
          className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest"
        >
          ← 作品に戻る
        </Link>
      </div>
    )
  }

  const { data: round } = await supabase
    .from('rounds')
    .select('id, title, status')
    .eq('id', roundId)
    .returns<RoundRow[]>()
    .maybeSingle()

  if (!round) notFound()

  if (round.status !== 'published') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="font-bebas text-3xl text-gray-500 tracking-wide mb-4">
          結果発表後に評価できます
        </p>
        <Link
          href={`/rounds/${roundId}/videos/${videoId}`}
          className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest"
        >
          ← 作品に戻る
        </Link>
      </div>
    )
  }

  const { data: video } = await supabase
    .from('videos')
    .select('id, title, creator_id, profiles (username, display_name)')
    .eq('id', videoId)
    .eq('round_id', roundId)
    .returns<VideoRow[]>()
    .maybeSingle()

  if (!video) notFound()

  if (video.creator_id === user.id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="font-bebas text-3xl text-gray-500 tracking-wide mb-4">
          自分の作品は評価できません
        </p>
        <Link
          href={`/rounds/${roundId}/videos/${videoId}`}
          className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest"
        >
          ← 作品に戻る
        </Link>
      </div>
    )
  }

  // 既存の評価を取得
  const { data: existing } = await supabase
    .from('creator_evaluations')
    .select('attraction, transmission, completion, originality, afterglow, comment')
    .eq('video_id', videoId)
    .eq('evaluator_id', user.id)
    .returns<EvalRow[]>()
    .maybeSingle()

  const creatorName = video.profiles?.display_name ?? video.profiles?.username ?? '不明'

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* パンくず */}
      <div className="flex items-center gap-2 text-xs text-gray-600 mb-8">
        <Link href="/rounds" className="hover:text-gray-400">ラウンド</Link>
        <span>/</span>
        <Link href={`/rounds/${roundId}`} className="hover:text-gray-400">{round.title}</Link>
        <span>/</span>
        <Link href={`/rounds/${roundId}/videos/${videoId}`} className="hover:text-gray-400 truncate max-w-[120px]">
          {video.title}
        </Link>
        <span>/</span>
        <span className="text-gray-500">評価</span>
      </div>

      {/* ヘッダー */}
      <div className="mb-8">
        <p className="text-xs text-gray-600 italic mb-2">「作品を見ろ。顔を見るな。」</p>
        <h1 className="font-bebas text-3xl text-white tracking-wide">{video.title}</h1>
        <p className="text-gray-500 text-sm mt-1">by {creatorName}</p>
      </div>

      <EvaluateForm
        videoId={videoId}
        roundId={roundId}
        existing={existing ?? null}
      />
    </div>
  )
}
