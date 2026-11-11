// The resume's logo is the Vessel lab, live (labs/fluid.html?embed=1, the same embed the feed uses: embed/lab-embed.js).
// Its poster shows until the toy posts 'ready'; the toy pauses whenever the logo is off screen.
const box = document.querySelector('.logo');
const frame = document.createElement('iframe');
frame.title = 'Vessel, a live version of the logo';
frame.src = '../labs/fluid.html?embed=1';
frame.setAttribute('tabindex', '-1');
box.prepend(frame);

const send = msg => frame.contentWindow?.postMessage({ feed: msg }, location.origin);
addEventListener('message', e => {
  if (e.source !== frame.contentWindow || e.origin !== location.origin) return;
  if (e.data?.feed === 'ready') box.classList.add('ready');
});
// a toy that never draws keeps its poster; drop the loading sweep so it doesn't spin forever
setTimeout(() => { if (!box.classList.contains('ready')) box.classList.add('stuck'); }, 15000);

new IntersectionObserver(([e]) => send(e.isIntersecting ? 'play' : 'pause')).observe(box);

// Phone: the toy starts big at the top and shrinks into the band that stays on screen as the page scrolls.
// The header is sticky with a negative top (resume.css), so only its bottom band stays; this moves the toy into it.
// That only happens when the page can scroll far enough to finish the shrink: a short resume on a tall screen would
// otherwise stop halfway, so then the header stays full size (no html.collapse) and simply scrolls with the page.
const root = document.documentElement, sheet = document.querySelector('.sheet'), head = document.querySelector('.head');
const phone = matchMedia('(max-width: 720px)');
let travel = 0, size = 0, band = 72, headW = 0, lastW = 0, raf = 0;
function measure() {
  lastW = innerWidth;
  if (!phone.matches) { root.classList.remove('collapse'); return shrink(); }
  band = parseFloat(getComputedStyle(root).getPropertyValue('--band')) || 72;
  size = box.offsetWidth; headW = head.clientWidth;
  const top = sheet.getBoundingClientRect().top + scrollY;   // the header's place in the page (it opens the sheet)
  travel = top + size + 56 - band;                            // scroll needed until the header sticks as a band
  root.classList.toggle('collapse', root.scrollHeight - innerHeight >= travel);
  shrink();
}
// the toy is centred by CSS; this only moves it from there into the band's left end
function shrink() {
  raf = 0;
  if (!phone.matches || !root.classList.contains('collapse')) { box.style.transform = ''; root.style.removeProperty('--p'); return; }
  const p = Math.min(1, Math.max(0, scrollY / travel));
  const s = 1 + ((band - 16) / size - 1) * p;
  const x1 = 12 - (headW - size) / 2, y1 = size + 56 - band + 8;
  box.style.transform = `translate(${x1 * p}px, ${y1 * p}px) scale(${s})`;
  root.style.setProperty('--p', p.toFixed(3));
}
addEventListener('scroll', () => { raf ||= requestAnimationFrame(shrink); }, { passive: true });
// a phone's URL bar showing or hiding changes only the height: don't re-decide mid-scroll, or the header would jump
addEventListener('resize', () => { if (innerWidth !== lastW) measure(); });
phone.addEventListener('change', measure);
new ResizeObserver(measure).observe(sheet);   // fonts landing change the resume's height
measure();
