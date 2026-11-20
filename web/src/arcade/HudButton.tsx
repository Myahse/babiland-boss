// The round buttons down the left of the screen, as in mobile games: a picture in a circle, its name small
// underneath, a red badge when something waits.
export function RoundButton({ icon, label, color, badge, glow, onClick }: { icon: string; label: string; color: string; badge?: string | number | null; glow?: boolean; onClick: () => void }) {
  return (
    <button className="pointer-events-auto flex w-[54px] flex-col items-center active:translate-y-0.5" onPointerDown={(e) => e.stopPropagation()} onClick={onClick} aria-label={label}>
      <span className={`relative grid h-12 w-12 place-items-center rounded-full border-[3px] border-white text-[22px] shadow-[0_3px_0_rgba(0,0,0,.28)] ${glow ? 'vip-glow' : ''}`} style={{ background: color }}>
        {icon}
        {badge !== undefined && badge !== null && badge !== 0 && (
          <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-[#e03131] px-1 text-[10px] leading-none font-extrabold text-white">{badge}</span>
        )}
      </span>
      <span className="mt-0.5 rounded-full bg-[#2b1a12]/55 px-1.5 text-[10px] leading-[15px] font-extrabold whitespace-nowrap text-white">{label}</span>
    </button>
  )
}
