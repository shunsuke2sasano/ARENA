import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-arena-black px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-bebas text-6xl text-arena-gold tracking-widest">ARENA</h1>
          <p className="text-gray-500 text-sm mt-1">実写映像競技プラットフォーム</p>
        </div>
        <div className="border border-white/10 bg-white/2 p-8">
          <h2 className="font-bebas text-2xl text-white mb-6 uppercase tracking-wide">
            新規登録
          </h2>
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}
