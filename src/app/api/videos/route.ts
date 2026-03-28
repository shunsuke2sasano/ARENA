import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 動画メタデータをSupabaseに保存
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { roundId, title, cloudflareVideoId } = await request.json()

  if (!roundId || !title || !cloudflareVideoId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (title.length < 1 || title.length > 100) {
    return NextResponse.json({ error: 'Title must be 1-100 characters' }, { status: 400 })
  }

  // Cloudflare Streamで動画の状態を確認
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN

  if (accountId && apiToken) {
    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cloudflareVideoId}`,
      {
        headers: { 'Authorization': `Bearer ${apiToken}` },
      }
    )

    if (!cfResponse.ok) {
      return NextResponse.json({ error: 'Video not found in Cloudflare Stream' }, { status: 400 })
    }

    const cfData = await cfResponse.json()
    const video = cfData.result

    // まだ処理中でも登録は許可（サムネイルは後で更新される）
    const thumbnailUrl = video.thumbnail ?? null
    const duration = video.duration ? Math.round(video.duration) : null

    const { data, error } = await supabase
      .from('videos')
      .insert({
        round_id: roundId,
        creator_id: user.id,
        title,
        cloudflare_video_id: cloudflareVideoId,
        cloudflare_thumbnail_url: thumbnailUrl,
        duration_seconds: duration,
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'You have already submitted a video for this round' }, { status: 400 })
      }
      console.error('DB insert error:', error)
      return NextResponse.json({ error: 'Failed to save video' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  }

  // Cloudflare未設定の場合（開発環境）
  const { data, error } = await supabase
    .from('videos')
    .insert({
      round_id: roundId,
      creator_id: user.id,
      title,
      cloudflare_video_id: cloudflareVideoId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('DB insert error:', error)
    return NextResponse.json({ error: 'Failed to save video' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
