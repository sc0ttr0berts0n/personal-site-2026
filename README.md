# personal-site-2026

Scott Robertson's portfolio: a sideways swipe feed of interactive logo "labs". Plain static files, no build.

```
npm run sync     # copy the labs in from ../sr-personal-2026/labs (or: node scripts/sync-labs.mjs <labs folder>)
npm run serve    # http://localhost:8123/
```

- `index.html`, `site/`: the feed. `site/config.js` holds the order, the start toy, the toys too heavy to preload, and the artist card.
- `labs/`: **generated** by `npm run sync`, never edited by hand. The labs are developed in `sr-personal-2026/labs`; the sync copies the lab pages, `shared/`, `notes/behind-the-scenes.md` and `notes/versions/`, writes `labs/manifest.js`, and adds one `<script>` tag to each lab page for the embed hooks.
- `embed/lab-embed.js`: the embed hooks. `lab.html?embed=1` shows the stage only; the feed plays, pauses and snapshots it by postMessage. Without `?embed` it does nothing.

URLs: `/#sand` opens the feed on a toy; `/#prism/glass_diamond~pal_reef` also carries a lab's settings code into the toy and its "Play with this" link. `?stats` shows a frame-time readout; `?solo` turns off preloading (for measuring).
