# Process stories (draft)

Short process stories for each lab's page, drafted from `behind-the-scenes.md` and the 2026-10-29 interview. They're written in Scott's voice; quotes are his words with typos fixed. Feed order; each heading is the lab's current title, which is how `npm run sync` matches a story to its lab (into `labs/stories.js`). Each one ends with the saved versions it shows as tap-to-play squares (`versions/<lab>/<name>`, or just `<name>` after the first; a `(note)` after one becomes its caption), and a "Still open:" line if something is. Not reviewed by Scott yet.

Thesis for the whole set: *everything is rough at first. Frank critique, iteration and experiment get it somewhere good.*

---

## Prism

The first lab, and the one that set the look for all of them. I wanted my mark sitting on an optics bench, seen from overhead, black and white on a fine grid, where the famous triangle prism would normally be. The ray tracing is real: each wavelength bends by its own amount, and steep hits bounce around inside the chevrons.

Then I looked closer and asked: "is the edge quality of the glass, like, real?" It wasn't. The edges were drawn lines that stair-stepped at the logo's near-45° angles, and the grid behind the glass sat perfectly flat, which real glass would never allow. So the drawn edges went, and one shader does it all now: smooth edges at any angle, the grid bending through the rim and through hammered-glass ripples, and color fringing where each channel refracts on its own. Black glass edges came from memory: I'd seen thick glass go black at the rim and wanted that.

*Versions: none saved. The bench look started here.*

## Vessel

Each chevron is a sealed glass vessel of liquid. The first versions were a good liquid sim and nothing more. The idle motion was a sine-wave rock, and I swapped it for "a smack every few moments", so ambient motion feels like things happening, not a metronome.

The turn was the color. The liquid sat in an ombre, and for some reason that fired off a memory of iodine clock reactions: clear to black, all at once. Now fronts nucleate under the surface and sweep the vessel, stepping the color along the palette, with a thin rainbow sheen riding each front. Then I tied it to the smacks: each hit starts a front where it lands. Two separate rhythms were too busy, and one nudge can reasonably cause both.

It's the call I'm proudest of. I wish it were something more clever, but it's just so good-looking, and it's often people's favorite. Later came the flip: an anticipation tilt, a 180, a little overshoot and settle, with the liquid lagging behind the glass.

*Versions: `vessel/09` (before the reaction) → `vessel/13-pre-gravity-flip` (reaction, no flip) → live.*
*Still open: a tap should drop in a reagent and start a front where you touch.*

## Neon Oil

The plan was always to lift the mark out of a pool of oil, with the camera riding up alongside so the logo never moves in frame. The first build missed that. It came back as a pool you poke, with ripples and drips. Part of reviewing is catching what *didn't* arrive.

Once the lift was in, the drips were the problem: every one behaved the same. Now they creep downhill along sloped edges at their own pace, merge when they touch, and snap back into the pool instead of standing up as spikes. Then the solid mark showed through the thinning oil, and a thin-film rainbow appeared at the draining edge. That rainbow is what sold it. As the coat drains, the crisp shape wins, and the physics tells the story.

Last, I took it off the tripod: a handheld camera and a hanging wobble. Locked off, it looked like a render. It's also sleight of hand: if the frame is moving, you don't dwell on the aliasing.

*Versions: `goop/04` (a pool, no lift) → `05` (the lift) → `07` → `10` (drips with character) → `12` (the mark and the rainbow) → live.*

## Knockout

The mark stands on three plinths and you throw heavy balls at it. At first it only did anything when you threw, so it was boring to just watch. I made it fire on its own, then alternate left and right, and tuned it by rhythm rather than physics: five shots, 0.75 s apart, then a reset.

The rule across every lab is that my mark stays on screen. Knockout literally knocks it off. So it leaves a dashed crime-scene outline where it stood, and you always see what was there. The pieces gliding home read as the logo restoring itself, not just a reset. This is where I discovered that trick, and I've gone on to use it elsewhere.

Much later I decided it needed a surprise. At the end of the volley, every ball bursts into five, and each of those into five more. It goes from a few heavy hits to a hailstorm of glass beads, and that's the end of each cycle.

*Versions: none saved.*

## Big Bang

As an astrophotographer, I was curious how realistically I could render a nebula. Eventually I decided that wasn't a fair ask. So I sent it off in a few directions, fed it Shadertoy pieces I liked (the blob from one, without its dithering; a breathing ring from another; plus metaballs), and the nebula it has now showed up out of the blue while I was focused on other labs. I tuned it until I liked it.

The trouble was the bang. It was built exactly to my brief, and it was "finnne". It was the only lab that didn't keep the logo on screen. I asked Claude what to do about that, and it suggested running the story backwards: a cold cloud that collapses under gravity and ignites as the mark. I loved it. Now it tells the same story as Neural and Goop: out of chaos, the mark.

Honestly, I'm a little bored with it. The ending reads like a black hole, and I might go louder with it, get weird, and have something accrete into the logo.

