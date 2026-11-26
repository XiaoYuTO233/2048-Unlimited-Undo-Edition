import { ArrowLeft, Gamepad2, Moon, RotateCcw, Sun, Volume2, VolumeX } from 'lucide-react'
import type { Preferences } from '../services/storage'

interface AppHeaderProps {
  inGame: boolean
  preferences: Preferences
  onBack: () => void
  onRestart: () => void
  onToggleSound: () => void
  onToggleTheme: () => void
}

export function AppHeader({
  inGame,
  preferences,
  onBack,
  onRestart,
  onToggleSound,
  onToggleTheme,
}: AppHeaderProps) {
  const isLight = preferences.theme === 'light'
  const ThemeIcon = isLight ? Moon : Sun
  const SoundIcon = preferences.soundEnabled ? Volume2 : VolumeX

  return (
    <header className="app-header">
      <div className="shell header-inner">
        {inGame ? (
          <button className="header-back" type="button" onClick={onBack} aria-label="返回大厅">
            <ArrowLeft size={20} aria-hidden />
            <span>返回大厅</span>
          </button>
        ) : (
          <div className="wordmark">
            <span className="brand-mark"><Gamepad2 size={25} strokeWidth={2.2} aria-hidden /></span>
            <div>
              <span className="brand-title">口袋街机</span>
              <span className="brand-caption">POCKET ARCADE</span>
            </div>
          </div>
        )}

        <div className="header-actions">
          {inGame && (
            <button className="icon-button restart-button" type="button" aria-label="重新开始" title="重新开始" onClick={onRestart}>
              <RotateCcw size={19} aria-hidden />
              <span>重新开始</span>
            </button>
          )}
          <button
            className="icon-button"
            type="button"
            aria-label="游戏音效"
            aria-pressed={preferences.soundEnabled}
            title={preferences.soundEnabled ? '关闭音效' : '开启音效'}
            onClick={onToggleSound}
          >
            <SoundIcon size={19} aria-hidden />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="浅色主题"
            aria-pressed={isLight}
            title={isLight ? '切换深色主题' : '切换浅色主题'}
            onClick={onToggleTheme}
          >
            <ThemeIcon size={19} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  )
}
