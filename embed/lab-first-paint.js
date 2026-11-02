// The first import of every lab's module (added by npm run sync). A lab's start-up can hold the main thread, so on its
// own page this waits for the first shell to reach the screen before anything else runs. In the feed it does nothing.
if (!new URLSearchParams(location.search).has('embed')) {
  await new Promise(done => {
    requestAnimationFrame(() => setTimeout(done));
    setTimeout(done, 150);   // no frames come in a background tab
  });
}
