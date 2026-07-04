# warp assets

Icons that fly past inside the hyperlapse corridor (hero → whoami),
**separate** from the ambient background floaters so colored logos
(VS Code, GitHub, …) don't clutter the rest of the site.

Everything is controlled from `apps/web/src/content/content.json` → `warp`:

```json
"warp": {
  "icons": ["/warp/vscode.svg", "/warp/github.png"],
  "words": ["async", "await", "git push", "..."],
  "lengthVh": 750,
  "count": 950,
  "iconShare": 0.14,
  "wordShare": 0.22,
  "iconScale": 1,
  "wordScale": 1
}
```

- **icons** — drop `.svg` **or `.png`** files in this folder and list their
  paths here. While the list is empty the corridor flies on stars + words.
- **words** — the code snippets that whiz past. Edit freely.
- **lengthVh** — corridor height in vh: how much scrolling the flight takes
  (750 ≈ 6.5 viewports of travel; min 200).
- **count** — total particles in the field (stars + words + icons).
- **iconShare / wordShare** — fraction of the field that's icons / words
  (0–1). Whatever remains is stars. e.g. 0.14 + 0.22 → 64% stars.
- **iconScale / wordScale** — size multipliers (1 = default, 1.5 = 50% bigger).
