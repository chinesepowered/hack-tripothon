# SF Demo Day (Oct 8): how to demo Capy Post

**Site:** https://hack-tripothon.vercel.app · **Repo:** https://github.com/chinesepowered/hack-tripothon · **Video:** https://www.youtube.com/watch?v=L6b9ko6AgjI

## Before doors open (10 min)
- Laptop on power, **Chrome**, hardware acceleration on (Settings → System). Close heavy apps and turn off notifications.
- **Sound on**: the music and capybara squeaks sell it. A small speaker helps in a loud room.
- Open these tabs in order:
  1. Landing page: https://hack-tripothon.vercel.app
  2. **Backup gift** (has a live-generated Tripo trophy, so there's no waiting): [demo gift link](https://hack-tripothon.vercel.app/#/g/N4IgbiBcCMA0IBcD2VEAsCmACAIhgtkrgIYCeWAVgK4AmA5hgM4jwBmATkvqgplgMLEADuQAKSRgiwBjdhgDuLEPkZ1UAFTTEAdgGtGWVknZZJSIUICW2ulgBGpAIRYAomAzty04aTvF2xFg6NFh0lqxSmHJY8sQG+MQ02PKWvFjq7JZCSAB06Xx0SAA2SdoyPn4BWAicQmjksQaM0lRFQggYIUWW7oac+FhI2tiMGNod2tIYeerEutiBjEhz9hhG0aRIVCbDAB5SSYQ5SrwEGKhDo9pKqQTMkADaoEXEdhhFqACCocWl5SKVQI1cz1JTaJAdVAAZRabQ6XR62Ac6Uy2T6XEGw1MYwmU2O8AQcV0qAALAB2ADMFOgADYKQBOAC0rAwACYyYySQBWVkkxn09kc1g0aA0EmdEmsEkADnOAF9YM9Xu8vlh3J4sC92AwZEhWCzzvBwZDICA8IQsDQyIYqO98SBunZUNI9QaQAqlW8PqbvghrF5iAgwRDzj6qMhGZk6AwQsiMlkkLBTERUkFpAgqMQikUGln9PbHc7A0pYkViZAara5QBdOVAA)
  3. Create page: https://hack-tripothon.vercel.app/#/create
- Check that https://hack-tripothon.vercel.app/api/health says `"live":true`.
- Put the printed QR card on the table (`submission/demo-qr-card.png`), or show it on your phone.
- Keep `submission/capy-post-walkthrough.mp4` downloaded in case everything else fails.

## The 3-minute table demo
1. **Hook (10s):** "When someone you love is far away, a text feels small. Capy Post lets you send them a *world*."
2. **Make it theirs (20s):** on the Create tab, ask the judge: *"What's something you love?"* Type it as one of the three things, put their name in "For", pick two shelf items, and click **Have the capybaras build it**. Tripo starts sculpting their thing live (about 1.5–2 min).
3. **Let them unwrap (60s):** while Tripo works, switch to the backup gift tab and **hand them the laptop**: "This one's for you, tap the box." The box opens, the island grows, the letter types out. Get them to poke a soaking capybara and tap a gift label to read its note.
4. **The Tripo story (40s), pointing at the screen:**
   - "Every capybara and gift is Tripo text-to-3D with one style prompt."
   - "The cat and this capybara were auto-rigged as four-legged animals, so they actually walk. The host was rigged as a biped and greets you."
   - "Our first capybara came out as an upright plush. Tripo's rig-check called it a biped, so it became the host."
5. **Payoff (40s):** back to the Create tab. Their own thing has popped onto the island. Click **Wrap it up**, then **Preview their unwrapping**, or have them scan the QR to open it on their phone.
6. **Close (15s):** "Every gift is a share, and every recipient is one tap from sending one back. Free to send; paid world packs, pet photos to 3D, and 3D-printed keepsakes later."

**Between judges:** reload the backup gift tab (Cmd/Ctrl+R) to re-wrap the box. On the Create tab, click **Make another**.

## If you get a stage slot (60–90s)
Same story, compressed: hook, unwrap the backup gift on the projector, one line on the Tripo pipeline, show the moon and kid worlds ("Peek inside" chips on the landing page), then close. Don't wait on a live generation on stage; use the backup gift.

## If something breaks
- **Venue Wi-Fi is bad:** switch to your phone hotspot.
- **No internet at all:** run it locally. Everything except live generation works offline (models, fonts and audio are bundled):
  `git clone https://github.com/chinesepowered/hack-tripothon && cd hack-tripothon && npm install && npm run build && npx vite preview`
  Then open the URL it prints. The create flow uses the capy shelf automatically. Do this once at home so `npm install` is already done.
- **Tripo is slow:** "Real generation takes a couple of minutes, here's one I made this morning" (the backup gift).

## Likely questions
- **What did Tripo make vs. you?** Tripo made every capybara and gift model, all the rigging and animation, and the live generations. We built the procedural island, the gift box and unwrap, the app, and the gift-link system.
- **How long does generation take?** About 1.5–2 minutes for text-to-3D with fast texturing; then it streams into the scene.
- **How do gifts persist without accounts?** The whole gift is compressed into the link. Live models are fetched by Tripo task id through our API and cached at the edge.
- **What's next?** A photo of your pet becomes a 3D pet that walks around the island (image-to-3D plus quadruped rig), voice notes in the letter, and visiting a world together.
- **Business?** Free to send. Paid: premium worlds, pets, and 3D-printed keepsakes via Tripo's STL/3MF export.
