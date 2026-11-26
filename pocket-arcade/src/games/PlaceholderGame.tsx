import { FlaskConical, Layers3, Trophy } from 'lucide-react'
import { useState } from 'react'
import type { GameProps } from './types'

export function PlaceholderGame({ game, storage, playSound }: GameProps) {
  const [previewActive, setPreviewActive] = useState(false)
  const Icon = game.icon

  function preview() {
    setPreviewActive((previous) => !previous)
    playSound('click')
  }

  return (
    <section className="game-layout" data-color={game.color ?? 'purple'} aria-labelledby="game-title">
      <div className="game-heading">
        <div className="game-heading-icon"><Icon size={24} aria-hidden /></div>
        <div>
          <div className="card-category">{game.category}</div>
          <h1 id="game-title" tabIndex={-1}>{game.title}</h1>
        </div>
      </div>
      <div className="game-stats" aria-label="本地记录">
        <div><Trophy size={19} aria-hidden /><span>最高分</span><strong>{storage.getHighScore()}</strong></div>
        {game.hasLevels && (
          <div><Layers3 size={19} aria-hidden /><span>已通关</span><strong>{storage.getCompletedLevels().length}</strong></div>
        )}
      </div>
      <div className="game-preview">
        <div className="game-illustration" data-active={previewActive}>
          {game.artwork ? <img src={game.artwork} alt="" /> : <Icon size={80} aria-hidden />}
        </div>
        <div className="game-preview-copy">
          <h2>玩法预览</h2>
          <p>{game.description}。正式玩法将在后续版本加入。</p>
          <button className="preview-button" type="button" aria-pressed={previewActive} onClick={preview}>
            <FlaskConical size={17} aria-hidden />
            {previewActive ? '结束交互预览' : '体验预览交互'}
          </button>
        </div>
      </div>
    </section>
  )
}
