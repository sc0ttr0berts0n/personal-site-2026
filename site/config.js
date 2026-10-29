// The one place to reorder the feed or fill in the artist card.

// Feed order, by lab file name. Labs missing from this list are appended in lab-number order.
// Lab-number order for now.
export const ORDER = ['prism', 'fluid', 'goop', 'knockout', 'bigbang', 'godrays', 'maze', 'pachinko', 'neural', 'sand', 'life', 'splat'];

// Which toy a bare link (no #toy) opens on. null = the first in ORDER.
// Vessel, the hero: on an iPhone 15 Pro (first visit, in the feed, over HTTPS) it draws 1.3 s after its frame
// loads, its worst freeze is 0.23 s and it runs at 60 fps (its shader compiles while a worker bakes its shape).
export const START = 'fluid';

// Toys too heavy to preload as a frozen neighbour: they mount only once someone stops on them, with the loading
// spinner and pie over their still. Starting one blocks the page's main thread, which every toy in the feed
// shares, so a neighbour starting up froze the toy being played with. Measured on an iPhone 15 Pro (?trace),
// whole-page freezes on start: Prism 11.4 s (5.7 s again later), Big Bang 9.9 s (9.8 s), Goop 4.6 s (4.6 s).
// Take a toy off once its lab starts without blocking, as Vessel now does (0.23 s, so it preloads).
// PROVISIONAL: those phone numbers came over the LAN dev server (http), where the iPhone ran with its JIT off (JS
// ~15x slower than over HTTPS, lab-perf's benchmark). Re-measure with ?trace on an HTTPS deploy before trusting it.
export const NO_PRELOAD = ['prism', 'bigbang', 'goop'];

// What each toy does with a finger in the feed, until the lab says so itself (window.labFeed, see embed/lab-embed.js).
// touch: 'tap' | 'hold' | 'drag' gets pointer input in the middle of the screen; 'none' lets a drag anywhere swipe.
// hint: a few words shown over the toy when it arrives, until it's touched. Touch wording; mice see the lab's own hint.
export const TOUCH = {
  prism:    { touch: 'tap',  hint: 'tap to fire the laser from there' },
  fluid:    { touch: 'drag', hint: 'drag to tilt · flick to slosh' },
  goop:     { touch: 'drag', hint: 'tap the pool · tap the mark' },
  knockout: { touch: 'drag', hint: 'pull back · let go to throw' },
  bigbang:  { touch: 'drag', hint: 'drag to orbit · tap to replay' },
  godrays:  { touch: 'drag', hint: 'touch to steer the light' },
  maze:     { touch: 'tap',  hint: 'tap a maze to move its start' },
  pachinko: { touch: 'hold', hint: 'tap to drop · hold to pour' },
  neural:   { touch: 'drag', hint: 'draw on it' },
  sand:     { touch: 'drag', hint: 'drag to paint' },
  life:     { touch: 'drag', hint: 'tap or drag to draw cells' },
  splat:    { touch: 'tap',  hint: 'tap it mid-fall to tilt it' }
};

// Placeholders: Scott supplies the mugshot, bio and links.
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
