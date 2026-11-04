# Weapons per hero (design, 2026-11-04)

Approved by the owner: each hero attacks with the weapon of their art and it PLAYS differently. Names: Flechas (archers) / Orbes (Mira) / Bombas (Bram). The embers cosmetic shop gets styles per weapon.

Shared contract: `src/core/engine/weapons.ts` (WeaponId, weaponOf, weaponOfHero, scaleAmmo, ORB_BURST, BOMB_REACH, BOMB_WAKE, ShotPlan, shotPlan) and `src/ui/weaponArt.ts` (AMMO_ART). `HeroPerks.weapon?: WeaponId` (missing = bow).

## Archers (Vael, Sera, Borin, Auric): bow, unchanged byte for byte.

## Mira: arcane orb (information weapon)
- Flies like the arrow (same path/reach, base 1). Hits the first guardian/thief/boss with the same outcomes as the arrow.
- ALWAYS bursts where it lands (the target, or the last tile of its flight on a miss): that tile + its 4 neighbours (Manhattan ORB_BURST), never the hero's tile, never already explored tiles. Non-lethal tiles (the `staysDark`/lethal rule of the reducer) become explored; guardians, vortexes and traps in the burst get FLAGGED (the existing `marked` flags pipeline, useBoardInput.ts:58-61).
- A miss still costs -25 and the orb, but buys information.
- Cost: `bonusArrows: -1` per floor (floored so a floor never starts below 1 orb).

## Bram: thrown bomb (area, scarcity, noise)
- Flies like an arrow with base reach BOMB_REACH=2 (`arrowReach: 2`). Explodes on the first hostile tile or at the end of its flight.
- Blast = landing tile + 4 neighbours, never the hero. Kills every guardian/sleeper/stalker/mimic/thief in it (thieves drop loot); each kill raises the combo and pays killValue. Boss/lieutenant lose at most 1 heart per throw. Traps in the blast are disarmed (removed). Vortexes survive but get flagged.
- Noise: sleepers within Manhattan BOMB_WAKE=3 of the blast wake up before hunters act (Lullaby relic still prevents it).
- Scarcity: every ammo grant goes through scaleAmmo (ceil(n/2)): pickup 2->1, shop pack 2->1, revive/refill 3->2, carry-over cap 4->2, scout cost 2->1, smith 3->2. Lair keeps at least boss hearts + 1 bombs; ensureWinnable uses the bomb pickup amount.
- Miss (no kill, no heart): -25 like the arrow.
- The existing bomb ITEM (Tool_Bomb, internal id `bomb`) is shown as "Barril de pólvora" / "Powder keg" on screen to avoid the clash; its id stays.

## Relics per weapon
| Relic | Bow | Orb | Bomb |
|---|---|---|---|
| long_bow / Forge reach | as today | +reach | +throw distance |
| glass_bow | as today | as today | removed from Bram's drafts (isUsefulRelic with ctx.weapon) |
| piercing | as today | orb flies on through the kill | blast becomes 3x3 |
| echo_arrow | kill from 2+ tiles | same | one throw kills 2+ |
| flare_arrow | lights crossed tiles | burst radius Manhattan 2 | blast tiles explored/flagged |
| stun_shot, hunter, reaper, toll_free, blood_pact | unchanged | unchanged | unchanged |
| quiver, gambler, archer family bonus, whetstone | unchanged | unchanged | halved via scaleAmmo |
| blood_gems | arrow per gem | orb per gem | bomb every 2nd gem |
| bomb_belt / bomb item | items, unaffected | | |

Relic names stay; their description text gets a per-weapon version.

## Fairness
Puzzles never shoot; tutorial and lessons stay on the bow (NO_PERKS). Daily/duels stay deterministic (weapon is a hero perk). Achievements count kills by state diff, so they keep working. Old saves without `weapon` play as bow.

## i18n keys (fixed list, WP3 writes them; others may reference them)
- `weapon.<w>.ammo` (plural, "Flechas"/"Orbes"/"Bombas"), `weapon.<w>.ammoOne` (singular), `weapon.<w>.attack` (verb label for the attack button, e.g. "Disparar"/"Lanzar orbe"/"Lanzar bomba"), `weapon.<w>.desc` (one line rule for the manual/hero screen)
- `a11y.ammoLeft.<w>` (with {n})
- `shop.ammo.<w>.name`, `shop.ammo.<w>.desc`
- `relic.<id>.desc.<w>` for the relics in the table whose effect differs (fallback helper `relicText(id, weapon)` in i18n/keys.ts falls back to `relic.<id>.desc`)
- `cosmetic.kind.orb`, `cosmetic.kind.bomb`, `cosmetic.shown.orb`, `cosmetic.shown.bomb`, `cosmetic.<newId>.name`
- `item.bomb.name` becomes "Barril de pólvora" / "Powder keg" (find the existing key for the bomb item)

## New cosmetics (WP4)
Kinds `orb` and `bomb`, 6 each: `orb_frost, orb_ember, orb_venom, orb_void, orb_stars, orb_royal`; `bomb_ember, bomb_frost, bomb_venom, bomb_storm, bomb_void, bomb_royal`; priced like the trails; drawn in code from two colours (like TrailLook), no new PNGs. Keep the collection-share rewards from being lost: leave the `orb`/`bomb` kinds out of the collection share (like event keepsakes) OR persist milestones once reached.
