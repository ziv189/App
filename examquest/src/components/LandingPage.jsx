import { useState, useEffect } from 'react'

const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  top: Math.random() * 100,
  left: Math.random() * 100,
  size: Math.random() * 2 + 1,
  delay: Math.random() * 4,
  duration: 2 + Math.random() * 3,
}))

function Star({ top, left, size, delay, duration }) {
  return (
    <div
      className="absolute rounded-full bg-white"
      style={{
        top: `${top}%`,
        left: `${left}%`,
        width: `${size}px`,
        height: `${size}px`,
        animation: `twinkle ${duration}s ${delay}s ease-in-out infinite`,
      }}
    />
  )
}

export default function LandingPage({ onNewQuest }) {
  const [cursorVisible, setCursorVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setCursorVisible(v => !v), 600)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center bg-[#0a0a0f] screen-flicker">
      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)',
        }}
      />

      {/* Stars */}
      <div className="absolute inset-0 z-0">
        {STARS.map(s => <Star key={s.id} {...s} />)}
      </div>

      {/* Pixel art mountains silhouette */}
      <div className="absolute bottom-0 left-0 right-0 z-0 flex items-end justify-center opacity-30">
        <svg viewBox="0 0 800 200" className="w-full" preserveAspectRatio="none">
          <polygon points="0,200 0,120 60,80 120,100 180,50 240,90 300,30 360,80 420,10 480,70 540,40 600,90 660,60 720,100 780,70 800,90 800,200" fill="#1a1a2e" />
          <polygon points="0,200 0,150 80,130 160,140 240,110 320,125 400,100 480,120 560,105 640,130 720,115 800,130 800,200" fill="#16213e" />
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-20 flex flex-col items-center gap-10 px-6 text-center">
        {/* Title */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="text-yellow-400 glow-title tracking-widest leading-relaxed"
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: 'clamp(1.8rem, 6vw, 4rem)' }}
          >
            EXAMQUEST
          </div>

          {/* Pixel divider */}
          <div className="flex items-center gap-2">
            <div className="h-[3px] w-16 bg-yellow-500 opacity-60" />
            <div className="h-[3px] w-3 bg-orange-400 opacity-80" />
            <div className="h-[3px] w-16 bg-yellow-500 opacity-60" />
          </div>
        </div>

        {/* Subtitle */}
        <p
          className="text-green-400 opacity-90 leading-loose"
          style={{ fontFamily: "'Press Start 2P', cursive", fontSize: 'clamp(0.45rem, 1.8vw, 0.75rem)' }}
        >
          Turn your exam into an adventure
        </p>

        {/* Level/version tag */}
        <div
          className="text-gray-500 border border-gray-700 px-4 py-2 text-[0.45rem] tracking-widest"
          style={{ fontFamily: "'Press Start 2P', cursive" }}
        >
          VER 1.0.0 &nbsp;·&nbsp; ALPHA
        </div>

        {/* Menu buttons */}
        <div className="flex flex-col items-center gap-5 mt-4 w-full max-w-xs">
          {/* New Quest */}
          <button
            onClick={onNewQuest}
            className="pulse-btn w-full py-4 px-6 bg-yellow-400 text-black border-4 border-yellow-600 hover:bg-yellow-300 hover:border-yellow-500 active:translate-y-[2px] transition-all duration-75 cursor-pointer"
            style={{
              fontFamily: "'Press Start 2P', cursive",
              fontSize: '0.65rem',
              imageRendering: 'pixelated',
              boxShadow: '4px 4px 0 #78350f',
            }}
          >
            ▶ NEW QUEST
          </button>

          {/* Continue Quest — grayed out */}
          <button
            disabled
            className="w-full py-4 px-6 bg-gray-800 text-gray-600 border-4 border-gray-700 cursor-not-allowed"
            style={{
              fontFamily: "'Press Start 2P', cursive",
              fontSize: '0.65rem',
              boxShadow: '4px 4px 0 #111',
            }}
          >
            ▷ CONTINUE QUEST
          </button>
        </div>

        {/* Blinking press start prompt */}
        <div
          className="mt-6 text-gray-400"
          style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '0.45rem' }}
        >
          <span className="blink-text">▼ SELECT AN OPTION ▼</span>
        </div>
      </div>

      {/* Bottom copyright */}
      <div
        className="absolute bottom-6 left-0 right-0 z-20 text-center text-gray-700"
        style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '0.35rem', letterSpacing: '0.1em' }}
      >
        © 2026 EXAMQUEST. ALL RIGHTS RESERVED.
      </div>
    </div>
  )
}
