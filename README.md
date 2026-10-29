# personal-site-2026

Scott Robertson's portfolio: a sideways swipe feed of interactive logo "labs". Plain static files, no build.

```
npm run sync     # copy the labs in from ../sr-personal-2026/labs (or: node scripts/sync-labs.mjs <labs folder>)
npm run serve    # http://localhost:8123/
```

- `index.html`, `site/`: the feed. `site/config.js` holds the order, the start toy, the toys too heavy to preload, and the artist card.
- `labs/`: **generated** by `npm run sync`, never edited by hand. The labs are developed in `sr-personal-2026/labs`; the sync copies the lab pages, `shared/`, `notes/behind-the-scenes.md` and `notes/versions/`, writes `labs/manifest.js`, and adds one `<script>` tag to each lab page for the embed hooks.
- `embed/lab-embed.js`: the embed hooks. `lab.html?embed=1` shows the stage only; the feed plays, pauses and snapshots it by postMessage. Without `?embed` it does nothing.

URLs: `/#sand` opens the feed on a toy; `/#prism/glass_diamond~pal_reef` also carries a lab's settings code into the toy and its "Change This" link. `?stats` shows a frame-time readout; `?solo` turns off preloading (for measuring). Moves between toys play a WebGL ripple (`site/transition.js`); `?fx=off` keeps the plain slide, which reduced motion and browsers without WebGL also get. The ripple plays over stills: both toys hold still under it and the incoming one starts as it lifts. Swiping has two tiers: until you touch the toy on screen a swipe moves on easily; once you have, leaving (from the edge zones too) takes a long pull (45% of the screen) that grows a bubble of the toy itself, and letting go short shrinks it back. On a tall screen two quiet chevrons mark where a swipe starts (the foot of the top edge zone, and over the caption); they light up during a swipe. Neighbours load only once the toy on screen has drawn, so a toy still compiling its shaders (Goop) doesn't stall the ones starting up behind it. While a toy loads, its slide (and the ripple) shows the toy's first frame from `posters/first/` (`npm run posters -- --first` remakes them), falling back to the breathing mark until the image has loaded.
