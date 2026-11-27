const lobbyHash = '#/'
const gamePrefix = '#/games/'

export function gameHash(gameId: string) {
  return gamePrefix + encodeURIComponent(gameId)
}

export const sudokuLevelsHash = gameHash('sudoku')
export const sudokuTechniquesHash = `${sudokuLevelsHash}/techniques`

export function subscribeToNavigation(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function getLocationHash() {
  return window.location.hash
}

export function openGame(gameId: string) {
  window.history.pushState({ pocketArcadeFromLobby: true }, '', gameHash(gameId))
  window.dispatchEvent(new Event('hashchange'))
}

export function returnToLobby() {
  if (window.history.state?.pocketArcadeFromLobby === true) {
    window.history.back()
    return
  }

  window.location.replace(lobbyHash)
}

export function openSudokuTechniques() {
  window.history.pushState({ pocketArcadeFromSudokuLevels: true }, '', sudokuTechniquesHash)
  window.dispatchEvent(new Event('hashchange'))
}

export function returnToSudokuLevels() {
  if (window.history.state?.pocketArcadeFromSudokuLevels === true) {
    window.history.back()
    return
  }

  window.location.replace(sudokuLevelsHash)
}
