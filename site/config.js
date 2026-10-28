// The one place to reorder the feed or fill in the artist card.

// Feed order, by lab file name. Labs missing from this list are appended in lab-number order.
// Lab-number order for now. Suggestion: open on something instantly fun and quick to load, e.g. 'sand'.
// (Vessel is fun too, but on a first visit it takes ~8 s to compile before it draws.)
export const ORDER = ['prism', 'fluid', 'goop', 'knockout', 'bigbang', 'godrays', 'maze', 'pachinko', 'neural', 'sand', 'life', 'splat'];

// Which toy a bare link (no #toy) opens on. null = the first in ORDER.
export const START = null;

// Toys too heavy to preload as a frozen neighbour: they mount only once someone stops on them, and preload
// normally after their first compile. A lab whose first shader compile blocks the page's main thread (shared by
// every toy in the feed) freezes the toy on screen while it preloads. Goop (~33 s) and Vessel (~10 s) used to;
// they now compile in the background and set window.labWarming until they can draw, so the list is empty.
export const NO_PRELOAD = [];

// Placeholders: Scott supplies the mugshot, bio and links.
export const ARTIST = {
  name: 'Scott Robertson',
  avatar: null,                      // e.g. 'site/img/scott.jpg'; null shows the mark
  line: 'Placeholder: one line about Scott.',
  links: [
    { label: 'Email', href: 'mailto:you@example.com', text: 'you@example.com' },
    { label: 'Instagram', href: '#', text: '@placeholder' },
    { label: 'GitHub', href: 'https://github.com/sc0ttr0berts0n', text: 'sc0ttr0berts0n' },
    { label: 'LinkedIn', href: '#', text: 'placeholder' }
  ]
};
