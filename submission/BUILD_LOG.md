# Build log + social posts (ready to paste)

The social prizes need **@TripoAI** and **#Tripothon** on the post, a public view count, and **1,000+ likes by Oct 20**. Attach the clip or image listed under each post. Videos and vertical clips are in this folder.

---

### Post 1: the hook (attach `clip-unwrap-vertical.mp4`)
I built a gift you unwrap into a whole tiny world 🎁

Tell it 3 things someone loves → a crew of capybaras builds them a floating hot spring island → you send a link → they tap the box and the world grows out of it.

Every capybara + gift is generated with @TripoAI #Tripothon

---

### Post 2: the Tripo pipeline (attach `asset-board.png`)
Every capybara and gift object in Capy Post came out of @TripoAI text-to-3D, then got auto-rigged:
🐾 quadruped rig → walk cycle (capybara, cat)
🕺 biped rig → greet / dance / cheer (the host)

Funny part: my first capybara came out as an upright plush, Tripo's rig-check said "biped"… so it became the host 🫡 #Tripothon

---

### Post 3: live generation (attach `capy-post-walkthrough.mp4`, or trim the build section)
Type anything ("a little red bicycle with a basket") and Tripo sculpts it live while worker capybaras haul crates around the island. When the model's done, the crate pops open 📦✨

Waiting on AI, but make it cute. @TripoAI #Tripothon

---

### Post 4: invite people to try it (attach a screenshot of the letter)
Made a tiny world for whoever opens this link. There's a hot spring, a yuzu, and a capybara with a letter for you ♨️🍊

https://hack-tripothon.vercel.app/

Then build one for someone you miss. @TripoAI #Tripothon

---

## Build log (for the optional "public build log")
- **Hour 0:** Picked the theme angle: "a world as a gift" taken literally. Gift box → unwrap → world. Capybaras as the delivery crew.
- **Hour 1:** First Tripo capybara came back as an upright plush; rig-check called it a biped. Made it the host and re-rigged with 5 biped presets in one retarget call.
- **Hour 2:** Generated the rest of the cast with one shared style prompt: a four-legged capybara and a cat (quadruped rig + walk), plus 8 gift objects.
- **Hour 3:** Floating island, onsen water shader, steam, petals, and a gift box whose walls fold open like petals.
- **Hour 4:** Live generation: anything typed is sculpted by Tripo text-to-3D. Worker capybaras carry crates while it runs. GLBs stream through our own route because Tripo's CDN has no CORS headers.
- **Hour 5:** ElevenLabs for music, sound effects and narration. A deterministic capture rig records the real app frame by frame for the walkthrough.
- **Demo-day prep:** a 2:42 stage cut. Same capture rig, new shots paced to sentence-level ElevenLabs timestamps, with captions generated from the same alignment data.
