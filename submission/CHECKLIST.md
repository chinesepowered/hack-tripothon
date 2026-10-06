# Morning checklist (≈15 min). Deadline: Oct 5 AoE = Tue Oct 6, 11:59 UTC (7:59am ET)

1. ✅ **Deployed:** https://hack-tripothon.vercel.app/ · ✅ **Video:** https://www.youtube.com/watch?v=L6b9ko6AgjI
   - (Original steps, for reference.)
   - On GitHub, merge `claude/zealous-shannon-hnndoy` into `main`.
   - [vercel.com/new](https://vercel.com/new) → import `chinesepowered/hack-tripothon` → add env var `TRIPO_API_KEY` → Deploy.
   - Open `https://<your-app>.vercel.app/api/health` and check it says `"live":true`.
   - Open the site, then **Open the gift for you**, and tap the box.
2. **Video:** upload `submission/capy-post-walkthrough.mp4` (YouTube unlisted works) if the form asks for a link.
3. **Submit** with the copy in `SUBMISSION.md`:
   - Direction track **App**, tool track **Tripo**
   - Paste the demo URL, video, and asset board (`asset-board.png`)
4. **Post** (social prizes need 1,000+ likes by Oct 20): use the drafts in `BUILD_LOG.md` with `clip-unwrap-vertical.mp4` / `asset-board.png`, tagged **@TripoAI #Tripothon**.
5. **SF Demo Day, Oct 8:** pitch and checklist in `DEMO_DAY.md`.

### Credits
Each live "type anything" item costs ~20 Tripo credits (~$0.20). When the balance drops below 25, the app quietly switches to the pre-made capy shelf, so nothing breaks. Topping up $5 (500 credits) keeps live generation on through judging (Oct 5–20).

### Security
Both API keys were pasted into chat. Rotate them after the hackathon (Tripo console + ElevenLabs settings). They aren't stored anywhere in this repo.
