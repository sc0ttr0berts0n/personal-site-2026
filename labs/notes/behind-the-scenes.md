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

## 2026-10-28 — Splat!: the grid was a fall all along

> "you see a fine grid and its slowly zooming. turns out its because of a fixed camera on the logo. the logo is falling fast and its made of nickelodeon-like slime."

- **The trick is perspective:** the camera rides the mark, so the mark never changes size and only the floor grows, as 1 / distance. A steady fall reads as a lazy zoom that speeds up, until it doesn't. Two cues give the game away late: a soft shadow that slides in from the corner and sharpens, and grid lines that keep resolving finer (three levels, each fading in by pixel size, so the grid never moirés or pops).
- **Slime, not particles:** everything is one metaball field cut at one level, with one-pixel analytic antialiasing. The airborne mark is its own distance field; the splat dilates that field into a puddle on a bouncy spring, and fingers are plastic rope chains that stretch, stick, creep back and sometimes pinch off a droplet. The mark's body stays as a mound inside the puddle, so you can still read the logo in the splat.
- **The reveal (the decisive call):** the splat doesn't cut to the next drop. It tears open from the centre like a bursting film, a thick rim sweeping the old goo off the screen, and through the hole is the next mark in the next colour over the next grid, already at the top of its fall. Like the maze, the loop is "the thing contains the next thing", and the swap is pixel-exact.
- **Looks:** a bevelled extrusion read as plastic. Blurring the distance field for the mound (sampled with a cubic B-spline, because bilinear slopes showed as blocks in the highlights) turned it into a puffy, glossy goo.
- **Revised: fall through the splat.** Scott cut the tear ("no sweeping wavy circle effect (though nice)") for recursion: "put the grid on the existing splat, reveal the next logo, falling on the grid revealed on the splat." When it settles, the next floor's grid shows up on the splat, then the splat drains into a window onto that floor, which is tinted the splat's colour. The pressure squeezes the slime off the logo-shaped mound, which leaves a lip and reveals the next logo underneath. That logo drops from rest, and the camera falls with it "through the hole that is now the splat". The old floor, rim and lip rush past and are gone, the swap is pixel-clean, and it starts again.
- **Small call:** the fall became true free fall from rest (the default fall time went from 6 s to 7 s). Starting at speed made a visible jolt at the moment of the drop.
- **Revised again: rise, then fall into the hole.** Scott: "on impact you reveal the next logo, not after", and "I dont like the keyhole being logo shaped, make it splat shaped instead". Now the next mark pops up out of the splat the moment it lands and rises for a beat, throwing a shadow on the goo. Then it locks to the camera. The floor opens in the shape of the splat itself, frozen at that instant, and the goo falls into the hole with the camera close behind. A few of the old splat's drops ride along in freefall, drift away from the camera and dissolve before the next impact ("they dont survive until impact").
- **No pops (the fiddly part):**
  - The hole starts just inside the goo's edge and grows a touch past it, with the cut-edge shading faded in, so it opens out from under the slime instead of appearing as a ring.
  - The goo falls from rest.
  - The goo's alpha dissolves to nothing before it is dropped. A frame-by-frame pixel diff found bright remnants vanishing in one frame; it's now 4 changed pixels.
- **Pure goop.** Scott: "lets lose these sharp corners and go pure goop". The mitred tips of the logo left pinched, diamond-shaped highlights. A first try blurred the distance field, which rounds corners but filled the narrow gaps between the chevrons and melted the mark into one blob. What worked: square each outline off to its long edges, inset it by the goop radius, and let the distance field add the radius back. Offsetting a polygon outward gives round joins, so every corner comes back exactly round and the gaps stay open.
- **Game feel.** Scott: "if its touched mid fall it will tilt that way", plus "some airstream and that wobbly thing a parachute does before it opens as the speed picks up."
  - **Tilt:** a held touch leans the mark toward it on a springy, underdamped tilt. It's a real tilted plane, ray-cast in perspective from the camera, so the near side shrinks away and the highlights slide.
  - **Flutter:** as the speed builds, the mark shakes on a canopy flutter that gets faster and wider, and its edges flap.
  - **Airstream:** specks rush up past the mark as radial streaks that lengthen with speed.
  - **The rule that keeps it seamless:** the tilt levels out over the last part of the fall, so the mark always lands flat. The edge flap carries into the goo and dies away there, and the air keeps streaming a moment after impact before it stops. Nothing cuts off.

