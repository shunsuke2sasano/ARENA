import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { awardBadgesForRound } from '@/lib/badges'
import { NextResponse } from 'next/server'

// ステータス遷移の許可ルール: open → reviewing → published
const VALID_TRANSITIONS: Record<string, string> = {
  open: 'reviewing',
  reviewing: 'published',
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { status: newStatus } = await request.json()

  // 現在のステータスを取得
  const { data: round } = await supabase
    .from('rounds')
    .select('id, status')
    .eq('id', id)
    .single()

  if (!round) {
    return NextResponse.json({ error: 'Round not found' }, { status: 404 })
  }

  const allowedNext = VALID_TRANSITIONS[round.status as string]
  if (!allowedNext || allowedNext !== newStatus) {
    return NextResponse.json(
      { error: `Cannot transition from '${round.status}' to '${newStatus}'` },
      { status: 400 }
    )
  }

  const updateData: Record<string, unknown> = { status: newStatus }

  // published への遷移時にスコアを集計する
  if (newStatus === 'published') {
    updateData.published_at = new Date().toISOString()

    // 全動画のスコアを計算してDBに保存
    const { data: videos } = await supabase
      .from('videos')
      .select('id, votes_good, votes_touched, votes_shook, total_votes')
      .eq('round_id', id)

    if (videos && videos.length > 0) {
      for (const video of videos) {
        // 視聴者スコア: (平均点 - 1) ÷ 2 × 100
        let viewerScore: number | null = null
        if (video.total_votes > 0) {
          const avg = (video.votes_good * 1 + video.votes_touched * 2 + video.votes_shook * 3) / video.total_votes
          viewerScore = Math.round(((avg - 1) / 2) * 100 * 100) / 100
        }

        // クリエイタースコア: 5項目合計 ÷ 25 × 100
        const { data: evals } = await supabase
          .from('creator_evaluations')
          .select('attraction, transmission, completion, originality, afterglow')
          .eq('video_id', video.id)

        let creatorScore: number | null = null
        if (evals && evals.length > 0) {
          const totalPoints = evals.reduce((sum, e) =>
            sum + e.attraction + e.transmission + e.completion + e.originality + e.afterglow, 0)
          const avgPoints = totalPoints / evals.length
          creatorScore = Math.round((avgPoints / 25) * 100 * 100) / 100
        }

        // 審査員ボーナス
        const { data: judgeEvals } = await supabase
          .from('judge_evaluations')
          .select('bonus_score')
          .eq('video_id', video.id)

        const judgeBonus = judgeEvals && judgeEvals.length > 0
          ? judgeEvals.reduce((sum, j) => sum + j.bonus_score, 0) / judgeEvals.length
          : null

        // ベーススコア: 視聴者×0.6 + クリエイター×0.4
        let baseScore: number | null = null
        if (viewerScore != null || creatorScore != null) {
          const vs = viewerScore ?? 0
          const cs = creatorScore ?? 0
          // どちらかのみの場合も計算する
          if (viewerScore != null && creatorScore != null) {
            baseScore = Math.round((vs * 0.6 + cs * 0.4) * 100) / 100
          } else if (viewerScore != null) {
            baseScore = Math.round(vs * 100) / 100
          } else {
            baseScore = Math.round(cs * 100) / 100
          }
        }

        // 最終スコア: ベーススコア + 審査員ボーナス
        const finalScore = baseScore != null
          ? Math.round(((baseScore) + (judgeBonus ?? 0)) * 100) / 100
          : null

        await supabase
          .from('videos')
          .update({
            viewer_score: viewerScore,
            creator_score: creatorScore,
            judge_bonus: judgeBonus,
            base_score: baseScore,
            final_score: finalScore,
          })
          .eq('id', video.id)
      }

      // 順位を付ける（final_score DESC、null は最下位）
      const { data: scored } = await supabase
        .from('videos')
        .select('id, final_score')
        .eq('round_id', id)
        .order('final_score', { ascending: false, nullsFirst: false })

      if (scored) {
        for (let i = 0; i < scored.length; i++) {
          await supabase
            .from('videos')
            .update({ rank: i + 1 })
            .eq('id', scored[i].id)
        }
      }
    }
  }

  const { error } = await supabase
    .from('rounds')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Status update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // published への遷移後にバッジを自動付与
  if (newStatus === 'published') {
    try {
      await awardBadgesForRound(id)
    } catch (err) {
      // バッジ付与失敗はステータス更新の成否に影響させない
      console.error('Badge awarding error:', err)
    }
  }

  return NextResponse.json({ id, status: newStatus })
}
