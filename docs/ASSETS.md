# Asset inventory and licensing

**Status: provenance UNKNOWN for every file below.** The repo contains no license or credits file, and nothing in the
files tells where they came from. Before publishing commercially, fill in the *Source / license* column with proof
(purchase receipt, CC0/CC-BY page, your own work, or generation tool + terms) and keep the evidence outside the app.

Why this matters: a store takedown or claim over one asset can pull the whole app, and a revenue-generating game needs
clean rights. If an asset cannot be proven, replace it.

## Audio (`src/assets/music`, `src/assets/sfx`)

| File | Used by | Source / license |
| --- | --- | --- |
| music/cover.mp3 | Cover + selection screens | ? |
| music/gameplay.mp3 | In-game loop | ? |
| music/victory.mp3 | Level complete | ? |
| sfx/attack.mp3, coin.mp3, death.mp3, monster.mp3, move.mp3, selection.mp3, vortex.mp3 | Sound manager | ? |

## Sprites (`src/assets/sprites`)

| Files | Source / license |
| --- | --- |
| backgrounds/Cover_Background.png, Loading.png | ? |
| characters/{Hero,Attack,Icon}_{Cyan,Gold,Green,Red}.png | ? |
| enemies/Guardian_Enemy.png | ? |
| items/Icon_Gem.png | ? |
| tiles/Danger_Vortex.png, Tile_Hidden.png, Tile_Revealed.png | ? |

## App icons (`assets/`)

`icon.png`, `adaptive-icon.png`, `splash.png`, `favicon.png` (640×640, converted from JPEG to real PNG), `splash-icon.png` (1024×1024). Source: ?

## Files that nothing loads

`assets/wumpa.wav` and `assets/laba.wav` are not referenced anywhere in the code. "Wumpa" is the fruit from the
*Crash Bandicoot* series, so if these came from that game they must not ship. Delete them unless you can document their
origin. They were left in place because they are your files.

## Earlier history

Early commits of this repository contained Mario/Luigi/Toad and Pokémon sprites and the Firebase project id is
`mario-s-grid`. The current build uses none of those characters, but they remain in git history; do not publish the
repository history or any build made from it without checking that no third-party IP is bundled.

## If an asset was AI-generated

Keep the prompts, the tool and its terms of service. Google Play and Apple have disclosure rules for AI-generated
content in some cases, and purely AI-generated material may not be copyrightable (US Copyright Office, Jan 2025).
