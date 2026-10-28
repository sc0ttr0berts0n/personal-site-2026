# Behind the scenes

A running log of the calls that shaped the labs: the ideas that caused a breakthrough, or that the final look depends on. Each entry records what Scott asked for, why it mattered, and what it turned into. Source material for a future "how I work" section of the site.

Entries are newest last. Quotes are Scott's own words from the working sessions.

---

## 2026-10-28: Labs build

### Commit to toys, with the logo as the hero
> "okay, lets commit to toys with my logo as the hero."

- **The call:** After a round of open design ideation, Scott dropped the portfolio-page framing. He made the site a set of interactive toys, all built around one mark.
- **Why it mattered:** It gave every experiment the same subject. Six very different techniques (ray optics, fluid, rigid bodies, raymarching, volumetrics, search algorithms) now read as one body of work rather than a grab bag.
- **Result:** Seven labs: Prism, Vessel, Goop, Knockout, Big Bang, Light, Maze.

### The logo as a prism on an optics bench
> "use my logo … to create a refractive effect like a light bench but with my logo instead of dark side triangle prism"

- **The call:** Swap the most famous prism image for his own mark, seen from overhead like a lab bench.
- **Result:** Lab 01. A real 2D ray tracer with per-wavelength Snell's law, total internal reflection and Fresnel, using real glass indices.

### One key square for every lab
> "plan each of these as squares of key area so they work well on mobile and desktop. wider on desktop, taller on mobile … even composed in a square."

- **The call:** Before any lab was built, fix the logo's size and composition. The logo sits in a square that is the largest that fits, and the stage stretches around it.
- **Why it mattered:** It turned into the shared lab shell (`shared/lab.js`): the same framing, corner ticks and grid alignment everywhere. Phones and desktops get the same composition. Every lab could be built in parallel without drifting apart.

### Optics-bench look, but sold like a 4K OLED TV
> "I like the original 'optics bench' look and feel with a small square grid, black and white."
> "diverse color options per each … vivid … Kind of like selling a 4k oled tv."

- **The call:** A strict black-and-white scientific base, plus deliberately extravagant palettes on top.
- **Result:** Every lab defaults to a calm bench and offers 6–8 vivid palettes, tuned per lab (for example, the Hubble/Webb/Chandra palettes in Big Bang).

### Labs with parameters, not finished pieces
> "one artifact per toy. consider them 'labs' with adjustable parameters."

- **The call:** Expose the knobs and let visitors play.
- **Why it mattered:** It also became the tuning workflow. Scott tunes by hand, then sends back a settings code (e.g. `#fill_69~viscosity_4~contact_150~ior_1.06…`). That code becomes the new default. Taste stays with the human; the code makes it exact and repeatable.

### "Stranger Things" as a reference for glass
> "I'd love it to look like the stranger things logo reveal to some extent"

- **The call:** Use a cultural reference to steer the glass's mood.
- **Result:** The Neon Reveal preset: red neon inline edges, flicker, grain, a backlight swell, and a zoom-out reveal timeline.

### Big Bang as a story, not a zoom
> "logo filled with nebula, the nebula explodes and fills the whole screen, my logo pieces tumbling away in a bright flash of light, big bang stuff."

- **The call:** Turn "zoom through the logo into a galaxy" into a narrative with a before, a flash, and an after.

### Cygnus Loop, "like rendering the earth's atmosphere"
> "reference the cygnus loop … nebulicity on the edges most visible because there is more matter there. like rendering the earth's atmosphere."

- **The call:** He understood limb brightening without naming it. A sight line that grazes a shell's edge passes through more material, so the rim glows. He also asked for the camera to orbit so the volume reads.
- **Result:** The aftermath became a remnant shell whose bright rim comes from the geometry itself.
- **Follow-up:** Keep it largely circular, and let it pulse and grow like a Shadertoy energy orb, more abstract.

### From a scientific nebula to an energy orb
> "I love shader toy objects that look like pulsing orbs … THE BLOB in this one but not the dithering … ohhhh, also metaballs"

