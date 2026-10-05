import { useEffect, useMemo, useRef, useState } from 'react'
import { Scene } from '../three/Scene'
import { World, type ItemState } from '../three/World'
import { THEMES, matchLibrary, giftLink, encodeGift, type Gift, type GiftItem, type ThemeId } from '../lib/gift'
import { liveAvailable, startGeneration, waitForTask } from '../lib/api'
import { sfx } from '../lib/sfx'
import { MuteButton, hashQuery } from './common'

type Draft = { label: string; note: string }
type Phase = 'form' | 'building' | 'done'

const IDEAS = [
  'a matcha latte',
  'her cat Mochi',
  'a stack of manga',
  'a tiny guitar',
  "grandma's dumplings",
  'a vinyl record player',
  'a red bicycle',
  'a bonsai tree',
  'a camping tent',
  'a strawberry shortcake',
  'a retro game console',
  'a little sailboat',
]

const SURPRISE: { to: string; from: string; theme: ThemeId; items: Draft[]; msg: string } = {
  to: 'Sam',
  from: 'Alex',
  theme: 'onsen',
  items: [
    { label: 'a strawberry shortcake', note: 'For every birthday I missed.' },
    { label: 'a red bicycle', note: 'Remember the summer we rode everywhere?' },
    { label: 'a tiny guitar', note: 'Play me that song again.' },
  ],
  msg: "Moving across the world was the bravest thing you've ever done. Here's a little place to rest when it feels like too much. The capybaras are holding your spot.",
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function Create() {
  const q = hashQuery()
  const [to, setTo] = useState(q.get('to') || '')
  const [from, setFrom] = useState(q.get('from') || '')
  const [theme, setTheme] = useState<ThemeId>('onsen')
  const [drafts, setDrafts] = useState<Draft[]>([
    { label: '', note: '' },
    { label: '', note: '' },
    { label: '', note: '' },
  ])
  const [msg, setMsg] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const [live, setLive] = useState<boolean | null>(null)
  const [items, setItems] = useState<GiftItem[]>([])
  const [states, setStates] = useState<ItemState[]>([])
  const [progress, setProgress] = useState<number[]>([])
  const [status, setStatus] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [wrapped, setWrapped] = useState<Gift | null>(null)
  const openAt = useRef<number | null>(null)

  useEffect(() => {
    liveAvailable().then(setLive)
  }, [])

  const filled = drafts.filter((d) => d.label.trim())

  const previewGift: Gift = useMemo(() => {
    const its: GiftItem[] =
      phase === 'form' ? filled.map((d) => ({ label: d.label.trim(), lib: 'mystery' })) : items
    return { v: 1, to: to || 'you', from: from || 'a friend', msg, theme, items: its }
  }, [phase, filled.map((d) => d.label).join('|'), items, theme, to, from, msg])

  const setDraft = (i: number, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)))

  const patchAt = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>, i: number, v: NoInfer<T>) => set((arr) => arr.map((x, j) => (j === i ? v : x)))

  async function build() {
    const list = filled.slice(0, 3)
    if (!list.length) return
    sfx('chime')
    const draft: GiftItem[] = list.map((d) => ({ label: d.label.trim().slice(0, 60), note: d.note.trim().slice(0, 140) || undefined }))
    setItems(draft)
    setStates(draft.map(() => 'pending'))
    setProgress(draft.map(() => 0))
    setStatus(draft.map(() => 'Waiting for a free capybara…'))
    setPhase('building')
    const useLive = live === true

    await Promise.all(
      draft.map(async (it, i) => {
        await sleep(300 + i * 450)
        if (useLive) {
          try {
            patchAt(setStatus, i, 'Sculpting with Tripo…')
            const task = await startGeneration(it.label)
            await waitForTask(task, (p, st) => {
              patchAt(setProgress, i, p)
              patchAt(setStatus, i, st === 'queued' ? 'In the Tripo queue…' : p < 60 ? 'Sculpting with Tripo…' : 'Painting textures…')
            })
            setItems((arr) => arr.map((x, j) => (j === i ? { ...x, task } : x)))
            patchAt(setProgress, i, 100)
            patchAt(setStatus, i, 'Ready! Freshly sculpted ✨')
            patchAt(setStates, i, 'ready')
            return
          } catch (e: any) {
            patchAt(setStatus, i, `${e?.message || 'Hmm'} — grabbing one from the shelf`)
          }
        }
        const lib = matchLibrary(it.label)
        for (let p = 0; p <= 100; p += 10) {
          patchAt(setProgress, i, p)
          await sleep(160)
        }
        setItems((arr) => arr.map((x, j) => (j === i ? { ...x, lib } : x)))
        patchAt(setStatus, i, lib === 'mystery' ? 'Wrapped as a surprise 🎀' : 'Picked from the capy shelf')
        patchAt(setStates, i, 'ready')
      }),
    )
    sfx('sparkle')
    setPhase('done')
  }

  function wrap() {
    const g: Gift = { v: 1, to: to.trim() || 'you', from: from.trim() || 'a friend', msg: msg.trim(), theme, items }
    setWrapped(g)
    sfx('ribbon')
  }

  const link = wrapped ? giftLink(wrapped) : ''

  return (
    <div className={`page create theme-${theme}`}>
      <Scene className="create-scene">
        <World
          key={phase}
          gift={previewGift}
          mode={phase === 'building' ? 'build' : 'ambient'}
          openAt={openAt}
          itemStates={phase === 'form' ? undefined : states}
        />
      </Scene>

      <div className="panel card" data-testid="create-panel">
        <a className="brand small" href="#/">
          <span className="stamp">📮</span> Capy Post
        </a>

        {phase === 'form' && (
          <>
            <h2>Build a tiny world</h2>
            <div className="grid2">
              <label>
                <span>For</span>
                <input value={to} maxLength={40} placeholder="Their name" onChange={(e) => setTo(e.target.value)} data-testid="to" />
              </label>
              <label>
                <span>From</span>
                <input value={from} maxLength={40} placeholder="Your name" onChange={(e) => setFrom(e.target.value)} data-testid="from" />
              </label>
            </div>

            <div className="section-title">Their world</div>
            <div className="themes">
              {(Object.keys(THEMES) as ThemeId[]).map((t) => (
                <button key={t} className={`theme ${theme === t ? 'on' : ''}`} onClick={() => setTheme(t)} data-testid={`theme-${t}`}>
                  <span className="emoji">{THEMES[t].emoji}</span>
                  <b>{THEMES[t].name}</b>
                  <small>{THEMES[t].blurb}</small>
                </button>
              ))}
            </div>

            <div className="section-title">
              Three things they love{' '}
              <small className={`live ${live ? 'on' : ''}`}>{live === null ? '…' : live ? '✨ sculpted live by Tripo' : '📚 from the Tripo-made capy shelf'}</small>
            </div>
            {drafts.map((d, i) => (
              <div className="item-row" key={i}>
                <input
                  value={d.label}
                  maxLength={60}
                  placeholder={IDEAS[(i * 4) % IDEAS.length]}
                  onChange={(e) => setDraft(i, { label: e.target.value })}
                  data-testid={`item-${i}`}
                />
                <input className="note-in" value={d.note} maxLength={140} placeholder="a little note (optional)" onChange={(e) => setDraft(i, { note: e.target.value })} data-testid={`note-${i}`} />
              </div>
            ))}
            <div className="ideas">
              {IDEAS.slice(0, 6).map((idea) => (
                <button
                  key={idea}
                  className="chip"
                  onClick={() => {
                    const k = drafts.findIndex((d) => !d.label.trim())
                    if (k >= 0) setDraft(k, { label: idea })
                  }}
                >
                  + {idea}
                </button>
              ))}
            </div>

            <div className="section-title">Your letter</div>
            <textarea value={msg} maxLength={600} rows={3} placeholder="Say the thing you never quite get around to saying…" onChange={(e) => setMsg(e.target.value)} data-testid="msg" />

            <div className="row">
              <button className="btn primary" disabled={!filled.length} onClick={build} data-testid="build">
                Have the capybaras build it 🏗️
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  setTo(SURPRISE.to)
                  setFrom(SURPRISE.from)
                  setTheme(SURPRISE.theme)
                  setDrafts(SURPRISE.items)
                  setMsg(SURPRISE.msg)
                }}
                data-testid="surprise"
              >
                Fill an example
              </button>
            </div>
          </>
        )}

        {phase !== 'form' && !wrapped && (
          <>
            <h2>{phase === 'building' ? 'The capybaras are building…' : 'Their world is ready!'}</h2>
            <p className="muted">
              {phase === 'building'
                ? live
                  ? 'Each thing is being sculpted from scratch by Tripo. Takes a minute or two. The crew is hauling crates in the meantime.'
                  : 'The crew is fetching Tripo-made pieces from the capy shelf.'
                : 'Spin it around, poke a capybara, then wrap it up.'}
            </p>
            <div className="progress-list">
              {items.map((it, i) => (
                <div className={`prog ${states[i]}`} key={i} data-testid={`prog-${i}`}>
                  <div className="prog-top">
                    <b>{it.label}</b>
                    <span>{states[i] === 'ready' ? '✓' : `${progress[i] ?? 0}%`}</span>
                  </div>
                  <div className="bar">
                    <div style={{ width: `${progress[i] ?? 0}%` }} />
                  </div>
                  <small>{status[i]}</small>
                </div>
              ))}
            </div>
            {phase === 'done' && (
              <div className="row">
                <button className="btn primary" onClick={wrap} data-testid="wrap">
                  Wrap it up 🎁
                </button>
              </div>
            )}
          </>
        )}

        {wrapped && (
          <>
            <h2>Wrapped &amp; ready to send 🎀</h2>
            <p className="muted">Send this link to {wrapped.to}. They'll unwrap it, read your letter, and wander their world.</p>
            <div className="share">
              <input readOnly value={link} onFocus={(e) => e.target.select()} data-testid="share-link" />
              <button
                className="btn small"
                onClick={() => {
                  navigator.clipboard?.writeText(link)
                  setCopied(true)
                  sfx('pop')
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="row">
              <a className="btn primary" href={`#/g/${encodeGift(wrapped)}`} data-testid="open-own">
                Preview their unwrapping →
              </a>
              <button
                className="btn ghost"
                onClick={() => {
                  setWrapped(null)
                  setPhase('form')
                  setItems([])
                }}
              >
                Make another
              </button>
            </div>
          </>
        )}
      </div>
      <MuteButton />
    </div>
  )
}
