import { useMemo, useRef, useState } from 'react'
import { Scene } from '../three/Scene'
import { World } from '../three/World'
import { decodeGift, JUDGE_GIFT, THEMES, type Gift } from '../lib/gift'
import { sfx } from '../lib/sfx'
import { MuteButton, Typewriter } from './common'

export function GiftView({ data }: { data: string }) {
  const gift = useMemo<Gift>(() => decodeGift(data) ?? JUDGE_GIFT, [data])
  const openAt = useRef<number | null>(null)
  const [opened, setOpened] = useState(false)
  const [letter, setLetter] = useState(false)
  const [seenLetter, setSeenLetter] = useState(false)
  const [note, setNote] = useState<number | null>(null)

  const back = `#/create?to=${encodeURIComponent(gift.from)}&from=${encodeURIComponent(gift.to)}`

  return (
    <div className={`page gift theme-${gift.theme}`}>
      <Scene>
        <World
          gift={gift}
          mode="gift"
          openAt={openAt}
          onOpen={() => setOpened(true)}
          onLetter={() => {
            setLetter(true)
            setSeenLetter(true)
            sfx('paper')
          }}
          onItemTap={(i) => {
            setNote(i)
            sfx('pop')
          }}
        />
      </Scene>

      {!opened && (
        <div className="banner pop-in" data-testid="gift-banner">
          <div className="eyebrow">{THEMES[gift.theme].emoji} Capy Post delivery</div>
          <div className="to">
            A tiny world for <b>{gift.to}</b>
          </div>
          <div className="from">from {gift.from}</div>
          <div className="hint">Tap the gift to open it ✨</div>
        </div>
      )}

      {letter && (
        <div className="letter-wrap" onClick={() => setLetter(false)}>
          <div className="letter pop-in" onClick={(e) => e.stopPropagation()} data-testid="letter">
            <div className="letter-stamp">📮</div>
            <div className="dear">Dear {gift.to},</div>
            <div className="msg">
              <Typewriter text={gift.msg || 'I made you a tiny world. Hope it makes you smile.'} speed={18} />
            </div>
            <div className="sign">— {gift.from}</div>
            <div className="letter-items">
              {gift.items.map((it, i) => (
                <span key={i} className="chip small">
                  {it.label}
                </span>
              ))}
            </div>
            <button className="btn primary" onClick={() => setLetter(false)} data-testid="letter-close">
              Explore your world →
            </button>
          </div>
        </div>
      )}

      {note !== null && gift.items[note] && (
        <div className="note pop-in" onClick={() => setNote(null)}>
          <b>{gift.items[note].label}</b>
          <span>{gift.items[note].note || `Picked by ${gift.from}, just for you.`}</span>
        </div>
      )}

      {opened && !letter && seenLetter && (
        <div className="dock pop-in">
          <button className="btn small" onClick={() => setLetter(true)}>
            💌 Letter
          </button>
          <a className="btn small primary" href={back} data-testid="send-back">
            Send one back
          </a>
          <a className="btn small ghost" href="#/">
            What is this?
          </a>
        </div>
      )}
      {opened && !letter && <div className="tip fade-in">Drag to look around · tap the capybaras</div>}
      <MuteButton />
    </div>
  )
}
