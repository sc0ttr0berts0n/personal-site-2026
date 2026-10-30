# Old versions

Snapshots of each lab from before a decisive change, kept for talking about process. File names start with the version number, then say what that version was, e.g. `13-burst-finale.html`. The behind-the-scenes log (`../behind-the-scenes.md`) says why each one changed, and `../process-stories.md` tells each lab's story for its page on the site.

Each folder carries its own frozen copy of the shared code (`<lab>/shared/`), and its snapshots import that (`./shared/lab.js`, `href="./shared/lab.css"`), so later changes to `labs/shared/` can't change how an old version looks. The copy was taken on 2026-10-30 from the shared code of the day, not the code as it stood when each snapshot was made, so an old version may differ slightly from what it looked like at the time. Don't update these copies when `labs/shared/` changes.

Before that, the snapshots pointed at the live `../../../shared/` and their stylesheet link said `href="shared/lab.css"`, which 404'd: they loaded unstyled and the stage collapsed to nothing.

On the site, each lab's page shows the versions its process story names as squares that play on tap (`npm run sync` adds the feed's embed hooks to the copies, so they show the stage only). Serve the repo root and open e.g. `/labs/notes/versions/sand/01.html` to see one on its own.
