const PF = { fontFamily: "'Press Start 2P', cursive" }

function Heart({ filled }) {
  return (
    <span style={{ fontSize: '1rem', filter: filled ? 'none' : 'grayscale(1) opacity(0.3)' }}>
      ❤️
    </span>
  )
}

export default function StatsBar({ playerName, level = 1, xp = 0, maxXp = 100, hp = 3, maxHp = 3 }) {
  const xpPct = Math.min(100, (xp / maxXp) * 100)

  return (
    <div
      className="w-full bg-[#0d0d1a] border-b-4 border-yellow-900 px-4 py-3 flex items-center justify-between gap-4 flex-wrap"
      style={{ boxShadow: '0 4px 0 #1a0a00' }}
    >
      {/* Left: avatar + name + level */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-yellow-400 border-2 border-yellow-600 flex items-center justify-center text-sm shrink-0"
          style={{ imageRendering: 'pixelated' }}>
          🧙
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-yellow-300 truncate max-w-[140px]" style={{ ...PF, fontSize: '0.45rem' }}>
            {playerName.toUpperCase().slice(0, 20)}
          </div>
          <div className="text-gray-500" style={{ ...PF, fontSize: '0.35rem' }}>
            LVL {level}
          </div>
        </div>
      </div>

      {/* Center: XP bar */}
      <div className="flex flex-col gap-1 flex-1 min-w-[100px] max-w-[200px]">
        <div className="flex justify-between">
          <span className="text-blue-400" style={{ ...PF, fontSize: '0.35rem' }}>XP</span>
          <span className="text-gray-500" style={{ ...PF, fontSize: '0.35rem' }}>{xp}/{maxXp}</span>
        </div>
        <div className="w-full h-2 bg-gray-800 border border-gray-700">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>

      {/* Right: HP hearts */}
      <div className="flex items-center gap-1">
        <span className="text-gray-500 mr-1" style={{ ...PF, fontSize: '0.35rem' }}>HP</span>
        {Array.from({ length: maxHp }).map((_, i) => (
          <Heart key={i} filled={i < hp} />
        ))}
      </div>
    </div>
  )
}
