// The one place to reorder the feed or fill in the artist card.

// Feed order, by lab file name. Labs missing from this list are appended in lab-number order.
// Lab-number order.
export const ORDER = ['fluid', 'prism', 'goop', 'knockout', 'bigbang', 'godrays', 'maze', 'pachinko', 'neural', 'sand', 'life', 'splat'];

// Which toy a bare link (no #toy) opens on. null = the first in ORDER.
// Vessel, the hero: on an iPhone 15 Pro (first visit, in the feed, over HTTPS) it draws 1.3 s after its frame
// loads, its worst freeze is 0.23 s and it runs at 60 fps (its shader compiles while a worker bakes its shape).
export const START = 'fluid';

// Toys too heavy to preload as a frozen neighbour: they mount only once someone stops on them, with the loading
// spinner and pie over their still. Starting one blocks the page's main thread, which every toy in the feed
// shares, so a neighbour starting up would freeze the toy being played with. Empty for now: on an iPhone 15 Pro
// over HTTPS every toy draws within 0.7 s of its frame loading (Big Bang 676 ms, Prism 521, Fluid 357, Goop 320)
// with one hitch of 0.2-0.36 s, which the one-at-a-time, hands-off neighbour loading keeps away from a finger.
// (The 5-12 s freezes once measured here came over a LAN dev server, plain http, where the iPhone runs JS with
// its JIT off.) Put a toy here if its start-up ever holds the page for a second or more.
export const NO_PRELOAD = [];

// Fallback for what each toy does with a finger in the feed. Each lab now says so itself, in the feed: line of its
// createLab spec (read into labs/manifest.js by npm run sync, and passed up at runtime as window.labFeed).
// touch: 'tap' | 'hold' | 'drag' gets pointer input in the middle of the screen; 'none' lets a drag anywhere swipe.
// hint: a few words shown over the toy when it arrives, until it's touched. Touch wording; mice see the lab's own hint.
export const TOUCH = {
  prism:    { touch: 'drag', hint: 'drag to aim · drag the emitter to move it' },
  fluid:    { touch: 'drag', hint: 'drag to tilt · flick to slosh' },
  goop:     { touch: 'drag', hint: 'tap the pool · tap the mark' },
  knockout: { touch: 'drag', hint: 'pull back · let go to throw' },
  bigbang:  { touch: 'drag', hint: 'drag to orbit · tap to replay' },
  godrays:  { touch: 'drag', hint: 'drag to steer the light · lift to pin it' },
  maze:     { touch: 'tap',  hint: 'tap a maze to move its start' },
  pachinko: { touch: 'hold', hint: 'tap to drop · hold to pour' },
  neural:   { touch: 'drag', hint: 'draw on it' },
  sand:     { touch: 'drag', hint: 'drag to paint' },
  life:     { touch: 'drag', hint: 'tap or drag to draw cells' },
  splat:    { touch: 'tap',  hint: 'tap it mid-fall to tilt it' }
};

// Placeholders: Scott supplies the mugshot, bio and links.
// Where the site lives: share previews need absolute links to their pictures. Re-run npm run share after changing it.
export const SITE_URL = 'https://sc0ttr0berts0n.github.io/personal-site-2026/';

// Share cards (npm run share): how long each toy runs before its picture is taken, in ms. Default 6000.
// Vessel at 12 s is mid-way through a color front; Neon Oil needs its shader compiled first.
export const SHARE_AT = { fluid: 12000, goop: 22000 };

export const ARTIST = {
  name: 'Scott Robertson',
  avatar: null,                      // e.g. 'site/img/scott.jpg'; null shows the mark
  line: 'Creative Developer',
  links: [
    { label: 'Email', href: 'mailto:you@example.com', text: 'you@example.com' },
    { label: 'Instagram', href: '#', text: '@placeholder' },
    { label: 'GitHub', href: 'https://github.com/sc0ttr0berts0n', text: 'sc0ttr0berts0n' },
    { label: 'LinkedIn', href: '#', text: 'placeholder' }
  ]
};