## 2026-10-28: Falling Sand, the reset is a drain

> "just make a drain when you need to reset. it literally keeps the visual for everything but makes it behave as water."

- **The decisive call:** starting over no longer wipes the box. A drain opens in the bottom 15° of the basin, and every cell keeps its look (lava glow, fire flicker, wood grain, flowers) while it falls and slides like water toward the hole. The basin empties in under 2 s, then the mark comes back and thaws. The reset became part of the show. Scott then had the plug itself hidden ("dont visually show the drain"), so it just pours out of the bottom.
- **Settled means "just drips":** Scott: "its settled once its kind of just raining and its down to just drips". The settle detector now counts only visible change: a lone falling drop doesn't count, and nor do slow trickles such as lava cooling or roots drinking. It also has some slack, so one blip doesn't restart the clock. A cycle went from about 48 s to about 20 s.
- **Hands off once touched:** "do not loop if they interact ever. make that manual at that point." Any interaction ends the auto loop for good, and Reset becomes a 0.8 s hold with an ink trace round the button.
- **Watch-face controls:** "in the style of the apple watch ring … rounded arcs kind of between a rounded rect and a stroke arc." The element picker became arc buttons hugging the bedrock circle, with the labels set along each arc. Six across the top take about 90° of the ring. Eraser and Reset are rounded triangles in the bottom corners, curved where they touch the ring.

## 2026-10-29 — Interview: how Scott reviews

> "i usually think its working somewhat and i chip away at the bad until there is only good. Theres always a seed of good in there."

- **The method:** Scott doesn't restart from scratch. He finds the part that works and removes everything around it, one cut at a time. The saved versions in `notes/versions/` are that process, step by step.
- **His role, in his words:** "I'm a developer with the taste of someone who's extensively done creative work." Having worn many creative hats lets him switch between director, designer, critic and developer inside one session.
- **Big Bang, confirmed:** the explosion was scrapped because the logo left the screen. That broke the series' one rule.

## 2026-10-29 — Maze: cutting the eye candy

> "I didn't ask for rainbow. the system did. and i liked it at first, but slow noticed it wasn't communicating anything. just eye candy."

- **The longest arc of the twelve.** The rainbow search fill was Claude's idea, not Scott's. He liked it, lived with it, then asked what it was *for*. Little by little he cut the fluff until the fill only showed the dead paths.
- **Colour got a second chance and lost:** colour was briefly going to show how far a path had reached. When that still wasn't clear enough, it went to plain grey.
- **Recursion came from watching the zoom.** The zoom-in loop already existed, and staring at it raised the question of why the tiny logo couldn't literally be the next maze.
- **The burst finale was noise:** "too much noise. I wanted the key focus to be the reveal that a maze within a maze was hidden in plain sight. so i spent a lot of time removed flashy elements that distracted from that truth."
- **Hidden because surprise is the payoff.** If you can see the next maze coming, the dive is just a zoom. Hidden, it's a discovery.
- **Versions:** `notes/versions/maze/01-pre-technical-drawing` (rainbow) → `12` → `13-burst-finale` → `13b-pre-loop` → `14-recursive-visible` → live.

## 2026-10-29 — Interview: working with AI

> "I have a vison, I pitch it, i get 80% of what i want on the first try, plus some shit I dont want that i need to tune out, plus some shit i didnt expect which I can foster."

- **Novelty for free:** "working with AI is great because I can often generate novelty for free." Every pitch comes back in three parts: what he asked for, what he cuts, and the surprises worth growing. The Maze rainbow went through all three: an unasked-for surprise, liked, then cut.
- **Bold swings:** "its been nice to get to a point where i can take bold swings and succeed."

