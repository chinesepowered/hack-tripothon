import { useRef } from 'react'
import { Scene } from '../three/Scene'
import { World } from '../three/World'
import { JUDGE_GIFT, SAMPLE_GIFTS, THEMES, encodeGift } from '../lib/gift'
import { MuteButton } from './common'

export function Landing() {
  const openAt = useRef<number | null>(null)
  return (
    <div className="page landing">
      <Scene>
        <World gift={JUDGE_GIFT} mode="ambient" openAt={openAt} showLabels={false} shift={[0.17, 0.2]} />
      </Scene>
      <div className="hero card pop-in">
        <div className="brand">
          <span className="stamp">📮</span> Capy Post
        </div>
        <h1>
          Send someone
          <br />a tiny world.
        </h1>
        <p>
          Tell us who it's for and three things they love. A crew of capybaras sculpts them in 3D, builds a cozy pocket world around them, wraps it up, and
          delivers it as a link.
        </p>
        <div className="row">
          <a href="#/create" className="btn primary" data-testid="cta-create">
            Build a world 🎁
          </a>
          <a href={`#/g/${encodeGift(JUDGE_GIFT)}`} className="btn" data-testid="cta-judge">
            Open the gift for you
          </a>
        </div>
        <div className="samples">
          <span>Peek inside:</span>
          {SAMPLE_GIFTS.slice(1).map((g) => (
            <a key={g.to} className="chip" href={`#/g/${encodeGift(g)}`}>
              {THEMES[g.theme].emoji} for {g.to}
            </a>
          ))}
        </div>
      </div>
      <footer className="made">
        Capybaras &amp; gifts generated, rigged and animated with <b>Tripo</b> · tap the capybaras · #Tripothon
      </footer>
      <MuteButton />
    </div>
  )
}
