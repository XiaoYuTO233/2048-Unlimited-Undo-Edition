import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { GameProps } from '../types'
import { advanceBlocks, hardDrop, moveBlock, rotateBlock, softDrop } from './engine'
import type { BlocksRound } from './engine'
import { saveBlocksRound } from './storage'

export type BlocksAction = 'left' | 'right' | 'soft-drop' | 'clockwise' | 'counterclockwise' | 'hard-drop'
type HeldAction = 'left' | 'right' | 'soft-drop'

export type BlocksView = {
  round: BlocksRound
  paused: boolean
  best: number
}

type HeldInput = {
  action: HeldAction
  nextRepeat: number
}

const repeatDelay = 145
const repeatInterval = 50

function isHeldAction(action: BlocksAction): action is HeldAction {
  return action === 'left' || action === 'right' || action === 'soft-drop'
}

export function mountBlocks({ initial, storage, playSound, onChange }: {
  initial: BlocksView
  storage: GameProps['storage']
  playSound: GameProps['playSound']
  onChange: (view: BlocksView) => void
}) {
  let { round, paused, best } = initial
  best = storage.saveHighScore(Math.max(best, round.score))
  const held = new Map<number, HeldInput>()
  const listeners = new AbortController()
  let frameId: number | undefined
  let previousFrame = performance.now()

  function publish() {
    onChange({ round, paused, best })
  }

  function cancelFrame() {
    if (frameId !== undefined) window.cancelAnimationFrame(frameId)
    frameId = undefined
    held.clear()
  }

  function commit(updated: BlocksRound, sound = false) {
    const previous = round
    round = updated
    if (updated.active === previous.active && updated.board === previous.board) return

    if (round.score > best) best = storage.saveHighScore(round.score)
    if (round.over) cancelFrame()
    saveBlocksRound(storage, round)
    publish()

    if (round.lines > previous.lines) playSound('merge')
    else if (sound || round.over) playSound('click')
  }

  function tick(now: number) {
    frameId = undefined
    if (paused || round.over) return

    // Limit one frame after a long stall, so input cannot trigger a burst of drops.
    const delta = Math.max(0, Math.min(now - previousFrame, 100))
    previousFrame = now
    let horizontal: HeldInput | undefined
    let softHeld = false
    for (const input of held.values()) {
      if (input.action === 'soft-drop') softHeld = true
      else horizontal = input
    }
    if (horizontal && now >= horizontal.nextRepeat) {
      commit(moveBlock(round, horizontal.action === 'left' ? -1 : 1))
      horizontal.nextRepeat = now + repeatInterval
    }

    commit(advanceBlocks(round, delta, softHeld))
    if (!round.over) frameId = window.requestAnimationFrame(tick)
  }

  function pause() {
    if (paused || round.over || listeners.signal.aborted) return
    paused = true
    cancelFrame()
    saveBlocksRound(storage, round)
    publish()
  }

  function resume() {
    if (!paused || round.over || document.hidden) return
    paused = false
    previousFrame = performance.now()
    publish()
    frameId = window.requestAnimationFrame(tick)
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause()
  }, { signal: listeners.signal })
  window.addEventListener('pagehide', pause, { signal: listeners.signal })

  const nativeListener = Capacitor.isNativePlatform()
    ? App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) pause()
      }).catch(() => undefined)
    : undefined

  saveBlocksRound(storage, round)
  publish()
  if (!paused && !round.over) frameId = window.requestAnimationFrame(tick)

  return {
    pause,
    resume,
    press(action: BlocksAction, pointerId?: number) {
      if (paused || round.over) return
      if (pointerId !== undefined && isHeldAction(action)) {
        held.set(pointerId, { action, nextRepeat: performance.now() + repeatDelay })
      }
      switch (action) {
        case 'left':
          commit(moveBlock(round, -1))
          break
        case 'right':
          commit(moveBlock(round, 1))
          break
        case 'soft-drop':
          commit(softDrop(round))
          break
        case 'hard-drop':
          commit(hardDrop(round), true)
          break
        case 'clockwise':
          commit(rotateBlock(round, 1), true)
          break
        case 'counterclockwise':
          commit(rotateBlock(round, -1), true)
          break
      }
    },
    release(pointerId: number) {
      held.delete(pointerId)
    },
    dispose() {
      listeners.abort()
      cancelFrame()
      void nativeListener?.then((listener) => listener?.remove()).catch(() => {})
    },
  }
}