*Versions: `bigbang/01-explosion-original` → `02-v1` → `03-v2` → `04-v3` → `05-collapse-rework` → live.*

## Radiant

A lamp behind the mark in a hazy room, and the chevrons carve shafts of shadow toward you. It was pretty much right out of the tube, and most of the work was tuning sliders. For a shake-up I added violent rainbow bursts, because rainbow light is something I love to flash into my designs wherever I can.

To be candid, it sits in the bottom middle of the pack. It's something people have seen before. It's fiiiine.

*Versions: `logo-light/05-pre-burst` → `06-burst` → `07-burst-wander` → live.*

## Maze

This one took the most rounds. The first version filled the search with a rainbow. I hadn't asked for that, and I liked it at first, but slowly I noticed it wasn't communicating anything. It was just eye candy. So I asked what the fill was *for*, and cut it back, a little at a time, until it showed only the dead ends. Color got one more chance, to show how far each path had reached, and when that wasn't clear enough it went to plain gray.

The maze is cut along the logo's own grain. The arms meet at 85.6°, not 90°, so every straight edge of the mark is a cell wall, and each chevron holds its own maze. Before a search starts, a dot and a flag drop on and the dot glides to the flag, so the goal is shown, not printed.

The big idea came from staring at the zoom-in loop: why can't the tiny logo in the middle literally be the next maze? Now it is. It hides as ordinary dead-end corridors until the solve lights it up, and the dive into it is seamless. I had a color-inversion burst for the finale and cut it, because it was too much noise. The point is a maze within a maze, hidden in plain sight, and I spent a lot of time removing anything flashy that distracted from that.

*Versions: `maze/01-pre-technical-drawing` (rainbow) → `12` → `13-burst-finale` → `13b-pre-loop` → `14-recursive-visible` → live.*

## Pachinko

A pegboard everywhere the mark isn't. It was mostly right from the start. The work was reflowing the pixel pitch, finding the right tuning knobs, and a fair bit of refactoring.

The one real note: solve the pegs from the logo outward instead of dropping the logo onto an existing grid. That way the pegs line up with the thing that matters visually, the mark, rather than the walls. Now it composes.

*Versions: `pachinko/01-pre-lattice` → live.*

## Neural Mark

A small network learns the mark live. It was color from day one: I picked a starting point as far from the end result as possible, so the journey would look dramatic. But my logo is black and white, and I designed it that way. So the color became the error. Vivid noise at the start is how wrong the network still is, and it fades to pure black and white as it learns. You watch it get it right without a chart. Scribble on it and it forgets, then heals, and if nobody scribbles, it scribbles on itself.

*Versions: `neural/01-round1` → live.*

## Falling Sand

I've played so many falling-sand games over the years that I knew the basic DNA. After the simple elements, I kept adding what I expected to be there: embers that light wood, ash left behind, lily pads and lotus in the water.

It became mine in the stage. Bedrock started as a stone band around the mark, then filled to the edges, then became a round basin, a quarry. I asked for dinosaur fossils in the rock and kept tuning them, bigger, fewer and lower contrast, until they read as part of the rock rather than stickers.

The reset came from a friend. They suggested a drain. I laughed: cool, but silly. I kept thinking about it. It works because everything keeps its own look (lava glow, fire flicker, wood grain, flowers) while suddenly behaving like water. It's a visual surprise, and it drains fast enough not to get old from loop to loop. Then I hid the drain itself, so it just pours out the bottom.

*Versions: `sand/01` → `02` (embers) → `03` (ash) → `04` → `05` (lotus) → `06-pre-bedrock` → `07-stone-band` → `08-fill-to-edge` → `09-first-fossils` → live.*

## Life

The mark as a still life in Conway's Game of Life, until a glider unravels it. I love a big, busy game of life, but the simpler the grid, the more visible the steps. So I committed to going as coarse as possible.

My measure of success was a perfectly regular grid with no irregular seams, even if the logo had to cheat a little. The dense version couldn't hold at the chevrons' inside corners, and one stray seam in a field of identical squares reads as a bug. So blocks moved to wider gaps, and every edge snaps to one shared grid. The grid leans to the logo's own angle, which makes it diamonds, and that makes it unlike the classic.

*Versions: `life/02-square-grid` → `03-dense-lattice-pitch3` → live.*

## Splat!

You see a fine grid, slowly zooming. It turns out the camera is locked to the mark, the mark is made of Nickelodeon-style slime, and it's falling fast.

Every revision was about the loop. If a lab goes on a journey, it's more fun if it loops, and novel loop seams are something I'm always chasing. First, the splat tore open to reveal the next drop. Nice, but it was an effect. Then the next drop fell through the splat. Now the next mark pops up out of the splat on impact, the floor opens in the splat's own shape, and down they both go.

Along the way: lose the sharp corners and go pure goop, true free fall from rest, and it tilts toward your finger and flutters like a parachute as it speeds up.

I'm not married to all of it. I'd still like a putty or clay feel, but right now it's too 2D. It might be more fun if it tumbled and could land in any orientation.

*Versions: none saved.*
