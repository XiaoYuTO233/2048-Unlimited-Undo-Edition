const patterns = {
  click: [530],
  merge: [440, 660],
  enter: [350, 525, 700],
  restart: [550, 415, 550],
} as const

export type SoundEffect = keyof typeof patterns

let enabled = true
let context: AudioContext | undefined
let output: GainNode | undefined

export const AudioService = {
  setEnabled(next: boolean) {
    enabled = next
    if (output && context) output.gain.setValueAtTime(next ? 1 : 0, context.currentTime)
  },

  play(effect: SoundEffect) {
    if (!enabled || !window.AudioContext) return

    try {
      if (!context || !output) {
        context = new AudioContext()
        output = context.createGain()
        output.connect(context.destination)
      }

      const audio = context
      const destination = output

      function playNotes() {
        if (!enabled) return

        const start = audio.currentTime
        patterns[effect].forEach((frequency, index) => {
          const when = start + index * 0.07
          const oscillator = audio.createOscillator()
          const envelope = audio.createGain()

          oscillator.type = 'triangle'
          oscillator.frequency.value = frequency
          envelope.gain.setValueAtTime(0.001, when)
          envelope.gain.exponentialRampToValueAtTime(0.08, when + 0.012)
          envelope.gain.exponentialRampToValueAtTime(0.001, when + 0.095)
          oscillator.connect(envelope)
          envelope.connect(destination)
          oscillator.onended = () => {
            oscillator.disconnect()
            envelope.disconnect()
          }
          oscillator.start(when)
          oscillator.stop(when + 0.1)
        })
      }

      if (audio.state === 'running') {
        playNotes()
      } else {
        void audio.resume().then(playNotes).catch(() => {})
      }
    } catch {
      // Audio may be unavailable on a WebView. Navigation and gameplay can continue.
    }
  },
}
