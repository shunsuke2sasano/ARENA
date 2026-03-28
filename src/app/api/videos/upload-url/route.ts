import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Cloudflare Stream ダイレクトアップロードURL取得
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { roundId } = await request.json()
  if (!roundId) {
    return NextResponse.json({ error: 'roundId is required' }, { status: 400 })
  }

  // ラウンドが投稿受付中か確認
  const { data: round } = await supabase
    .from('rounds')
    .select('id, submission_end, status')
    .eq('id', roundId)
    .eq('status', 'open')
    .single()

  if (!round) {
    return NextResponse.json({ error: 'Round not found or not accepting submissions' }, { status: 400 })
  }

  if (new Date(round.submission_end) < new Date()) {
    return NextResponse.json({ error: 'Submission period has ended' }, { status: 400 })
  }

  // 既に投稿済みか確認
  const { data: existing } = await supabase
    .from('videos')
    .select('id')
    .eq('round_id', roundId)
    .eq('creator_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'You have already submitted a video for this round' }, { status: 400 })
  }

  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN

  if (!accountId || !apiToken) {
    return NextResponse.json({ error: 'Cloudflare Stream not configured' }, { status: 500 })
  }

  // Cloudflare Stream ダイレクトアップロードURLを取得
  const cfResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: 180,
        requireSignedURLs: false,
        allowedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? '*'],
        meta: {
          userId: user.id,
          roundId,
        },
      }),
    }
  )

  if (!cfResponse.ok) {
    const err = await cfResponse.text()
    console.error('Cloudflare Stream error:', err)
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }

  const cfData = await cfResponse.json()
  const { uid: videoId, uploadURL } = cfData.result

  return NextResponse.json({ videoId, uploadURL })
}
