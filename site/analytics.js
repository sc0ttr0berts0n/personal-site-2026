// Analytics: a handful of named events, sent to PostHog by hand. No posthog-js: the toys share this main thread,
// and all the site needs is a queue and a POST.
//
// Privacy: no cookies and nothing new stored. Each page load is its own anonymous visit under a random id kept in
// memory, with no person profile. `returning` is only a yes/no inferred from what the feed already keeps for itself
// (each toy's last load time, for the loading pie): no id comes with it. PostHog drops the IP after the country lookup.
//
// Where it sends: only from the real site (ANALYTICS.host), through the Netlify proxy path (netlify.toml), so ad
// blockers that know PostHog's own domain don't drop it. Local, LAN, previews and GitHub Pages send nothing.
// ?notrack turns it off on this device (stored as a flag on the device; ?track turns it back on).
// ?analytics anywhere else logs each event to the console and sends it straight to PostHog, marked test: true.
import { ANALYTICS } from './config.js';

const q = new URLSearchParams(location.search);
let optedOut = false, returning = false;
try {
  if (q.has('notrack')) localStorage.setItem('analytics-off', '1');
  if (q.has('track')) localStorage.removeItem('analytics-off');
  optedOut = localStorage.getItem('analytics-off') === '1';
  returning = !!localStorage.getItem('feed-loads');   // read before the feed writes it this visit
} catch (e) {}
const host = location.hostname.replace(/^www\./, '');
const real = host === ANALYTICS.host;
const debug = !real && q.has('analytics');
const on = !!ANALYTICS.key && !optedOut && (real || debug);
const endpoint = real ? `/${ANALYTICS.path}/batch/` : `${ANALYTICS.direct}/batch/`;

// one id per page load, a UUIDv7 so PostHog can use it as the session id too
function uuid7() {
  const b = crypto.getRandomValues(new Uint8Array(16)), t = Date.now();
  for (let i = 0; i < 6; i++) b[i] = Math.floor(t / 2 ** (8 * (5 - i))) & 255;
  b[6] = (b[6] & 15) | 0x70; b[8] = (b[8] & 63) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const id = uuid7();

// device, in PostHog's own property names, so its web analytics views fill in
const ua = navigator.userAgent;
const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const os = iOS ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'Chrome OS'
  : /Mac OS X/.test(ua) ? 'Mac OS X' : /Linux/.test(ua) ? 'Linux' : 'Other';
const browser = /Edg/.test(ua) ? 'Microsoft Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
  : /FxiOS/.test(ua) ? 'Firefox iOS' : /Firefox/.test(ua) ? 'Firefox' : /CriOS/.test(ua) ? 'Chrome iOS' : /Chrome/.test(ua) ? 'Chrome'
  : /Safari/.test(ua) ? (iOS ? 'Mobile Safari' : 'Safari') : 'Other';
const coarse = matchMedia('(pointer: coarse)').matches, short = Math.min(screen.width, screen.height);
const device = !coarse ? 'Desktop' : short < 600 ? 'Mobile' : 'Tablet';

const base = {
  $process_person_profile: false, $session_id: id, $lib: 'scottrobertson.dev', site: 'portfolio',
  $host: location.host, $os: os, $browser: browser, $device_type: device, $raw_user_agent: ua,
  $screen_width: screen.width, $screen_height: screen.height, dpr: devicePixelRatio, returning,
  ...(debug ? { test: true } : {})
};

const queue = [];
let timer = 0;
export function track(event, props = {}) {
  if (!on) return;
  if (debug) console.log('[analytics]', event, props);
  queue.push({ event, distinct_id: id, timestamp: new Date().toISOString(),
    properties: { ...base, $current_url: location.href, $pathname: location.pathname, $viewport_width: innerWidth, $viewport_height: innerHeight, ...props } });
  if (!timer) timer = setTimeout(flush, 4000);
}
function flush(leaving) {
  clearTimeout(timer); timer = 0;
  if (!queue.length) return;
  // a plain-text body: no CORS preflight when it goes straight to PostHog (?analytics), and the proxy is same-origin
  const body = JSON.stringify({ api_key: ANALYTICS.key, batch: queue.splice(0) });
  if (leaving && navigator.sendBeacon?.(endpoint, body)) return;
  fetch(endpoint, { method: 'POST', body, keepalive: true }).catch(() => {});
}

// The page being hidden is the last sure moment to send (switching apps, closing the tab, following a link away).
const watchers = [];
export const onVisibility = fn => watchers.push(fn);   // fn(hidden), before the queue goes
document.addEventListener('visibilitychange', () => {
  const hidden = document.visibilityState === 'hidden';
  for (const fn of watchers) fn(hidden);
  if (hidden) flush(true);
});
addEventListener('pagehide', () => flush(true));

// Where this visit came from: the referrer and any utm_ tags, for the page view.
export function arrival() {
  const r = document.referrer;
  let domain = '$direct';
  try { if (r) domain = new URL(r).hostname; } catch (e) {}
  const utm = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) if (q.has(k)) utm[k] = q.get(k);
  return { $referrer: r || '$direct', $referring_domain: domain, ...utm };
}

// A lab's own page (Change This, How it got here): a page view, then the time spent each time it's left.
export function labPage(slug) {
  const tab = () => document.documentElement.classList.contains('story') ? 'story' : 'change';
  track('$pageview', { page: 'lab', lab: slug, tab: tab(), settings_code: location.hash.length > 1, ...arrival() });
  let at = performance.now();
  onVisibility(hidden => {
    if (hidden) track('lab_page_leave', { lab: slug, tab: tab(), dwell_ms: Math.round(performance.now() - at) });
    else at = performance.now();
  });
}
