# Process stories (draft)

Short process stories for each lab's page, drafted from `behind-the-scenes.md` and the 2026-10-29 interview. They're written in Scott's voice; quotes are his words with typos fixed. Feed order; each heading is the lab's current title, which is how `npm run sync` matches a story to its lab (into `labs/stories.js`). Saved versions sit between the paragraphs that talk about them, as tap-to-play squares (`versions/<lab>/<name>`, or just `<name>` after the first; a `(note)` after one becomes its caption), and a "Still open:" line if something is. Not reviewed by Scott yet.

Thesis for the whole set: *everything is rough at first. Frank critique, iteration and experiment get it somewhere good.*

---

## Prism

This was the first lab, and it set the look for the rest. I wanted my logo on an optics bench, seen from overhead in black and white on a fine grid, sitting where the famous triangular prism would normally be. The ray tracing is real. Each wavelength of light bends by its own amount, and rays that strike at a steep angle bounce around inside the logo's chevrons.

It already looked like glass, which can be quite optically clear when it needs to be. What I was after was the feel of glass. I drew on the title sequence of "Stranger Things" and wanted something a little analog and vintage. The optics are tightly simulated, so I loved the idea of some parts being imprecise. The drawn edges, which stair-stepped at the logo's near-45-degree angles, went away, and so did the perfectly flat grid behind the glass. A single shader, the small program that colors each pixel, now does it all, with smooth edges at any angle, a grid that bends through the rim and through ripples like those in hammered glass, and color fringes where red, green and blue each refract on their own. The black edges came from memory. I had seen thick glass go black at the rim, and I wanted that.

This one goes way back. It was the preview I made before I had even committed to building the site. The record keeping started here, so there are no earlier versions to show.

*Versions: none saved.*

## Vessel

Each chevron is a sealed glass vessel of liquid. The first versions were a good liquid simulation and little else. When idle, the liquid rocked back and forth on a steady rhythm. I replaced that with "a smack every few moments," so that the motion felt like things happening rather than a metronome.

*Versions: `vessel/09` (before the reaction)*

The turning point was the color. The liquid sat in a gradient, and for some reason that brought back a memory of iodine clock reactions, the chemistry demonstration in which a clear solution turns black all at once. Now a front of color forms under the surface and sweeps through the vessel, stepping along the palette with a thin rainbow sheen riding its edge. I then tied the fronts to the smacks, so each hit starts one where it lands. Two separate rhythms were too busy, and a single nudge can plausibly cause both.

*Versions: `vessel/13-pre-gravity-flip` (the reaction, before the flip)*

It's the call I'm proudest of. I wish it were something more clever, but it's beautiful, and it's often people's favorite. Later came the flip. The vessel tilts in anticipation, turns 180 degrees, overshoots a little and settles, with sympathetic motion in the liquid as it lags behind the glass. Most recently, I made a press start a reaction right where you touch, so you can set off the chemistry yourself.

## Neon Oil

The plan was always to lift the logo out of a pool of oil, with the camera rising alongside it so the logo never moves in the frame. The first build missed that and came back as a pool you could poke, with ripples and drips. Part of reviewing is catching what didn't arrive.

*Versions: `goop/04` (a pool, no lift) → `05` (the lift)*

Once the lift was working, the drips were the problem, because every one behaved the same. Now they creep downhill along sloped edges at their own pace, merge when they touch, and snap back into the pool instead of standing up as spikes.

*Versions: `goop/07` → `10` (drips with character)*

Then the solid logo began to show through the thinning oil, and a rainbow, like the one on a film of oil in a puddle, appeared at the draining edge. That rainbow is what sold it. As the coat drains, the crisp shape wins.

*Versions: `goop/12` (the logo and the rainbow)*

Last, I took it off the tripod, with a handheld camera and a hanging wobble. Locked off, it looked like a computer rendering. The movement is also sleight of hand, because when the frame is moving, you don't dwell on the jagged edges.

## Knockout

