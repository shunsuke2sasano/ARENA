import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 動画メタデータをSupabaseに保存
// ※ ファイル本体はブラウザから直接Supabase Storageへアップロード済み
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { roundId, title, storagePath, thumbnailPath, durationSeconds } = await request.json()

  if (!roundId || !title || !storagePath) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (title.length < 1 || title.length > 100) {
    return NextResponse.json({ error: 'Title must be 1-100 characters' }, { status: 400 })
  }

  // ラウンドが投稿受付中か確認
  const { data: round } = await supabase
    .from('rounds')
    .select('id, submission_end, status')
    .eq('id', roundId)
    .eq('status', 'open')
    .maybeSingle()

  if (!round) {
    return NextResponse.json({ error: 'Round not found or not accepting submissions' }, { status: 400 })
  }

  if (new Date(round.submission_end) < new Date()) {
    return NextResponse.json({ error: 'Submission period has ended' }, { status: 400 })
  }

  // storagePath がそのユーザーのパスか確認（rounds/{roundId}/{userId}/...）
  const expectedPrefix = `rounds/${roundId}/${user.id}/`
  if (!storagePath.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('videos')
    .insert({
      round_id: roundId,
      creator_id: user.id,
      title,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath ?? null,
      duration_seconds: durationSeconds ?? null,
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