- **The call:** Once the physically motivated shell worked, Scott traded accuracy for beauty.
- **References:** He pulled two Shadertoy pieces and named exactly which part of each mattered.
  - From [wfscRX](https://www.shadertoy.com/view/wfscRX): a noise-breathing ring with an orbiting highlight.
  - From [ltSSzW](https://www.shadertoy.com/view/ltSSzW): the blob alone, without its dithering.
- **Metaballs:** He added them as a third ingredient.
- **The habit this shows:** borrowing a specific technique from a reference, not its whole look.

### Cut the maze along the logo's own grain
> "rotate the cells of the maze 45 degrees to align with the edges of the maze. 3 sep mazes, not a means to bridge from logo section to logo section"

- **The call:** The maze should respect the mark's geometry, not sit on a generic grid clipped by it.
- **Result:** On measurement the arms meet at 85.6°, not 90°. The maze uses a rhombic lattice read from the logo's own edges, so every straight edge of the mark is a cell wall. There are three independent mazes, one per chevron.

### Show intent, don't print it
> "I'd like to see it announce its intent visually (not with text). a dot and a flag. flag drops on, the dot drops on, the dot then moves to the flag. use more lerping rather than blip blip blip frame by frame jank. smooth."

- **The call:** Algorithm visualizations usually narrate with labels. Instead, a tiny piece of choreography makes the goal obvious before the search starts.

### "Is the edge quality real?"
> "is the edge quality of the glass on prism like, real? … I would like to see some noise texture on the glass and some warping of the background grid … that is what it would literally do right?"

- **The call:** He questioned the rendering itself and pushed toward physical honesty.
- **What was wrong:** The edges were drawn line geometry, aliasing at the logo's near-45° angles. The grid behind the glass was untouched, which real glass would never do.
- **Result:** One shader replaces the drawn edges and the flat glass.
  - The edges come from a distance field, so they are smooth at any angle.
  - The grid bends where the surface tilts: through the rounded rim and through hammered-glass ripples.
  - The rim fringes into color, because each channel refracts at the glass's own index.

### Black glass edges, from memory and a reference
> "is it possible to get a black edge, or an edge that is black and white somehow? I've thinking of black edges of glass I've seen in the past."

- **The call:** Scott remembered how real thick glass looks at its edges, then found a reference ([wccSDf](https://www.shadertoy.com/view/wccSDf)) whose rim reflects a fake studio light.
- **Result:** Two physically motivated rim modes.
  - **Black rim:** light is trapped and absorbed in the steep rim.
  - **Studio reflection:** edges facing one diagonal mirror a bright light, and the others mirror a dark room.
- **Why it fits:** The logo's arms sit near ±45°, so the studio mode splits its edges cleanly into black and white families.

### Knockout: a smack, a volley, and a chalk outline
> "I need it to get hit 5 times before a reset and every 0.75 seconds" · "leave the sillouette of the logo as it should be behind … a 'body outline' kind of look."

- **The call:** Scott tuned Knockout by rhythm rather than physics.
  - Heavy balls, alternating sides, five shots 0.75 s apart, and a quick reset.
  - Then a dashed crime-scene outline of the mark left where it stood.
- **Why it mattered:** The outline turns every knockout into a before and after. You always see what was there, so the pieces gliding home read as the logo restoring itself, not just a reset.
- **Same session, Vessel:** He swapped the idle sine rock for "a smack every few moments" that shoves as well as spins. The fill now drifts 60–95% on an 8 s cycle. Ambient motion should feel like events, not a metronome.

### Neural: let the color be the error
> "Color would be great, but still have the logo in b&w as I've designed it. So the color noise will be an artifact that must be tuned out."

- **The call:** The network paints in full RGB, but its target is the true black-and-white mark. Scott wanted color, but not on the brand.
- **Why it matters:** The color becomes a readout of how wrong the network still is. Vivid noise at the start fades to pure black and white as it learns, so you can watch it "get it right" without a chart.
- **The rest of the brief:** smooth learning, not noisy evolution. Show the network itself and its error curve. Scribble on it to break it and watch it heal, and if nobody scribbles, it scribbles on itself.

### Goop: the solid shape wins
> "as it falls off the logo it should reveal more and more logo definition because its definition is more defined by the solid shape than the liquid."

- **The call:** Lift the mark out of the oil, with the camera riding up alongside it so the logo never moves in the frame.
- **The reveal is the drain:** As the coat drains, the liquid gives way to crisp edges. The brand comes out of the chaos, and the physics is what tells that story.

### Big Bang: knowing when you don't like what you asked for
> "It's the only one that doesn't keep the logo on screen, and the effect is finnne."

- **The call:** Scott noticed that a lab built exactly to his spec still felt off. He traced the cause to the series' unwritten rule: the logo is always the hero.
- **What changed:** the explosion became its reverse. A dust cloud collapses under gravity and condenses into the mark.
- **Why it matters:** The lab now tells the same story as Neural and Goop, "out of chaos, the mark". Being willing to throw out a finished thing for consistency is part of the craft.

## 2026-10-28 — Knockout: the volley ends in a cascade

After the five-shot volley, Scott asked for every ball to burst into five, and each of those into five more: 5 → 25 → 125. Each split keeps the mass (each child is a fifth of its parent), so the shrapnel carries the same momentum. The finale goes from a few heavy hits to a hailstorm of glass beads, and that's what reads as "the end" of each cycle before the reset.

## 2026-10-28 — Life: regular beats dense

> "a measure of success for this for me would be a regular grid with no irregular separations. even if you need to cheat a little bit on the perfectly formed / sized logo."

- **The constraint:** a still life made of 2×2 blocks only holds if no dead cell ever sees exactly 3 live neighbours. With 1-cell gaps (dense, about 45% coverage), every inside corner of the chevrons breaks that rule. An exhaustive search found exactly one local patch: an odd diagonal weld of 7 cells. So the dense grid could only ever be irregular at the joints.
- **The call:** Scott ranked a regular grid over density and exact logo proportions. Blocks moved to 2-cell gaps, which hold for any arrangement of blocks. All the logo's edges are snapped to one shared grid, and the gaps between pieces snap to 6 cells so the chevrons don't merge.
- **Why it matters:** the grid is the texture. One stray seam across a field of identical squares reads as a bug, while shifting an edge by up to 2 cells is invisible.

## 2026-10-28 — Vessel: gravity as choreography

> "an anticipation tilt back, then a 180 flip, a slight overshoot and settle … and the liquid flows to the bottom."

- **The call:** Scott didn't ask for physics. He asked for an animator's beat: anticipation, action, overshoot, settle. The vessel flips every 5 s on hand-set keyframes.
- **The craft part:** the liquid has its own lagging frame, a damped spring that trails the glass. So it sloshes after the flip instead of snapping with it, and thick fills lag more.
- **Same pass:** smacks now start at a point on the liquid and push toward the centre, so you can see where each hit came from.

## 2026-10-28 — Falling Sand: a stage, then a world

- **Bedrock:** at first a stone band one bar out from the mark. Then Scott asked for rock filled to the edges ("the ring to actually be a ring"), then for a circle, never closer than that first bound. The box became a quarry with the mark in a round basin.
- **Fossils:** Scott asked for dinosaur skeletons in the rock. They're drawn as vectors and snapped to the sand grid, so they come out as pixel bones. Scott's tuning went bigger (twice, then twice again), half as many, low contrast, and cut off freely at the edges. Fossils that read as part of the rock beat ones that read as stickers.
- **Ombre:** a smooth gradient first, then "less steps and more coarse" (5 bands), then "hilly" edges. That made it strata.
- **Late flowers:** the bug Scott spotted was a rule doing its job too well. Underwater (lotus) seeds waited for the whole box to go quiet. The basin made nearly every seed an underwater one, so nothing bloomed until about 39 s. Floating pads made the wait unnecessary, and the first flower now opens at about 7 s.
- **Lava and water swapped sides.**

## 2026-10-28 — Maze: the maze contains the next maze

> "is it literally possible to include the same of the maze in the maze? … perhaps it can be made with the maze unit gap and then click together more tightly during the zoom in sequence?"

- **The arc:**
  - Rainbow search fill → 2-device-pixel drafting hatch.
  - A tiny logo at the centre to zoom into for the loop.
  - Then Scott's leap: make the tiny logo the actual next maze. Its chevrons sit one outer cell apart, so its outline lands on the outer walls, then click together to the real spacing during the dive. The last frame of the dive is the first frame of the next maze, with no cut.
  - Finally: "dont show that it is even there until the maze completes and it lights up." It now hides as ordinary dead-end corridors, and solving the maze reveals it.
- **Cut:** the colour-inversion finale ("not working anymore"). The reveal of the next maze is a better ending than a flash.

## 2026-10-28 — The site: a feed of toys

- **The idea:** the portfolio is a swipe feed of the labs, one full-screen toy at a time, with Scott as the "artist" chip (mugshot → contact and socials). Swipe left and right rather than up, so a swipe doesn't fight page scroll on phones.
- **Decisions:**
  - A "play with this" button on every toy leads to its own page, where touch belongs to the toy, so dragging never fights swiping.
  - Preload prev, current and next, like a video feed. If that costs too much, a logo-based loader that blends with the toys.
  - A quick overview grid, one tap away.
  - Twelve labs is the portfolio ("they will either love me or hate me"). Palette and tweak variants come later.
  - Each toy gets a URL and an expanded landing page.
  - Keep old versions so the process can be shown, not just the result.
