import { useEffect, useState } from 'react'

const PF = { fontFamily: "'Press Start 2P', cursive" }

const MESSAGES = [
  'Consulting the ancient scrolls...',
  'The Oracle is reading your tome...',
  'Forging your adventure map...',
  'Awakening the dungeon master...',
  'Inscribing knowledge into stone...',
  'Summoning chapter guardians...',
  'Charting the quest path...',
  'Enchanting your flashcards...',
]

const FRAMES = ['▓░░░░░░░', '▓▓░░░░░░', '▓▓▓░░░░░', '▓▓▓▓░░░░', '▓▓▓▓▓░░░', '▓▓▓▓▓▓░░', '▓▓▓▓▓▓▓░', '▓▓▓▓▓▓▓▓']

export default function LoadingScreen({ questName }) {
  const [msgIdx, setMsgIdx] = useState(0)
  const [frameIdx, setFrameIdx] = useState(0)

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % MESSAGES.length), 2200)
    const frameTimer = setInterval(() => setFrameIdx(i => (i + 1) % FRAMES.length), 400)
    return () => { clearInterval(msgTimer); clearInterval(frameTimer) }
  }, [])

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] flex flex-col items-center justify-center gap-10 px-6 screen-flicker">
      {/* Scanline */}
      <div className="pointer-events-none absolute inset-0 z-10"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)' }} />

      <div className="relative z-20 flex flex-col items-center gap-10 text-center">
        {/* Spinning orb */}
        <div className="text-7xl" style={{ animation: 'spin 3s linear infinite' }}>🔮</div>

        {/* Title */}
        <div className="text-yellow-400 glow-title leading-relaxed" style={{ ...PF, fontSize: 'clamp(0.6rem, 2vw, 0.9rem)' }}>
          GENERATING QUEST
        </div>

        {/* Quest name */}
        <div className="text-green-400 leading-loose" style={{ ...PF, fontSize: '0.45rem' }}>
          "{questName}"
        </div>

        {/* Progress bar */}
        <div className="flex flex-col items-center gap-3">
          <div className="text-yellow-500 tracking-widest" style={{ ...PF, fontSize: '0.7rem' }}>
            {FRAMES[frameIdx]}
          </div>
          <div className="text-gray-500 text-[0.4rem]" style={PF}>
            {Math.round((frameIdx / (FRAMES.length - 1)) * 100)}%
          </div>
        </div>

        {/* Rotating message */}
        <div className="text-gray-400 leading-loose max-w-xs" style={{ ...PF, fontSize: '0.4rem' }}>
          {MESSAGES[msgIdx]}
        </div>

        {/* Dots */}
        <div className="text-yellow-600 blink-text" style={{ ...PF, fontSize: '0.6rem' }}>
          . . .
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
