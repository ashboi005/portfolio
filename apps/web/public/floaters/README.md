# Floating background icons

Drop your tool/tech logos here as `.svg` or `.png` (transparent background works
best). Monochrome or full-color both fine — they're auto-desaturated to a muted
gray and floated around the page with light physics.

Then list each file in `apps/web/src/content/content.json` under `"floaters"`, e.g.:

```json
"floaters": ["/floaters/react.svg", "/floaters/postgres.png", "/floaters/bun.svg"]
```

Paths are relative to `public/`, so `public/floaters/react.svg` → `/floaters/react.svg`.
The placeholder icons shipped here can be deleted once you add your own.
