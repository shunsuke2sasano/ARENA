import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()

  // 最新のオープン中ラウンドを取得
  type CurrentRound = {
    id: string
    title: string
    theme: string
    description: string | null
    submission_end: string
  }
  const { data: currentRound } = await supabase
    .from('rounds')
    .select('id, title, theme, description, submission_end')
    .eq('status', 'open')
    .order('submission_end', { ascending: true })
    .limit(1)
    .returns<CurrentRound[]>()
    .maybeSingle()

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      {/* ヒーローセクション */}
      <section className="text-center mb-20">
        <h1 className="font-bebas text-[clamp(4rem,12vw,9rem)] text-arena-gold leading-none tracking-widest mb-4">
          ARENA
        </h1>
        <p className="text-gray-400 text-lg mb-2">実写映像競技プラットフォーム</p>
        <p className="text-white/60 text-sm italic mb-10">
          「独りよがりでも、迎合でもない。伝わる強さで競う。」
        </p>

        <div className="flex justify-center gap-4 flex-wrap">
          {currentRound ? (
            <>
              <Link
                href={`/rounds/${currentRound.id}`}
                className="px-8 py-3 bg-arena-gold text-black font-bold uppercase tracking-widest hover:bg-yellow-400 transition-colors"
              >
                今月の作品を観る
              </Link>
              <Link
                href="/submit"
                className="px-8 py-3 border border-white/20 text-white uppercase tracking-widest hover:border-arena-gold hover:text-arena-gold transition-colors"
              >
                作品を投稿する
              </Link>
            </>
          ) : (
            <Link
              href="/rounds"
              className="px-8 py-3 bg-arena-gold text-black font-bold uppercase tracking-widest hover:bg-yellow-400 transition-colors"
            >
              ラウンドを見る
            </Link>
          )}
        </div>
      </section>

      {/* 現在のラウンド */}
      {currentRound && (
        <section className="mb-20">
          <div className="border border-arena-gold/30 bg-arena-gold/5 p-8">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs text-arena-gold uppercase tracking-widest mb-2">
                  現在開催中
                </div>
                <h2 className="font-bebas text-3xl text-white mb-1">{currentRound.title}</h2>
                <p className="text-gray-400">テーマ: <span className="text-arena-gold font-bold">{currentRound.theme}</span></p>
                {currentRound.description && (
                  <p className="text-gray-500 text-sm mt-2">{currentRound.description}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-600 uppercase tracking-widest mb-1">投稿期限</div>
                <div className="font-bebas text-2xl text-white">
                  {new Date(currentRound.submission_end).toLocaleDateString('ja-JP', {
                    month: 'long', day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3つのポイント */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 mb-20">
        {[
          {
            number: '01',
            title: '比較する',
            desc: '同じテーマで競われた作品を並べて観る。拡散数ではなく、作品そのものの力で評価される。',
          },
          {
            number: '02',
            title: '競技する',
            desc: '3層評価（視聴者・クリエイター・審査員）による明確なスコア。知名度ではなく一本の強さで順位が決まる。',
          },
          {
            number: '03',
            title: '蓄積する',
            desc: 'バッジ・スコア履歴・講評がポートフォリオとして残る。流れていくコンテンツではなく、競技作品として扱われる。',
          },
        ].map((item) => (
          <div key={item.number} className="bg-arena-black p-8">
            <div className="font-bebas text-5xl text-arena-gold/20 mb-4">{item.number}</div>
            <h3 className="font-bebas text-2xl text-white mb-3 tracking-wide">{item.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* 評価システム */}
      <section className="mb-20">
        <h2 className="font-bebas text-3xl text-white mb-8 tracking-wide">
          3層評価システム
        </h2>
        <div className="space-y-px">
          {[
            {
              layer: '一般視聴者評価',
              weight: '60%',
              desc: '良かった / 刺さった / 震えた の3択投票。再生後に自動表示。',
              color: 'text-arena-gold',
            },
            {
              layer: 'クリエイター相互評価',
              weight: '40%',
              desc: '5項目×5段階（引力・伝達力・完成度・独自性・余韻）。結果発表後に解禁。',
              color: 'text-arena-orange',
            },
            {
              layer: '審査員ボーナス',
              weight: '+15pts',
              desc: 'コンペ回のみ。フルルーブリック＋講評。ベーススコアへの加点。',
              color: 'text-white/60',
            },
          ].map((item) => (
            <div key={item.layer} className="flex items-center gap-6 bg-white/3 border border-white/5 px-6 py-4">
              <div className={`font-bebas text-2xl ${item.color} w-16 text-right flex-shrink-0`}>
                {item.weight}
              </div>
              <div>
                <div className="text-white text-sm font-medium mb-0.5">{item.layer}</div>
                <div className="text-gray-500 text-xs">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center border border-white/10 py-12 px-8">
        <p className="font-bebas text-3xl text-white mb-2 tracking-wide">
          あなたの作品、闘技場へ
        </p>
        <p className="text-gray-500 text-sm mb-6">
          実写・60〜180秒・月1テーマ。作品が強ければ、それで十分だ。
        </p>
        <Link
          href="/auth/register"
          className="inline-block px-10 py-3 bg-arena-gold text-black font-bold uppercase tracking-widest hover:bg-yellow-400 transition-colors"
        >
          無料で参戦する
        </Link>
      </section>
    </div>
  )
}
