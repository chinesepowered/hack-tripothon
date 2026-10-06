# Capy Post — submission copy (paste-ready)

## Name
Capy Post

## Tagline (<100 chars)
Send someone a tiny 3D world: capybaras build it from things they love, wrap it, and deliver it. (96 chars)

## Tracks
- **Direction track:** App (web, AI-native product)
- **Tool track:** Tripo

## Links
- Playable demo: **https://hack-tripothon.vercel.app/** (click "Open the gift for you": a gift addressed to the judge, no login)
- Walkthrough video: **https://www.youtube.com/watch?v=L6b9ko6AgjI** (1:39, narrated). It's a real screen recording of the app, with one live Tripo generation (sped up and labelled). File: `submission/capy-post-walkthrough.mp4`
- Visual asset board: `submission/asset-board.png`
- Repo: https://github.com/chinesepowered/hack-tripothon

## A gift for ___ (≤60 chars)
**anyone you miss — starting with you, dear judge** (47 chars)

Alternatives: "someone far away you can't hug today" (36) · "the people we miss, delivered by capybaras" (42)

## Theme: "Build a world as a Gift"
Capy Post takes the theme literally. You build a world *for one specific person*: their world, their three favourite things, and your letter, delivered in a box they unwrap. The three world styles come straight from the theme's taglines: a cozy capybara onsen, **the moon's dark side**, and **the kid you used to be**.

## Description (short, ~80 words)
Capy Post turns "I was thinking of you" into a tiny 3D world. Tell it who a gift is for and three things they love. A crew of capybaras builds a floating hot-spring island around them, wraps it, and gives you a link. Your friend taps the box, the walls fall open, a world grows out of it, and a capybara hands over your letter. Every capybara and gift is generated with Tripo; the animals are auto-rigged and animated by Tripo; anything you type is sculpted live.

## Description (long)
**What it is.** A gifting app where the gift is a world. The sender picks a world, three things the recipient loves (from a shelf of Tripo-made models, or typed freely), and writes a letter. The recipient gets a link that opens on a wrapped present. Tapping it runs the unwrap: the bow spins off, the lid flies, the walls fold open like petals, and a floating island grows out of the box. Their gifts pop onto pedestals, a host capybara greets them, and the letter types itself out. They can wander the island, poke the capybaras soaking in the onsen, tap gifts to read the sender's notes, and send one back.

**How Tripo is used.**
- **Text-to-3D (v3.1)** generated the whole cast and every library gift (11 models) with one shared style prompt, so everything reads as one toy set.
- **Auto-rig + retarget**: `rig-check` → `rig` with `rig_type: quadruped` (v2.5) → `preset:quadruped:walk` for the walking capybara and the cat; a **biped rig** (v1.0) with five presets batched in one retarget call (greet, dance, walk, relax, cheer) for the host capybara. Tripo returns them as one 12-second performance, which we restart on the reveal so the greeting lands as the letter opens.
- **Live generation in the product**: whatever the sender types is generated on demand (texture v3.5 "fast", 8k faces for the web). While it runs, worker capybaras haul crates around the island, so the wait becomes part of the gift. The crate pops open into the new model.
- **Persistence without a database**: gifts are compressed into the URL. Live models are referenced by Tripo task id and streamed through our `/api/model` route (Tripo's CDN has no CORS headers) with long edge caching, so links keep working after signed URLs expire.
- A happy accident: our first capybara came out as an upright plush and `rig-check` called it a biped. It became the host, which unlocked Tripo's 90+ biped presets.

**Stack.** React Three Fiber, drei, postprocessing, a procedural island (rocks, trees, torii, lanterns and the gift box are code-built) with a custom onsen water shader, Vercel functions for the Tripo proxy, ElevenLabs for music, sound effects and narration.

## Why it fits the judging criteria
- **Creativity:** the gift *is* a world, and the unwrap is the payoff. Generation latency is turned into a scene: capybaras build your gift.
- **Completeness:** the full loop works end to end: create → live Tripo generation → wrap → share link → unwrap → explore → send one back. Three world themes, sound, music, and mobile layout. It works without a backend too, falling back to the Tripo-made library.
- **Theme fit:** a world built for a person, plus worlds for the moon's dark side and the kid you used to be.
- **Viral potential:** every gift is a share, and every recipient is one tap from sending one back. The unwrap moment is made for short clips. Capybaras.
- **Commercial value:** digital gifting and e-cards (birthdays, holidays, long-distance friends). Paid upgrades: more world packs, pets via image-to-3D, and 3D-printed keepsakes (Tripo exports STL/3MF).

## Team
<names / handles>
