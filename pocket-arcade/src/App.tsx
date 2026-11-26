import { App as AndroidApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AppHeader } from './components/AppHeader'
import { Lobby } from './components/Lobby'
import { gameRegistry } from './games/registry'
import { AudioService } from './services/audio'
import { gameHash, getLocationHash, openGame, returnToLobby, subscribeToNavigation } from './services/navigation'
import { StorageService } from './services/storage'
import type { Preferences, Theme } from './services/storage'

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#15101e' : '#f6f1fa')
}

export function App() {
  const [preferences, setPreferences] = useState(StorageService.getPreferences)
  const [round, setRound] = useState(0)
  const hash = useSyncExternalStore(subscribeToNavigation, getLocationHash)
  const game = gameRegistry.find((module) => gameHash(module.id) === hash)
  const gameId = game?.id
  const storage = useMemo(() => gameId ? StorageService.forGame(gameId) : null, [gameId])
  const Game = game?.component
  const main = useRef<HTMLElement>(null)
  const previousGameId = useRef(gameId)

  useEffect(() => {
    applyTheme(preferences.theme)
    AudioService.setEnabled(preferences.soundEnabled)
  }, [preferences])

  useEffect(() => {
    if (previousGameId.current === gameId) return

    previousGameId.current = gameId
    main.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [gameId])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const listener = AndroidApp.addListener('backButton', () => {
      const inGame = gameRegistry.some((module) => gameHash(module.id) === getLocationHash())
      if (inGame) {
        returnToLobby()
      } else {
        void AndroidApp.exitApp()
      }
    })

    return () => { void listener.then((subscription) => subscription.remove()) }
  }, [])

  function updatePreferences(next: Preferences) {
    StorageService.savePreferences(next)
    applyTheme(next.theme)
    AudioService.setEnabled(next.soundEnabled)
    setPreferences(next)
  }

  function toggleSound() {
    const soundEnabled = !preferences.soundEnabled
    updatePreferences({ ...preferences, soundEnabled })
    if (soundEnabled) AudioService.play('click')
  }

  return (
    <div className="app-shell overscroll-none select-none">
      <AppHeader
        inGame={Boolean(game)}
        preferences={preferences}
        onBack={() => {
          AudioService.play('click')
          returnToLobby()
        }}
        onRestart={() => {
          if (storage) game?.clearSavedRound?.(storage)
          AudioService.play('restart')
          setRound((previous) => previous + 1)
        }}
        onToggleSound={toggleSound}
        onToggleTheme={() => {
          updatePreferences({ ...preferences, theme: preferences.theme === 'dark' ? 'light' : 'dark' })
          AudioService.play('click')
        }}
      />
      <main ref={main} className="shell main-content" tabIndex={-1}>
        {game && Game && storage ? (
          <Game key={`${game.id}:${round}`} game={game} storage={storage} playSound={AudioService.play} />
        ) : (
          <Lobby onOpenGame={(id) => {
            AudioService.play('enter')
            openGame(id)
          }} />
        )}
      </main>
    </div>
  )
}
