// The one place to reorder the feed or fill in the artist card.

// Feed order, by lab file name. Labs missing from this list are appended in lab-number order.
// Lab-number order for now. Suggestion: open on something instantly fun and quick to load, e.g. 'sand'.
// (Vessel is fun too, but its first visit takes ~10 s to compile; see NO_PRELOAD.)
export const ORDER = ['prism', 'fluid', 'goop', 'knockout', 'bigbang', 'godrays', 'maze', 'pachinko', 'neural', 'sand', 'life'];

// Which toy a bare link (no #toy) opens on. null = the first in ORDER.
export const START = null;

// Toys too heavy to preload as a frozen neighbour. Their first shader compile blocks the page's main thread
// (shared by every toy in the feed), so preloading one freezes the toy on screen. Measured cold, first visit,
// Edge on Windows/D3D11: Goop ~33 s, Vessel ~9.6 s; every other lab draws within ~1.7 s.
// These mount only once someone stops on them; after that (shaders cached) they preload like the rest.
// Empty this once those labs compile asynchronously.
export const NO_PRELOAD = ['goop', 'fluid'];

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
