# Controls / input research (landscape turn-based grid roguelite) - 2026-10-13

Evidence is THIN. Found via search snippets; most pages were not read in full. No UX study on turn-based grid input was found.

## Findings (cited)
- Shattered Pixel Dungeon: tap-to-move with pathfinding, tap enemy to attack, tap item for menu; reviewer credits big tiles for accuracy. https://goodolddays.net/en/game/Shattered-Pixel-Dungeon
- Pixel Dungeon community (June 2024): accidental taps ruin runs (a tap between buttons moves the character); poster asks for select-tile-then-confirm; a reply says mis-taps are a known mobile problem because one tap can be severe. https://old.lemmy.dbzer0.com/comment/11545759 (mirror https://feddit.it/post/8912721). No evidence a confirm option was added.
- Hoplite: simple tap-a-tile movement, tap enemies to see threat range (TapTap review https://www.taptap.io/ru/post/1605033). User comments on game-solver say an update shrank the hex grid and touch targets got hard on small phones https://game-solver.com/hoplite/ (user comments, not formal review).
- Shovel Knight Pocket Dungeon (grid, near-real-time): offers swipe OR on-screen d-pad, chosen at new game start, with repeat options; landscape/portrait. https://yachtclubgames.com/blog/shovel-knight-pocket-dungeon-mobile-instruction-manual ; TouchArcade https://toucharcade.com/2023/06/20/shovel-knight-pocket-dungeon-review-android-iphone-netflix-mobile/ ; Gizmodo says swipe works quite well. No control complaints found.
- Redungeon (turn-based grid roguelike): MobileSyrup reviewer found directional arrows more accurate/reliable than swipes in frantic moments; both offered. https://mobilesyrup.com/2019/08/04/redungeon-roguelike-game-review/
- Snake (Ollie's Arcade): devs tried on-screen d-pad, dropped it; no tactile landmarks, thumbs drift, players look at fingers; shipped swipe + tap-and-hold. https://support.iconfactory.com/kb/ollies-arcade/why-doesnt-snake-have-an-on-screen-d-pad-controller (real-time game)
- Accidental swipes: itch.io feedback on a block game, swipes too sensitive, rarely used command moved to tap zone. https://itch.io/post/12727791
- Solar2D forum: drag controls precise but skip barriers; d-pad less intuitive at first but gamers adapt quickly. https://forums.solar2d.com/t/draggable-object-vs-virtual-d-pad/302812
- Dead Cells mobile: touch controls worked surprisingly well, dodge mapped to swipe. https://toucharcade.com/2019/08/30/toucharcade-game-of-the-week-dead-cells/ (real-time)
- Hoober: ~1,300 street observations (2012-13): 49% one-handed thumb, 36% cradled + other-hand finger, 15% two-handed; two-thirds of one-handed grips right hand; phablets ~70% two-handed (with Shank); later says centre of screen is touched most, most accurately, fastest, and thumb-zone diagrams were over-read as rigid. Secondhand: https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/ ; summaries via search. Study is portrait phones, not landscape games.
- Touch target minimums: Apple HIG 44x44 pt; Material 48x48 dp (~9 mm); WCAG 2.2 AA 24px, AAA 44px. Secondhand via https://github.com/w3c/wcag/issues/1831 and https://blog.openreplay.com/improving-tap-targets-mobile-ux/
- Accidental-tap handling: act on finger release not touch-down (WCAG 2.5.2) https://silktide.com/accessibility-guide/the-wcag-standard/2-5/input-modalities/2-5-2-pointer-cancellation/ ; Baymard https://baymard.com/blog/handling-accidental-taps-on-touch-devices ; Chess.com "Confirm Each Move" https://support.chess.com/en/articles/8609803-how-do-i-turn-on-confirm-move-mobile ; Board Game Arena confirm button threads.
- Customisation precedent: Prince of Persia Lost Crown mobile: size, position, transparency per virtual input; buttons vs swipe vs double-tap; buttons vs stick; 3 saved layouts. https://news.ubisoft.com/en-us/article/7HvHq2SIDTcXg6ap0v4QgD/prince-of-persia-the-lost-crown-mobile-accessibility-spotlight
- Unity forum opinion: tap d-pad with diagonals beats swipe for fun (single opinion). https://discussions.unity.com/t/i-want-your-opinions-on-mobile-controls-and-general-game-play/496313

## Inferences (mine, not cited)
- The genre norm is tap-to-move (Pixel Dungeon, Hoplite) and the commonest pairing elsewhere is "d-pad OR swipe, player's choice". Offering both is common; I found no evidence of swipe-anywhere being badly received, but also no direct reviews of it.
- For fatal hidden hazards, the Pixel Dungeon complaint is the closest analogue: single-tap tap-to-walk onto unexplored/unknown risk is the highest accidental-death risk. Walking only onto explored tiles (already built) mitigates it; consider stopping path on newly revealed info, and a path preview or second tap to confirm for multi-step walks (optional setting).
- D-pad is likely the lowest-error scheme (fixed targets, reliable in frantic moments per Redungeon) but occludes the board in landscape and needs two hands; swipe is faster and frees view but has direction-misread risk. Make swipe optional, with a minimum distance, act-on-release, and a dead zone; default off or clearly toggled.
- Attack: place it on the opposite side from the d-pad (thumb of other hand), >=48dp, visually distinct, never adjacent to a movement button; since the direction is the facing, show a facing/aim indicator on the board before firing. Fire on release, optional confirm for last arrow. Left/right swap of the whole control cluster, size/opacity sliders, light haptic on step and stronger on shot are my suggestions, supported only by general precedent above.
- Hold-to-repeat on the d-pad should stop on any new reveal/hazard cue; input buffering should be capped (1 queued input) so lag does not queue deaths. Undo is unusual in roguelites; fatal-step protection is more valuable than undo.

## Gaps
- No Dungelot, Desktop Dungeons mobile, Into the Breach mobile, Slay the Spire mobile, Sword of Fargoal, Dragonsweeper, or Minesweeper-like control reviews found.
- No measured error-rate or speed comparison of swipe vs d-pad vs tap; no landscape-specific thumb-reach study; no GDC Vault / Game Developer postmortem found.
- Apple/Material figures and Hoober's updated guidance are secondhand (primary pages not read).
- Game Accessibility Guidelines not reached; left-handed layout, hold-to-repeat, input-buffering demand not evidenced.
- Search tool is US-only and returned snippets; results include low-quality aggregator pages (marlvel.ai, SEO pages) which I discounted.
