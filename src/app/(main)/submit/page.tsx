import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VideoUploader from '@/components/video/VideoUploader'

export default async function SubmitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirectTo=/submit')
  }

  type OpenRound = { id: string; title: string; theme: string; submission_end: string }
  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, title, theme, submission_end')
    .eq('status', 'open')
    .gte('submission_end', new Date().toISOString())
    .order('submission_end', { ascending: true })
    .returns<OpenRound[]>()

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="font-bebas text-4xl text-white tracking-wide mb-1">作品を投稿する</h1>
        <p className="text-gray-500 text-sm">実写・60〜180秒・1ラウンドにつき1作品</p>
      </div>

      <VideoUploader rounds={rounds ?? []} userId={user.id} />
    </div>
  )
}
