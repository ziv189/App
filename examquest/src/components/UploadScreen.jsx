import { useState, useRef } from 'react'

const PF = { fontFamily: "'Press Start 2P', cursive" }

export default function UploadScreen({ onSubmit, onBack }) {
  const [questName, setQuestName] = useState('')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  function readFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setText(e.target.result)
      setFileName(file.name)
      if (!questName) {
        setQuestName(file.name.replace(/\.[^.]+$/, ''))
      }
    }
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) readFile(file)
  }

  function handleFileChange(e) {
    readFile(e.target.files[0])
  }

  function handleSubmit() {
    if (!questName.trim()) { setError('Enter a quest name'); return }
    if (!text.trim()) { setError('Add your study material'); return }
    setError('')
    onSubmit(questName.trim(), text.trim())
  }

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0f] flex flex-col items-center justify-center px-4 py-12"
      style={{ ...PF }}>

      {/* Scanline */}
      <div className="pointer-events-none absolute inset-0 z-10"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)' }} />

      <div className="relative z-20 w-full max-w-xl flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <button onClick={onBack}
            className="self-start text-gray-500 hover:text-yellow-400 transition-colors text-[0.5rem] mb-2"
            style={PF}>
            ◀ BACK
          </button>
          <div className="text-yellow-400 glow-title text-center leading-relaxed" style={{ ...PF, fontSize: 'clamp(0.9rem, 3vw, 1.3rem)' }}>
            NEW QUEST
          </div>
          <p className="text-green-400 text-center leading-loose" style={{ ...PF, fontSize: '0.45rem' }}>
            Upload your study material to begin the adventure
          </p>
        </div>

        {/* Quest Name */}
        <div className="flex flex-col gap-3">
          <label className="text-yellow-300 text-[0.5rem] tracking-widest" style={PF}>
            QUEST NAME
          </label>
          <input
            type="text"
            value={questName}
            onChange={e => setQuestName(e.target.value)}
            placeholder="e.g. Biology Final Exam"
            className="w-full bg-[#0f0f1a] border-2 border-yellow-700 text-green-300 px-4 py-3 text-[0.5rem] outline-none focus:border-yellow-400 transition-colors placeholder-gray-600"
            style={PF}
          />
        </div>

        {/* File Drop Zone */}
        <div className="flex flex-col gap-3">
          <label className="text-yellow-300 text-[0.5rem] tracking-widest" style={PF}>
            STUDY MATERIAL
          </label>

          <div
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-none px-6 py-8 text-center cursor-pointer transition-all ${
              dragOver ? 'border-yellow-400 bg-yellow-400/5' : 'border-gray-700 hover:border-gray-500'
            } ${fileName ? 'bg-green-900/10 border-green-700' : ''}`}
          >
            <input ref={fileRef} type="file" accept=".txt,.md,.text" onChange={handleFileChange} className="hidden" />
            {fileName ? (
              <div className="flex flex-col items-center gap-2">
                <div className="text-green-400 text-[0.55rem]" style={PF}>✓ {fileName}</div>
                <div className="text-gray-600 text-[0.4rem]" style={PF}>Click to replace</div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="text-4xl">📜</div>
                <div className="text-gray-400 text-[0.5rem] leading-loose" style={PF}>
                  DROP .TXT FILE HERE<br />or click to browse
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Or paste text */}
        <div className="flex flex-col gap-3">
          <label className="text-gray-500 text-[0.45rem] tracking-widest" style={PF}>
            — OR PASTE TEXT DIRECTLY —
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste your notes, textbook content, or any study material here..."
            rows={8}
            className="w-full bg-[#0f0f1a] border-2 border-gray-800 text-green-300 px-4 py-3 text-[0.45rem] outline-none focus:border-yellow-700 transition-colors placeholder-gray-700 resize-y leading-loose"
            style={PF}
          />
          {text && (
            <div className="text-gray-600 text-[0.4rem] text-right" style={PF}>
              {text.length.toLocaleString()} CHARACTERS
            </div>
          )}
        </div>

        {error && (
          <div className="text-red-400 text-[0.5rem] text-center blink-text" style={PF}>
            ⚠ {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || !questName.trim()}
          className="pulse-btn w-full py-4 px-6 bg-yellow-400 text-black border-4 border-yellow-600 hover:bg-yellow-300 disabled:bg-gray-800 disabled:text-gray-600 disabled:border-gray-700 disabled:cursor-not-allowed transition-all"
          style={{ ...PF, fontSize: '0.65rem', boxShadow: '4px 4px 0 #78350f' }}
        >
          ▶ BEGIN QUEST
        </button>
      </div>
    </div>
  )
}
