import LZString from 'lz-string'

export type ThemeId = 'onsen' | 'moon' | 'kid'

export type GiftItem = {
  /** What the sender typed, e.g. "Grandma's teapot" */
  label: string
  /** Optional short memory shown when the recipient taps the item */
  note?: string
  /** Library asset id (pre-generated with Tripo, or procedural fallback) */
  lib?: string
  /** Tripo task id of a live generation (resolved through /api/model) */
  task?: string
  /** Direct GLB url (re-hosted copy of a live generation) */
  url?: string
  /** Rigged + animated (walks around the island) */
  walk?: boolean
}

export type Gift = {
  v: 1
  to: string
  from: string
  msg: string
  theme: ThemeId
  items: GiftItem[]
}

export const THEMES: Record<ThemeId, { name: string; blurb: string; emoji: string }> = {
  onsen: { name: 'Capybara Onsen', blurb: 'A steamy hot spring at golden hour', emoji: '♨️' },
  moon: { name: "The Moon's Dark Side", blurb: 'A secret hot spring on the moon', emoji: '🌙' },
  kid: { name: 'The Kid You Used to Be', blurb: 'Blocks, crayons and a sunny sky', emoji: '🧸' },
}

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : '')

function sanitize(raw: any): Gift | null {
  if (!raw || raw.v !== 1) return null
  const theme: ThemeId = raw.theme in THEMES ? raw.theme : 'onsen'
  const items: GiftItem[] = Array.isArray(raw.items)
    ? raw.items.slice(0, 3).map((it: any) => ({
        label: clip(it?.label, 60) || 'A surprise',
        note: clip(it?.note, 140) || undefined,
        lib: /^[a-z0-9-]{1,32}$/.test(it?.lib ?? '') ? it.lib : undefined,
        task: /^[A-Za-z0-9_-]{4,80}$/.test(it?.task ?? '') ? it.task : undefined,
        url: typeof it?.url === 'string' && /^https:\/\//.test(it.url) ? it.url.slice(0, 500) : undefined,
        walk: !!it?.walk,
      }))
    : []
  return {
    v: 1,
    to: clip(raw.to, 40) || 'you',
    from: clip(raw.from, 40) || 'a friend',
    msg: clip(raw.msg, 600),
    theme,
    items,
  }
}

export function encodeGift(g: Gift): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(g))
}

export function decodeGift(s: string): Gift | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(s)
    return json ? sanitize(JSON.parse(json)) : null
  } catch {
    return null
  }
}

export function giftLink(g: Gift): string {
  return `${location.origin}${location.pathname}#/g/${encodeGift(g)}`
}

/** The gift judges land on: zero waiting, zero setup. */
export const JUDGE_GIFT: Gift = {
  v: 1,
  to: 'you, dear judge',
  from: 'the Capy Post crew',
  msg:
    "You've opened a lot of demos today. This one asks nothing of you. A warm onsen, a yuzu, a big coffee, and absolutely no deadlines. Stay as long as you like. The capybaras insist.",
  theme: 'onsen',
  items: [
    { label: 'A very large coffee', note: 'Judging stamina, extra shot.', lib: 'coffee' },
    { label: 'A tiny trophy', note: 'For making it through every single demo.', lib: 'trophy' },
    { label: 'A nap pillow', note: 'Officially approved break.', lib: 'pillow' },
  ],
}

export const SAMPLE_GIFTS: Gift[] = [
  JUDGE_GIFT,
  {
    v: 1,
    to: 'Mei',
    from: 'Jun',
    msg: "Happy birthday to my favourite person on this planet (and the moon). I built you a hot spring where nobody can find you. Bring snacks.",
    theme: 'moon',
    items: [
      { label: 'A birthday cake', note: 'Moon gravity means extra fluffy.', lib: 'cake' },
      { label: 'Her telescope', note: 'So you can wave at Earth.', lib: 'telescope' },
      { label: 'Mochi the cat', note: 'Mochi insisted on coming.', lib: 'cat', walk: true },
    ],
  },
  {
    v: 1,
    to: 'little me',
    from: 'grown-up me',
    msg: "You were right about everything important: blocks are great, naps are great, and capybaras are the best animal. It all turns out okay.",
    theme: 'kid',
    items: [
      { label: 'The red rocket', note: 'You drew it on every notebook.', lib: 'rocket' },
      { label: 'A pile of books', note: 'You read them all twice.', lib: 'books' },
      { label: 'The teddy bear', note: 'Still undefeated at hugs.', lib: 'teddy' },
    ],
  },
]

/** Library items: Tripo-generated GLBs when available, procedural fallback otherwise. */
export const LIBRARY: { id: string; label: string; keywords: RegExp }[] = [
  { id: 'coffee', label: 'Coffee', keywords: /coffee|latte|espresso|mug|cafe|tea|matcha|boba|cup/i },
  { id: 'cake', label: 'Cake', keywords: /cake|birthday|dessert|cupcake|sweet|pastry/i },
  { id: 'trophy', label: 'Trophy', keywords: /trophy|award|win|champion|medal|prize/i },
  { id: 'pillow', label: 'Pillow', keywords: /pillow|sleep|nap|bed|cushion|rest/i },
  { id: 'books', label: 'Books', keywords: /book|read|novel|library|study|school/i },
  { id: 'plant', label: 'Plant', keywords: /plant|flower|garden|succulent|tree|cactus|leaf/i },
  { id: 'guitar', label: 'Guitar', keywords: /guitar|music|song|band|ukulele|piano|sing/i },
  { id: 'cat', label: 'Cat', keywords: /cat|kitty|kitten|meow/i },
  { id: 'dog', label: 'Dog', keywords: /dog|puppy|pup|doggo|corgi|shiba/i },
  { id: 'rocket', label: 'Rocket', keywords: /rocket|space|astronaut|star|galaxy|nasa/i },
  { id: 'telescope', label: 'Telescope', keywords: /telescope|astronomy|sky|planet/i },
  { id: 'teddy', label: 'Teddy bear', keywords: /teddy|bear|plush|stuffed|toy/i },
  { id: 'camera', label: 'Camera', keywords: /camera|photo|picture|film/i },
  { id: 'gamepad', label: 'Game controller', keywords: /game|gaming|controller|console|nintendo|xbox|playstation/i },
  { id: 'ramen', label: 'Ramen', keywords: /ramen|noodle|food|soup|sushi|dumpling|pho/i },
  { id: 'duck', label: 'Rubber duck', keywords: /duck|bath/i },
]

export function matchLibrary(text: string): string {
  const hit = LIBRARY.find((l) => l.keywords.test(text))
  return hit ? hit.id : 'mystery'
}
