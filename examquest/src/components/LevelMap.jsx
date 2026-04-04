import StatsBar from './StatsBar'

const PF = { fontFamily: "'Press Start 2P', cursive" }

const CHAPTER_COLORS = [
  { bg: '#1a2e1a', border: '#22c55e', text: '#86efac', glow: '#22c55e' },
  { bg: '#1a1a2e', border: '#818cf8', text: '#c7d2fe', glow: '#818cf8' },
  { bg: '#2e1a2e', border: '#e879f9', text: '#f5d0fe', glow: '#e879f9' },
  { bg: '#2e1e1a', border: '#f97316', text: '#fed7aa', glow: '#f97316' },
  { bg: '#1a2a2e', border: '#22d3ee', text: '#a5f3fc', glow: '#22d3ee' },
  { bg: '#2e2a1a', border: '#fbbf24', text: '#fde68a', glow: '#fbbf24' },
]

function ChapterNode({ chapter, index, unlocked, isLast }) {
  const color = CHAPTER_COLORS[index % CHAPTER_COLORS.length]

  return (
    <div className="flex flex-col items-center">
      {/* Connector line above (skip for first) */}
      {index > 0 && (
        <div className="flex flex-col items-center gap-[3px] py-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="w-[3px] h-[6px]"
              style={{ backgroundColor: unlocked ? color.border : '#374151', opacity: unlocked ? 0.6 : 0.3 }}
            />
          ))}
        </div>
      )}

      {/* Node card */}
      <div
        className="relative w-full max-w-sm border-4 p-4 transition-all duration-200 select-none"
        style={{
          backgroundColor: color.bg,
          borderColor: unlocked ? color.border : '#374151',
          boxShadow: unlocked ? `0 0 16px ${color.glow}44, 4px 4px 0 #000` : '4px 4px 0 #000',
          cursor: unlocked ? 'pointer' : 'default',
          opacity: unlocked ? 1 : 0.5,
        }}
      >
        {/* Chapter number badge */}
        <div
          className="absolute -top-3 -left-3 w-7 h-7 flex items-center justify-center border-2 text-[0.45rem]"
          style={{
            ...PF,
            backgroundColor: unlocked ? color.border : '#374151',
            borderColor: unlocked ? color.glow : '#1f2937',
            color: unlocked ? '#000' : '#6b7280',
          }}
        >
          {index + 1}
        </div>

        {/* Lock / unlock icon */}
        <div className="absolute -top-3 -right-3 text-base">
          {unlocked ? '⚔️' : '🔒'}
        </div>

        <div className="flex flex-col gap-2 pl-2">
          {/* Chapter title */}
          <div
            className="leading-relaxed"
            style={{ ...PF, fontSize: '0.5rem', color: unlocked ? color.text : '#4b5563' }}
          >
            {chapter.title.toUpperCase()}
          </div>

          {/* Lore preview */}
          {unlocked && (
            <div className="text-gray-400 leading-loose mt-1" style={{ ...PF, fontSize: '0.35rem' }}>
              {chapter.lore.length > 120 ? chapter.lore.slice(0, 120) + '...' : chapter.lore}
            </div>
          )}

          {/* Stats row */}
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1">
              <span style={{ fontSize: '0.65rem' }}>📖</span>
              <span className="text-gray-500" style={{ ...PF, fontSize: '0.35rem' }}>
                {unlocked ? `${chapter.flashcards?.length ?? 0} CARDS` : '?? CARDS'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ fontSize: '0.65rem' }}>⚡</span>
              <span className="text-gray-500" style={{ ...PF, fontSize: '0.35rem' }}>
                {unlocked ? `${chapter.quiz?.length ?? 0} QUESTS` : '?? QUESTS'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Connector line below (skip for last) */}
      {!isLast && (
        <div className="flex flex-col items-center gap-[3px] py-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="w-[3px] h-[6px]"
              style={{ backgroundColor: '#374151', opacity: 0.3 }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function LevelMap({ questData, playerName }) {
  const chapters = questData?.chapters ?? []

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] flex flex-col">
      {/* Scanline */}
      <div className="pointer-events-none fixed inset-0 z-10"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)' }} />

      {/* Stats bar — fixed at top */}
      <div className="sticky top-0 z-20">
        <StatsBar playerName={playerName} level={1} xp={0} maxXp={100} hp={3} maxHp={3} />
      </div>

      {/* Map content */}
      <div className="relative z-10 flex flex-col items-center px-4 py-10 gap-0">

        {/* Map title */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="text-yellow-400 glow-title text-center leading-relaxed" style={{ ...PF, fontSize: 'clamp(0.7rem, 2.5vw, 1rem)' }}>
            ADVENTURE MAP
          </div>
          <div className="flex items-center gap-2">
            <div className="h-[2px] w-12 bg-yellow-500 opacity-40" />
            <div className="h-[2px] w-2 bg-orange-400 opacity-60" />
            <div className="h-[2px] w-12 bg-yellow-500 opacity-40" />
          </div>
          <div className="text-gray-500 text-center" style={{ ...PF, fontSize: '0.4rem' }}>
            {chapters.length} CHAPTERS AWAIT
          </div>
        </div>

        {/* Chapter nodes */}
        <div className="w-full max-w-sm flex flex-col items-center">
          {chapters.map((chapter, i) => (
            <ChapterNode
              key={i}
              chapter={chapter}
              index={i}
              unlocked={i === 0}
              isLast={i === chapters.length - 1}
            />
          ))}
        </div>

        {/* End of map */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="text-4xl opacity-40">🏰</div>
          <div className="text-gray-700 text-center" style={{ ...PF, fontSize: '0.4rem' }}>
            COMPLETE ALL CHAPTERS<br />TO UNLOCK THE FINAL BOSS
          </div>
        </div>
      </div>
    </div>
  )
}
