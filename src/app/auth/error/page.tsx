import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-arena-black">
      <div className="text-center space-y-4">
        <h1 className="font-bebas text-4xl text-arena-gold">認証エラー</h1>
        <p className="text-gray-400">認証処理中にエラーが発生しました。</p>
        <Link
          href="/auth/login"
          className="inline-block mt-4 px-6 py-2 bg-arena-gold text-black font-bold hover:bg-yellow-400 transition-colors"
        >
          ログインに戻る
        </Link>
      </div>
    </div>
  )
}
