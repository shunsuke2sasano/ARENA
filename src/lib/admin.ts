/**
 * 管理者判定
 * 環境変数 ADMIN_USER_IDS にカンマ区切りでSupabase UIDを設定する
 * 例: ADMIN_USER_IDS=uuid-1,uuid-2
 */
export function isAdmin(userId: string): boolean {
  const adminIds = process.env.ADMIN_USER_IDS
  if (!adminIds) return false
  return adminIds.split(',').map((id) => id.trim()).includes(userId)
}
