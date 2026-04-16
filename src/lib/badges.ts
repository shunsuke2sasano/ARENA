import { createAdminClient } from './supabase/admin'

type AwardRow = { user_id: string; badge_id: string; video_id: string }

/**
 * ラウンドが published になった直後に呼び出す。
 * 対象ラウンドに参加した全クリエイターのバッジを判定・付与する。
 */
export async function awardBadgesForRound(roundId: string): Promise<void> {
  const admin = createAdminClient()

  // バッジマスタ（name → id）
  const { data: badgeDefs } = await admin.from('badges').select('id, name')
  if (!badgeDefs?.length) return
  const badgeId = Object.fromEntries(badgeDefs.map((b) => [b.name as string, b.id as string]))

  // ラウンド情報
  const { data: round } = await admin
    .from('rounds')
    .select('id, is_competition, submission_end')
    .eq('id', roundId)
    .single()
  if (!round) return

  // このラウンドの全動画
  const { data: roundVideos } = await admin
    .from('videos')
    .select('id, creator_id, final_score, judge_bonus, rank')
    .eq('round_id', roundId)
  if (!roundVideos?.length) return

  const creatorIds = [...new Set(roundVideos.map((v) => v.creator_id as string))]

  // 既付与バッジ（重複防止）
  const { data: existing } = await admin
    .from('user_badges')
    .select('user_id, badge_id')
    .in('user_id', creatorIds)
  const alreadyHas = (uid: string, bid: string) =>
    existing?.some((e) => e.user_id === uid && e.badge_id === bid) ?? false

  const toInsert: AwardRow[] = []
  const pendingKeys = new Set<string>()

  function award(userId: string, name: string, videoId: string) {
    const bid = badgeId[name]
    if (!bid) return
    const key = `${userId}:${bid}`
    if (alreadyHas(userId, bid) || pendingKeys.has(key)) return
    pendingKeys.add(key)
    toInsert.push({ user_id: userId, badge_id: bid, video_id: videoId })
  }

  // ─── 行動系・スコア系（クリエイターごとに判定） ───────────────────────────
  for (const video of roundVideos) {
    const uid = video.creator_id as string

    // このクリエイターの全published動画（時系列）
    const { data: history } = await admin
      .from('videos')
      .select('id, final_score, created_at, rounds!inner(status)')
      .eq('creator_id', uid)
      .eq('rounds.status', 'published')
      .order('created_at', { ascending: true })

    const published = (history ?? []) as Array<{ id: string; final_score: number | null; created_at: string }>
    const count = published.length

    // 行動系
    if (count === 1)  award(uid, '初陣',    video.id)
    if (count === 5)  award(uid, '5回戦士', video.id)
    if (count === 10) award(uid, '10回戦士', video.id)

    // スコア系: 初の80点超え
    const score = video.final_score as number | null
    if (score != null && score >= 80) {
      const hadBefore = published
        .filter((v) => v.id !== (video.id as string))
        .some((v) => v.final_score != null && v.final_score >= 80)
      if (!hadBefore) award(uid, '初の80点超え', video.id)
    }

    // スコア系: 連続上昇（直近3作品のスコアが厳密に上昇）
    if (count >= 3) {
      const last3 = published.slice(-3).map((v) => v.final_score)
      if (
        last3.every((s) => s != null) &&
        (last3[0] as number) < (last3[1] as number) &&
        (last3[1] as number) < (last3[2] as number)
      ) {
        award(uid, '連続上昇', video.id)
      }
    }

    // 特別系: コンペ優勝
    if (round.is_competition && (video.rank as number) === 1) {
      award(uid, 'コンペ優勝', video.id)
    }
  }

  // ─── 項目系（ラウンド内でトップのビデオに授与） ────────────────────────────
  const videoIds = roundVideos.map((v) => v.id as string)
  const { data: evals } = await admin
    .from('creator_evaluations')
    .select('video_id, attraction, transmission, completion, originality, afterglow')
    .in('video_id', videoIds)

  if (evals?.length) {
    // ビデオごとに各項目の合計・件数を集計
    type EvalAcc = { sum: Record<string, number>; count: number }
    const acc = new Map<string, EvalAcc>()
    for (const e of evals) {
      const vid = e.video_id as string
      const entry = acc.get(vid)
      if (entry) {
        entry.count++
        for (const k of ['attraction', 'transmission', 'completion', 'originality', 'afterglow']) {
          entry.sum[k] = (entry.sum[k] ?? 0) + (e[k as keyof typeof e] as number)
        }
      } else {
        acc.set(vid, {
          count: 1,
          sum: { attraction: e.attraction as number, transmission: e.transmission as number,
                 completion: e.completion as number, originality: e.originality as number,
                 afterglow: e.afterglow as number },
        })
      }
    }

    const avg = (vid: string, key: string) => {
      const entry = acc.get(vid)
      if (!entry) return 0
      return entry.sum[key] / entry.count
    }

    // ラウンド内で各項目トップのビデオを特定
    const topFor = (key: string) =>
      videoIds
        .filter((vid) => acc.has(vid))
        .reduce((best, vid) => (avg(vid, key) > avg(best, key) ? vid : best), videoIds[0])

    // 引力の帝王 — attraction トップ
    const topAttraction = topFor('attraction')
    if (acc.has(topAttraction)) {
      const creator = roundVideos.find((v) => v.id === topAttraction)?.creator_id as string
      award(creator, '引力の帝王', topAttraction)
    }

    // 独自性の鬼 — originality トップ
    const topOriginality = topFor('originality')
    if (acc.has(topOriginality)) {
      const creator = roundVideos.find((v) => v.id === topOriginality)?.creator_id as string
      award(creator, '独自性の鬼', topOriginality)
    }

    // 余韻の王 — afterglow トップ
    const topAfterglow = topFor('afterglow')
    if (acc.has(topAfterglow)) {
      const creator = roundVideos.find((v) => v.id === topAfterglow)?.creator_id as string
      award(creator, '余韻の王', topAfterglow)
    }
  }

  // ─── 特別系: 審査員特別賞（コンペ回・最高judge_bonus） ─────────────────────
  if (round.is_competition) {
    const topJudge = [...roundVideos]
      .filter((v) => v.judge_bonus != null && (v.judge_bonus as number) > 0)
      .sort((a, b) => (b.judge_bonus as number) - (a.judge_bonus as number))[0]
    if (topJudge) {
      award(topJudge.creator_id as string, '審査員特別賞', topJudge.id as string)
    }
  }

  // ─── 一括INSERT ──────────────────────────────────────────────────────────────
  if (toInsert.length > 0) {
    await admin.from('user_badges').insert(toInsert)
  }
}