The logo stands on three plinths, and you throw heavy balls at it. At first it did something only when you threw, which made it dull to watch. I made it fire on its own, then alternate left and right, and tuned it for rhythm rather than physics: five shots, three-quarters of a second apart, then a rewind-like reset.

The rule across every lab is that my logo stays on screen, and Knockout literally knocks it off. So it leaves a dashed crime-scene outline where it stood, and you can always see what was there. The pieces gliding home read as the logo restoring itself rather than as a reset. I discovered that trick here, and I've gone on to use it elsewhere.

Much later, I decided it needed a surprise. At the end of the volley, every ball bursts into three, and each of those into three more, turning a few heavy hits into a hailstorm of glass beads to end each cycle. It started as five and five, and came down to three and three for performance, with a similar feel.

*Versions: none saved.*

## Big Bang

As an astrophotographer, I was curious how realistically I could render a nebula. Eventually I decided that wasn't a fair ask. So I sent the agent off in a few directions and fed it pieces I liked from Shadertoy, a site where people share graphics programs: a blob from one, a breathing ring from another, and the soft, merging shapes known as metaballs. What came back wasn't exactly under my direction. It became more about coalescence and explosions than about an authentic nebula, and by going abstract, I wasn't bound to the integrity of the effect.

*Versions: `bigbang/01-explosion-original` (the original explosion) → `02-v1` → `03-v2` → `04-v3`*

The trouble was the bang. It was built exactly to my brief, and it was "finnne." It was also the only lab that didn't keep the logo on screen. I asked the agent what to do about that, and it suggested running the story backward, with a cold cloud that collapses under gravity and ignites as the logo. I loved it. Now it tells the same story as Neural Mark and Neon Oil, in which the logo emerges from chaos.

*Versions: `bigbang/05-collapse-rework` (the collapse)*

Then I got a little bored with it. The ending read like a black hole, so I went louder and leaned in. Now the logo is a black hole for the whole loop. Gas and stars bend around its shadow, a disk of glowing matter hugs its outline, a thin band tilted 10 degrees crosses it, and embers orbit it. It also opens just before the logo coalesces and loops from there, so you skip the wait.

## Radiant

Radiant puts a lamp behind the logo in a hazy room, and the chevrons carve shafts of shadow toward the viewer. It worked almost from the first try, and most of what followed was adjusting sliders.

*Versions: `logo-light/05-pre-burst` (before the bursts)*

To shake it up, I added violent bursts of rainbow light, something I flash into my designs whenever I can.

*Versions: `logo-light/06-burst` (the bursts) → `07-burst-wander` (bursts that wander)*

I'd rank it in the bottom middle of the set, since people have seen this effect before. That's fine. Sometimes the rests between the notes matter as much as the chords.

## Maze

This one took the most rounds. The agent's first version filled the search with a rainbow. I hadn't asked for that, and I liked it at first, but I slowly noticed that it wasn't communicating anything. It was eye candy. So I asked what the fill was for, and cut it back a little at a time until it showed only the dead ends. Color got one more chance, to show how far each path had reached, and when that wasn't clear enough, it went to plain gray.

*Versions: `maze/01-pre-technical-drawing` (rainbow) → `12`*

The maze is cut along the logo's own grain. The arms meet at 85.6 degrees rather than 90, so every straight edge of the logo is a cell wall, and each chevron holds its own maze. Before a search starts, a dot and a flag drop on and the dot glides to the flag, so you know what it's looking for.

The big idea came from staring at the zoom-in loop. Why couldn't the tiny logo in the middle literally be the next maze? Now it is.

*Versions: `maze/13b-pre-loop` (before the loop) → `14-recursive-visible` (the next maze, not yet hidden)*

It hides as ordinary dead-end corridors until the solution lights it up, and the dive into it is seamless. I had a color-inversion burst for the finale and cut it as too much noise.

*Versions: `maze/13-burst-finale` (the burst finale)*

The point is a maze within a maze, hidden in plain sight, and I spent a lot of time removing anything flashy that distracted from that, so the reveal can be exciting.

## Pachinko

