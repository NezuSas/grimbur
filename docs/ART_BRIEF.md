# Art brief

Use this with whatever image tool your plans include (ChatGPT image generation, Midjourney, Figma, hand drawing...).
Drop the finished PNGs at the paths below and tell me; I wire them in, resize/compress them and update the code.
**Claude cannot generate images or audio itself** (audio is synthesised by `scripts/generateAudio.js`).

## Style (decide once, apply to everything)

- **Look:** dark-fantasy cave, chunky and readable at phone size. A tile is drawn ~48-64 px on screen, so silhouettes
  and colour matter more than detail. Strong 2-3 px outline, soft top-left light, limited palette.
- **Palette:** cave = deep indigo/charcoal; danger = warm reds/oranges; vortex = purple; gems = cyan/gold;
  hero accents match the existing colours: Cyan `#00E5FF`, Red `#FF1744`, Green `#76FF03`, Gold `#FFD600`.
- **Format:** PNG with a **transparent background**, no text, no watermark, no drop shadow baked in, subject centred
  with ~8% padding. Same camera angle and lighting for every sprite.
- **Consistency trick:** generate the first sprite, then give it to the tool as a style reference for every other one.
- **Keep what already works:** the four hero sprites and the gem exist. Only regenerate them if you want a new style, and then
  regenerate the whole set so they match.

## Deliverables, in priority order

| # | Asset | Path | Size | Notes |
| - | --- | --- | --- | --- |
| 1 | **The Grimbur** (boss) | `src/assets/sprites/enemies/Grimbur_Boss.png` | 768x768 | Huge, menacing, instantly different from the regular guardian. Tool prompt below. |
| 2 | Shield pickup | `src/assets/sprites/items/Icon_Shield.png` | 256x256 | Glowing blue round shield |
| 3 | Arrow bundle pickup | `src/assets/sprites/items/Icon_Arrows.png` | 256x256 | Three arrows, orange fletching |
| 4 | Trap (revealed) | `src/assets/sprites/tiles/Trap_Sprung.png` | 256x256 | Spiked floor plate, shown after it triggers |
| 5 | Tiles hidden / revealed (hi-res) | `src/assets/sprites/tiles/Tile_Hidden.png`, `Tile_Revealed.png` | 256x256 | Current ones are 100x100 and look soft. Seamless edges: tiles sit side by side. Hidden = fogged stone, revealed = lit stone |
| 6 | Relic icons x11 | `src/assets/sprites/relics/<id>.png` | 256x256 each | ids: quiver, lucky_coin, iron_boots, lantern, phoenix, hunter, long_bow, bulwark, greed, frost, trap_sense. Currently emojis |
| 7 | Cover background | `src/assets/sprites/backgrounds/Cover_Background.png` | 2048x1366 | Cave mouth + torchlight, empty centre for the menu card |
| 8 | App icon | `assets/icon.png` | 1024x1024 | Square, full-bleed, no transparency. The Grimbur eye or a hero + gem. Must read at 48 px |
| 9 | Adaptive icon foreground | `assets/adaptive-icon.png` | 1024x1024 | Subject inside the central 66% (Android crops the rest), transparent |
| 10 | Splash | `assets/splash.png` | 1284x2778 | Logo/title centred, dark background `#000000` |
| 11 | Store feature graphic | `store/feature-graphic.png` | 1024x500 | Google Play banner: title + hero + Grimbur. Text allowed here |
| 12 | Store screenshots | `store/screenshots/` | 1920x1080 landscape | Capture from the real game on a device (I can't). 4-8 shots: board, boss, relic draft, victory |

## Prompt templates (adapt the nouns)

Style reference line, prepend to all:
> Dark-fantasy cave game asset, chunky 2D illustration, bold dark outline, soft top-left lighting, limited palette of
> deep indigo and charcoal with a single bright accent colour, transparent background, centred, no text, no shadow.

1. **Grimbur (boss):** "...a hulking cave beast, the Grimbur, shaggy dark fur, three glowing red eyes, wide fanged mouth,
   long claws, intimidating but slightly goofy, front view, fills the frame."
2. **Shield:** "...a round blue steel shield with a glowing rune, magical cyan glow."
3. **Arrows:** "...a small bundle of three arrows tied together, orange feather fletching, steel tips."
4. **Trap:** "...a sprung stone floor trap with metal spikes rising from a square plate, top-down 3/4 view."
5. **Tiles:** "...a square stone floor tile seen from above, edge-to-edge, seamless, hidden version covered in dark fog with a
   faint question-mark texture, revealed version lit warm and clean."
6. **Relics:** one prompt per relic: "...<object> as a collectible icon, glowing gold rim".
7. **App icon:** "...square app icon, the glowing red eyes of a cave beast peeking from darkness with a cyan gem in front, high
   contrast, minimal detail."

## Licensing and store rules (important for selling)

- Keep, for every generated image: the tool, date, prompt and a screenshot of the tool's terms that grant **commercial use**.
  Put them in `docs/ASSETS.md` (a row per file).
- Do not use artists' names, existing characters or brands in prompts. Do not feed in copyrighted sprites as references.
- Purely AI-generated images may not be copyrightable (US Copyright Office, Jan 2025): editing/compositing by hand
  strengthens your claim. Google Play and Apple have AI-content disclosure rules in some cases; check at submission.
- Avoid "Wumpa", Mario/Pokemon-like designs and anything resembling Discord's Grimbur mascot (see `docs/market-research.md`).

## What I do once files arrive

Resize/compress (target < 150 KB each for in-game sprites), rename to the paths above, wire them in
(`BoardView`, `RelicDraftOverlay`, `CoverCard`, characters data), update `docs/ASSETS.md`, run the bundle check.
You can send them in batches: the Grimbur and the three pickups first, since those unlock the most polish.
