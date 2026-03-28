export default function Marquee({ text }: { text: string }) {
  const repeated = Array(10).fill(text).join('　　')
  return (
    <div className="overflow-hidden border-y border-white/5 py-2 bg-white/2">
      <div className="flex">
        <div className="marquee-track text-xs text-gray-600 uppercase tracking-widest">
          {repeated}&nbsp;&nbsp;&nbsp;{repeated}
        </div>
      </div>
    </div>
  )
}
