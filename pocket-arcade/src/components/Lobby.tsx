import { ArrowRight, Grid2X2, HardDrive, WifiOff } from 'lucide-react'
import type { MouseEvent } from 'react'
import arcadeArtwork from '../assets/arcade.png'
import { gameRegistry } from '../games/registry'
import { gameHash } from '../services/navigation'

interface LobbyProps {
  onOpenGame: (id: string) => void
}

export function Lobby({ onOpenGame }: LobbyProps) {
  function open(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    event.preventDefault()
    onOpenGame(id)
  }

  return (
    <div className="lobby">
      <section className="hero" aria-labelledby="lobby-title">
        <div className="hero-grid" aria-hidden />
        <img className="hero-art" src={arcadeArtwork} alt="" width="132" height="96" fetchPriority="high" />
        <div className="hero-copy">
          <div className="offline-badge"><WifiOff size={14} aria-hidden /> 离线模式</div>
          <h1 id="lobby-title">随时开玩<span aria-hidden>.</span></h1>
          <p>经典小游戏，随身畅玩。</p>
        </div>
      </section>

      <section aria-labelledby="games-title">
        <div className="section-header">
          <div className="section-title">
            <span className="section-icon"><Grid2X2 size={19} aria-hidden /></span>
            <h2 id="games-title">游戏大厅</h2>
          </div>
          <span className="game-count">{gameRegistry.length} 款游戏</span>
        </div>

        <ul className="game-grid list-none">
          {gameRegistry.map((game) => {
            const Icon = game.icon

            return (
              <li key={game.id}>
                <a
                  className="game-card group"
                  data-color={game.color ?? 'purple'}
                  href={gameHash(game.id)}
                  aria-label={game.title}
                  onClick={(event) => open(event, game.id)}
                >
                  <div className="card-art">
                    <div className="card-art-grid" aria-hidden />
                    {game.artwork ? <img src={game.artwork} alt="" width="100" height="58" /> : <Icon size={60} aria-hidden />}
                  </div>
                  <div className="card-body">
                    <span className="card-category">{game.category}</span>
                    <h3>{game.title}</h3>
                    <p>{game.description}</p>
                    <span className="card-arrow"><ArrowRight size={18} aria-hidden /></span>
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      <footer className="lobby-footer">
        <HardDrive size={15} aria-hidden />
        资源与存档保存在本机
      </footer>
    </div>
  )
}
