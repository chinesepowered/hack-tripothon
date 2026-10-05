import { useEffect, useState } from 'react'
import { isMuted, setMuted, startMusic } from '../lib/sfx'

export function MuteButton() {
  const [muted, set] = useState(isMuted())
  useEffect(() => {
    const start = () => startMusic()
    window.addEventListener('pointerdown', start, { once: true })
    return () => window.removeEventListener('pointerdown', start)
  }, [])
  return (
    <button
      className="mute"
      aria-label={muted ? 'Unmute' : 'Mute'}
      onClick={() => {
        setMuted(!muted)
        set(!muted)
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}

export function hashQuery(): URLSearchParams {
  return new URLSearchParams(location.hash.split('?')[1] || '')
}

export function Typewriter({ text, speed = 22, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id)
          onDone?.()
          return v
        }
        return v + 1
      })
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return (
    <span>
      {text.slice(0, n)}
      <span className="caret" style={{ opacity: n < text.length ? 1 : 0 }}>
        |
      </span>
    </span>
  )
}