## 2026-10-29 — Falling Sand: the drain was a friend's joke

- **Origin:** a friend suggested the drain. Scott laughed: cool, but silly. He kept coming back to it and came round to it.
- **What made it work:** simulate everything with the water rule but keep each element's look, so the change in *behaviour* is the surprise. It drained fast enough not to be annoying loop after loop, so it stayed.
- **The habit this shows:** an idea that sounds silly gets a second look rather than a no.

## 2026-10-29 — Splat: chasing the seam

> "if a lab goes on a journey, its more fun if it loops. novel loop 'seams' are something i'm always chasing."

- **Every Splat revision was about recursion:** each version made the next drop come out of the last one more directly.
- **Still open:** "I'm not married to some elements of splat." He'd like a putty or clay consistency, but feels it's too "2D" now. It might be more fun if the mark tumbles and can land in any orientation.

## 2026-10-29 — Pachinko: solve from the mark outward

- **Mostly right out of the tube.** The work was reflowing the pixel pitch, finding the right tuning knobs, and a fair amount of refactoring.
- **The one note:** solve the peg lattice from the logo outward, rather than dropping the logo on an existing grid. The peg edges now line up with the visually critical element, the mark, instead of the walls, so it composes well. It's the same instinct as the Maze's rhombic lattice: the mark sets the grid.
- **Version:** `notes/versions/pachinko/01-pre-lattice`.

## 2026-10-29 — Logo Light: honest about the weak one

> "its fiiiiiine."

- **Mostly a slider tune.** Scott rates it the bottom middle of the pack.
- **The shake-up:** violent rainbow bursts, because rainbow light is something he loves to flash into his designs wherever he can. He admits it's still "something people have seen before."
- **Versions:** `notes/versions/logo-light/05-pre-burst` → `06-burst` → `07-burst-wander`.

## 2026-10-29 — Vessel: the iodine clock reaction

> "i noticed it was an ombre of color and for some reasons it fired off a neuron in my brain about iodine clock reactions."

- **The biggest Vessel call, bigger than the flip.** The liquid's palette was an ombre, and the ombre reminded Scott of an iodine clock reaction. Now fronts nucleate somewhere under the surface and sweep the whole vessel. Behind each front, the colour steps one place along the palette, and a thin rainbow sheen rides the front, like colour passing over a cuttlefish.
- **Why it matters:** "its just beautiful and appropriate for this particular effect." Without it, Vessel is a nice liquid sim; with it, the lab has an identity. People often name it as their favourite. Scott's aim is "something visually striking and thats hard to forget."
- **Arrived between** `notes/versions/vessel/09` (no reaction) **and** `13-pre-gravity-flip` (reaction, before the flip).
- **Next:** a tap drops a reagent, seeding a front where you touched. Nudges move the liquid as well.

## 2026-10-29 — Neural and Prism, briefly

- **Neural was colour from day one.** Round 1 was chosen to be as different from the end result as possible, so the journey from noise to the mark looks dramatic.
- **Prism set the bench look:** the black-and-white optics-bench style started here and became the whole series' base.

## 2026-10-29 — Goop: the arc, version by version

Scott walked the saved versions in `notes/versions/goop/`.

- **04, a pool you poke:** tap for ripples, pour drips on the mark. The lift was in the brief from the start, but "the agent missed it in the end". Part of reviewing is catching what was dropped, not just what was added.
- **05, the lift:** lift, drain and dunk on a loop. The planned story finally showed up.
- **07 → 10, drips with character:** every drip behaved the same, which was too uniform. Now drips creep downhill along sloped edges, each at its own pace. Two that meet merge, their volumes add and the thread thickens. Broken threads snap back into the pool instead of standing up as spikes.
- **12, the rainbow sold it:** the solid mark under the oil shows bare where the coat is thin and smoky where it's thick. A thin-film interference rainbow runs along the draining front. That rainbow is what made "the solid shape wins" beautiful, and not just correct.
- **Live, off the tripod:** a handheld camera and a hanging wobble, because the locked-off camera felt too much like a render.
  - **Also sleight of hand:** the wobble keeps the eye moving, so you don't dwell on the aliasing. Motion hides what a locked-off frame would expose.

