# warp icons

SVGs that fly past inside the hyperlapse corridor (hero → whoami), separate
from the ambient background floaters so colored logos (VS Code, GitHub, …)
don't clutter the rest of the site.

To add one:

1. Drop the `.svg` in this folder (e.g. `vscode.svg`).
2. List it in `apps/web/src/content/content.json` → `warpFloaters`:

```json
"warpFloaters": ["/warp/vscode.svg", "/warp/github.svg"]
```

While the list is empty the corridor flies on stars + code glyphs alone.
