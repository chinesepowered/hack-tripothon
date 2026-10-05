import { useRef } from 'react'
import { Scene } from '../three/Scene'
import { World } from '../three/World'
import { JUDGE_GIFT } from '../lib/gift'

/** 1200x630 social preview, captured to public/og.png. */
export function Og() {
  const openAt = useRef<number | null>(null)
  return (
    <div className="page og">
      <Scene>
        <World gift={JUDGE_GIFT} mode="ambient" openAt={openAt} showLabels={false} shift={[0.2, 0]} />
      </Scene>
      <div className="og-title">
        <div className="brand">
          <span className="stamp">📮</span> Capy Post
        </div>
        <h1>
          Send someone
          <br />a tiny world.
        </h1>
        <p>Capybaras build it, wrap it, and deliver it.</p>
      </div>
    </div>
  )
}