## 2026-10-29 — Vessel: one cause for two events

- **Every smack starts a front.** In `notes/versions/vessel/13-pre-gravity-flip`, each idle smack starts a clock-reaction front where it lands, instead of the fronts running on their own timer.
- **Why:** two separate rhythms were too busy. One cause also unifies them: "the reason for both could reasonably be a nudge."

## 2026-10-29 — Knockout: passive first, then a surprise

- **The order of calls:**
  - At first it didn't auto-shoot, so it was boring if you just watched. Scott added the auto-volley.
  - Then the left/right alternating attack.
  - Much later, he decided it needed a surprise: the split-pop cascade (5 → 25 → 125).
- **The chalk outline is the series rule again:** "I want my logo mark to persist on all lab toys, so when its destroyed it needs to stay around." It's the same reason he first disliked Big Bang ("no logo for so long"). He might still find a way to keep the mark on screen through the bang.
- **Where the trick was found:** Knockout is where Scott discovered the ghost outline, a way to keep the mark present while it's destroyed. He has reused it elsewhere since (2026-10-29 comment).
- **The habit this shows:** make it watchable without a visitor first, then add the surprise.

## 2026-10-29 — Life: coarse so you can see the steps

> "I love a big busy game of life, but the simpler the grid the more visible the steps are, so i comitted to just going as coarse as possible."

- **Coarse on purpose:** each generation should be readable, so the grid went as coarse as it could. That's on top of the regularity argument above.
- **Diamonds:** "I loved doing diamonds as well because it made this a unique game of life with respect to the classic." Taking the grain from the mark set it apart from every other Game of Life.
- **Versions:** `notes/versions/life/02-square-grid` → `03-dense-lattice-pitch3` → live.

## 2026-10-29 — Big Bang: the whole arc, and whose idea the collapse was

- **Started as an astrophotographer's test:** Scott wanted to be convinced, as an astrophotographer, that the nebula was reasonably real. He eventually decided that wasn't a fair ask.
- **Several directions at once:** he set it off in a few directions to see where it landed, and fed it Shadertoy examples he liked, steering toward a metaball-deforming blob. The current nebula came "out of the blue" while his attention was on other labs, and he tuned it until he liked it.
- **The collapse was Claude's answer to his question.** Correcting the earlier entry: Scott spotted the problem (no logo on screen) and asked what to do about it. Claude suggested reversing the bang into a collapse, and he loved it. By then the nebula was good enough, so it stayed.
- **Candid status:** "i may still move on i'm kind of bored by it." He'd like to see something accreting into the logo. The current ending reads as a black hole, and he might "go louder with it and get weird."
- **Versions:** `notes/versions/bigbang/01-explosion-original` → `02-v1` → `03-v2` → `04-v3` → `05-collapse-rework` → live.

## 2026-10-29 — Falling Sand: the genre's DNA

- **Known DNA:** "i've played so many falling sand games over the years i knew the basic dna." After the simple elements, he kept adding what he expected to find. Embers light wood (`02`), ash is left behind (`03`), lily pads and lotus grow in water (`05`).
- **Where it became his:** the stage (bedrock ring → quarry, `07`–`08`), the fossils (`09`), and the drain. Those go past the genre's expected DNA.

## 2026-10-29 — Interview wrap: what Scott wants people to take away

- **Proudest call:** the iodine clock reaction. "i really wish it was maze within a maze or something more clever, but iodine is just so good looking lol"
- **The takeaway:** he can direct AI, and he spans disciplines ("people always love that"). Above all: "everything is shit at first and with frank and productive critique, you can reach wonderful results through iteration and experimentation."