This is a simulated pegboard with the logo in the middle and balls running through the grooves. It was mostly right from the start. The work was adjusting the spacing of the pegs, finding the right controls to tune it, and a fair amount of cleaning up the code.

*Versions: `pachinko/01-pre-lattice` (pegs on an existing grid)*

My one real note was to place the pegs from the logo outward, instead of dropping the logo onto an existing grid. That way the pegs line up with the thing that matters visually, the logo, rather than with the walls. Now it holds together as a composition.

## Neural Mark

A small neural network learns the logo live. For dramatic effect, I fed color noise into the network as a starting point and let it find its way to the logo's sharp, high-contrast black and white. So the color became the error. Vivid noise at the start shows how wrong the network still is, and it fades to pure black and white as it learns.

*Versions: `neural/01-round1` (the first round)*

You can watch it get it right in the picture alone, but the data visualization is part of the show too, with a diagram of the network and its neurons lighting up, an error curve, and a filmstrip of past generations. They sit in the empty space around the logo and fade out before they reach it. Scribble on it and it forgets, then heals. If nobody scribbles, it scribbles on itself.

## Falling Sand

I've played so many falling-sand games over the years that I knew the genre's basic DNA. After the simple elements, I kept adding what I expected to find: embers that light wood, ash left behind, lily pads and lotus in the water.

*Versions: `sand/01` → `02` (embers) → `03` (ash) → `04` → `05` (lotus)*

It became mine in the stage. The bedrock started as a stone band around the logo, then filled to the edges, then became a round basin, a quarry.

*Versions: `sand/06-pre-bedrock` (before the bedrock) → `07-stone-band` (a stone band) → `08-fill-to-edge` (filled to the edges)*

I added dinosaur fossils to the rock and kept tuning them, making them bigger, fewer and lower in contrast, until they read as part of the rock rather than as stickers.

*Versions: `sand/09-first-fossils` (the first fossils)*

The reset came from a friend, who suggested a drain. I laughed. Cool, but silly. I kept thinking about it. It works because everything keeps its own look, from the lava's glow to the wood's grain, while suddenly behaving like water. It's a visual surprise, and it drains fast enough not to get old from loop to loop.

## Life

The logo begins as a still life, a stable pattern in Conway's Game of Life, the classic simulation in which cells live or die by a few simple rules. Then a glider, a small pattern that travels across the grid, unravels it. I love a big, busy Game of Life, but the simpler the grid, the more visible the steps, so I committed to going as coarse as possible.

My measure of success was a perfectly regular grid with no irregular seams, even if the logo had to cheat a little. The dense version couldn't hold at the chevrons' inside corners, and one stray seam in a field of identical squares reads as a bug.

*Versions: `life/02-square-grid` (a square grid) → `03-dense-lattice-pitch3` (the dense version)*

So the blocks moved to wider gaps, and every edge snaps to one shared grid. The grid also leans to the logo's own angle, which turns the squares into diamonds and sets it apart from the classic.

## Splat!

You see a fine grid, slowly zooming. It turns out the camera is locked to the logo, the logo is made of Nickelodeon-style slime, and it's falling fast.

Every revision was about the loop. A lab that goes on a journey is more fun if it loops, and I'm always chasing novel ways to close one. First, the splat tore open to reveal the next drop, which was nice but only an effect. Then the next drop fell through the splat. Now the next logo pops up out of the splat on impact, the floor opens in the splat's own shape, and down they both go.

Along the way, I lost the sharp corners in favor of pure goop, made the fall a true free fall from rest, and had the logo flutter like a parachute as it speeds up.

Then I let it tumble. It used to lean toward your finger and level out just before impact, so it always met the floor flat and square. Now a tap or a flick sends it spinning, it never rights itself, and it splats however it lands, with the puddle, the spray and the hole all following how it came down. Turned edge-on, the flat sheet vanished, so I asked for thickness, and now it has a gooey rim that catches the light as it rolls.

I'm not married to all of it. I'd still like to see a putty or clay feel.

*Versions: none saved.*
