import { useState } from 'react'
import './index.css'
import LandingPage from './components/LandingPage'
import UploadScreen from './components/UploadScreen'
import LoadingScreen from './components/LoadingScreen'
import LevelMap from './components/LevelMap'
import { parseStudyMaterial } from './services/anthropic'

export default function App() {
  const [screen, setScreen] = useState('landing') // landing | upload | loading | levelMap
  const [playerName, setPlayerName] = useState('')
  const [questData, setQuestData] = useState(null)
  const [parseError, setParseError] = useState(null)

  async function handleBeginQuest(name, text) {
    setPlayerName(name)
    setScreen('loading')
    setParseError(null)
    try {
      const data = await parseStudyMaterial(text)
      setQuestData(data)
      setScreen('levelMap')
    } catch (err) {
      console.error(err)
      setParseError(err.message)
      setScreen('upload')
    }
  }

  if (screen === 'landing') {
    return <LandingPage onNewQuest={() => setScreen('upload')} />
  }

  if (screen === 'upload') {
    return (
      <UploadScreen
        onSubmit={handleBeginQuest}
        onBack={() => setScreen('landing')}
        error={parseError}
      />
    )
  }

  if (screen === 'loading') {
    return <LoadingScreen questName={playerName} />
  }

  if (screen === 'levelMap') {
    return <LevelMap questData={questData} playerName={playerName} />
  }

  return null
}
