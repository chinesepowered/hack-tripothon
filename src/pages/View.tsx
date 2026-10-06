import { useRef } from 'react'
import { Scene } from '../three/Scene'
import { World } from '../three/World'
import { SAMPLE_GIFTS } from '../lib/gift'

/** Chrome-free view of a sample world (asset board stills, social images). */
export function View({ index }: { index: number }) {
  const openAt = useRef<number | null>(null)
  const gift = SAMPLE_GIFTS[index] ?? SAMPLE_GIFTS[0]
  const params = new URLSearchParams(location.search)
  return (
    <div className="page">
      <Scene>
        <World gift={gift} mode="ambient" openAt={openAt} showLabels={params.has('labels')} spin={Number(params.get('spin')) || undefined} />
      </Scene>
    </div>
  )
}
