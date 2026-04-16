import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import Header from '@/components/layout/Header'
import Marquee from '@/components/layout/Marquee'

const MARQUEE_TEXT = 'ARENA　独りよがりでも、迎合でもない。伝わる強さで競う。　実写映像競技プラットフォーム　'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminUser = user ? isAdmin(user.id) : false

  let username: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
    username = profile?.username ?? null
  }

  return (
    <>
      <Header user={user} isAdmin={adminUser} username={username} />
      <Marquee text={MARQUEE_TEXT} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-white/5 py-8 text-center text-xs text-gray-700">
        © 2025 ARENA — 実写映像競技プラットフォーム
      </footer>
    </>
  )
}
