import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardContent from '@/components/dashboard/DashboardContent'

export const revalidate = 60

type VideoRow = {
  id: string
  title: string
  final_score: number | null
  viewer_score: number | null
  creator_score: number | null
  judge_bonus: number | null
  base_score: number | null
  rank: number | null
  total_votes: number
  votes_good: number
  votes_touched: number
  votes_shook: number
  created_at: string
  rounds: {
    id: string
    title: string
    theme: string
    status: string
    published_at: string | null
    submission_end: string
  } | null
}

type EvalRow = {
  video_id: string
  attraction: number
  transmission: number
  completion: number
  originality: number
  afterglow: number
}

export type VideoStats = VideoRow & {
  eval_avg: {
    attraction: number
    transmission: number
    completion: number
    originality: number
    afterglow: number
    count: number
  } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?redirectTo=/dashboard')

  // ユーザーの全動画
  const { data: videos } = await supabase
    .from('videos')
    .select(`
      id, title,
      final_score, viewer_score, creator_score, judge_bonus, base_score,
      rank, total_votes, votes_good, votes_touched, votes_shook,
      created_at,
      rounds (id, title, theme, status, published_at, submission_end)
    `)
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })
    .returns<VideoRow[]>()

  const videoIds = (videos ?? []).map((v) => v.id)

  // 全動画のクリエイター評価を一括取得
  const { data: allEvals } = videoIds.length
    ? await supabase
        .from('creator_evaluations')
        .select('video_id, attraction, transmission, completion, originality, afterglow')
        .in('video_id', videoIds)
        .returns<EvalRow[]>()
    : { data: [] as EvalRow[] }

  // video_id ごとに平均値を集計
  const evalMap = new Map<string, { sum: Record<string, number>; count: number }>()
  for (const e of allEvals ?? []) {
    const entry = evalMap.get(e.video_id)
    const items = { attraction: e.attraction, transmission: e.transmission, completion: e.completion, originality: e.originality, afterglow: e.afterglow }
    if (entry) {
      entry.count++
      for (const k of Object.keys(items) as (keyof typeof items)[]) {
        entry.sum[k] = (entry.sum[k] ?? 0) + items[k]
      }
    } else {
      evalMap.set(e.video_id, { sum: { ...items }, count: 1 })
    }
  }

  const videosWithStats: VideoStats[] = (videos ?? []).map((v) => {
    const entry = evalMap.get(v.id)
    if (!entry) return { ...v, eval_avg: null }
    const { sum, count } = entry
    return {
      ...v,
      eval_avg: {
        attraction:   Math.round((sum.attraction   / count) * 10) / 10,
        transmission: Math.round((sum.transmission / count) * 10) / 10,
        completion:   Math.round((sum.completion   / count) * 10) / 10,
        originality:  Math.round((sum.originality  / count) * 10) / 10,
        afterglow:    Math.round((sum.afterglow     / count) * 10) / 10,
        count,
      },
    }
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="font-bebas text-4xl text-white tracking-wide">ダッシュボード</h1>
        <p className="text-gray-600 text-sm mt-1">あなたの作品の戦績</p>
      </div>

      {!videosWithStats.length ? (
        <div className="text-center py-20 border border-white/5 text-gray-600">
          <p>まだ作品がありません</p>
        </div>
      ) : (
        <DashboardContent videos={videosWithStats} />
      )}
    </div>
  )
}
