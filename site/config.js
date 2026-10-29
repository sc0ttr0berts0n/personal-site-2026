// The one place to reorder the feed or fill in the artist card.

// Feed order, by lab file name. Labs missing from this list are appended in lab-number order.
// Lab-number order for now. Suggestion: open on something instantly fun and quick to load, e.g. 'sand'.
// (Vessel is fun too, but on a first visit it takes ~8 s to compile before it draws.)
export const ORDER = ['prism', 'fluid', 'goop', 'knockout', 'bigbang', 'godrays', 'maze', 'pachinko', 'neural', 'sand', 'life', 'splat'];

// Which toy a bare link (no #toy) opens on. null = the first in ORDER.
// Splat: on an iPhone 15 Pro it draws 0.3 s after its frame loads, at 60 fps. Prism, first in ORDER, froze the
// whole page for 11 s on a first visit there (its shaders compiling), so it made a poor first impression.
export const START = 'splat';

// Toys too heavy to preload as a frozen neighbour: they mount only once someone stops on them, with the loading
// spinner and pie over their still. Starting one blocks the page's main thread, which every toy in the feed
// shares, so a neighbour starting up froze the toy being played with. Measured on an iPhone 15 Pro (?trace),
// whole-page freezes on start: Vessel 12.5 s (5.7 s again later), Prism 11.4 s (5.7 s), Big Bang 9.9 s (9.8 s),
// Goop 4.6 s (4.6 s). Every other toy starts in under 0.4 s. Take a toy off once its lab compiles without blocking.
export const NO_PRELOAD = ['fluid', 'prism', 'bigbang', 'goop'];

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
