import { createClient } from '@supabase/supabase-js'

// サービスロールクライアント — RLSをバイパスする管理用操作にのみ使用
// サーバーサイドのみで使用すること（クライアントに露出禁止）
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
