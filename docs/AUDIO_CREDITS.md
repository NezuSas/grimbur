# Audio credits

The music comes from OpenGameArt.org under **CC0 1.0 (public domain)**: free for any use,
commercial included, with no attribution required. They are credited here anyway, with thanks.

`scripts/buildAudio.py` trims, loops and masters them (−12 dBFS effects, −18 dBFS music); `scripts/convertMusic.py` makes
the OGG files the app ships.

## Music

| In the game | Track | Author | Source |
|---|---|---|---|
| Cover (title screen) | Mysterious Ambience (song21) | cynicmusic | https://opengameart.org/content/mysterious-ambience-song21 |
| Hero selection | Town Theme RPG | cynicmusic | https://opengameart.org/content/town-theme-rpg |
| Exploring the cave | Crystal Cave (song18) | cynicmusic | https://opengameart.org/content/crystal-cave-song18 |
| The Grimbur's lair | Epic Boss Battle (seamlessly looping) | Juhani Junkala (SubspaceAudio) | https://opengameart.org/content/boss-battle-music |
| Floor cleared | Victory Fanfare (short) | cynicmusic | https://opengameart.org/content/victory-fanfare-short |

## Sound effects

Generated with **ElevenLabs Sound Effects** (model v3), one English prompt per sound, four takes each; the chosen take is kept
losslessly in `assets-src/sfx-ai/` and mastered by `scripts/buildAudio.py`.

> **License:** they were generated on the free plan, which does **not** grant commercial use. Before the game is sold or
> monetized, the account must be on a paid plan (Starter or above, which includes the commercial license) and these takes
> regenerated (or their status confirmed with ElevenLabs).

| In the game | Prompt |
|---|---|
| Footstep | Single soft footstep of a leather boot on a stone cave floor, crisp and clean, short, for a mobile fantasy game, no reverb tail |
| Gem | Bright magical crystal gem pickup chime, sparkling and satisfying, short, polished mobile fantasy game reward sound |
| Bow shot | Bow string twang and fast arrow whoosh, punchy and short, fantasy mobile game arrow shot |
| Embers | Warm glowing embers and coins collected, rewarding jingle with soft crackle, mobile game |
| Forge | Blacksmith hammer striking an anvil with sparks, single strong metallic ring |
| Relic | Magical relic power-up, shimmering ascending chime with soft choir, rewarding fantasy game |
| Button | Soft wooden button click, subtle and pleasant, fantasy mobile game menu |
| Grimbur roar | Huge cave monster roar echoing in a cavern, menacing boss entrance, cinematic and deep |
| Hero falls | Hero defeated game over sting, dramatic low impact then sad descending magical tone |
| Guardian nearby (loop) | Ominous low growling breath of a hidden monster nearby, dark cave ambience, seamless loop |
| Vortex nearby (loop) | Swirling magical vortex hum with airy wind, mysterious and low, seamless loop |
| Teleport | Magical vortex teleport whoosh, swirling portal swallowing the player |
| Golem dies | Stone golem shattering into rubble, heavy rock crumble, punchy short game impact |
| Shadow wolf dies | Shadow wolf dissolving into dark smoke with a ghostly whimper, short magical game sound |
| Beast dies | Large sleeping beast death growl, short and heavy, fantasy creature game sound |
| Mimic shatters | Crystal monster shattering into glass shards, bright punchy magical break |
| Trap | Metal bear trap snapping shut, sharp mechanical snap |
| Shield breaks | Magic shield shattering, metallic and glassy break with a magical whoosh |
| Stalker winds up | Monster snarl warning before an attack, short menacing growl |
| Hit on the Grimbur | Heavy arrow impact on a giant monster, meaty thud with a pained grunt |
