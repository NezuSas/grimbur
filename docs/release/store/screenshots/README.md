# Capturas de la ficha de Google Play

Ocho capturas en horizontal de 1920x1080 (16:9, PNG, menos de 8 MB cada una), hechas con la propia app (versión web de desarrollo) en español.
Están en el orden recomendado para la ficha: las dos primeras son las que se ven sin deslizar.

| # | Archivo | Qué enseña | Texto superpuesto sugerido (EN / ES) |
| --- | --- | --- | --- |
| 1 | `01_grimbur_and_guardians.png` | Tablero de magma con guardianes, acechadores, un durmiente, un vórtice y el Grimbur | Face the Grimbur / Enfréntate al Grimbur |
| 2 | `02_read_the_clues.png` | Tablero de cristales con las pistas numeradas | Read the clues, avoid the danger / Lee las pistas y evita el peligro |
| 3 | `03_cover.png` | Portada | Descend. Deduce. Slay the Grimbur. / Desciende. Deduce. Vence al Grimbur. |
| 4 | `04_hero_mira.png` | Selección de héroe (Mira) con su poder y habilidad | Six heroes, six playstyles / Seis héroes, seis estilos |
| 5 | `05_hero_bram.png` | Selección de héroe (Bram) | Unlock new heroes / Desbloquea nuevos héroes |
| 6 | `06_forge.png` | La Forja | Every run makes you stronger / Cada partida te hace más fuerte |
| 7 | `07_progress.png` | Mi progreso | Track your progress / Sigue tu progreso |
| 8 | `08_achievements.png` | Logros | 100+ achievements / Más de 100 logros |

Para la ficha en inglés, vuelve a generarlas con el idioma en inglés: `& .\scripts\screenshots.ps1 -Screens ... -Lang en -Sizes 1280x720 -Scale 1.5`.
Regenerarlas después de cambiar el aspecto del juego, para que no queden desactualizadas.

Parámetros exactos (preset `veteran`, `-Sizes 1280x720 -Scale 1.5`):

- 01: `-Screens LessonScreen -Params '{"lesson":"deduce","devHideBanner":true,"devBiome":"magma","devEntities":[{"index":4,"type":"boss","hp":3},{"index":9,"type":"enemy"},{"index":20,"type":"enemy"},{"index":16,"type":"stalker"},{"index":13,"type":"sleeper"},{"index":7,"type":"pit"},{"index":11,"type":"coin"},{"index":18,"type":"coin"},{"index":22,"type":"shield"}]}'`
- 02: `-Screens LessonScreen -Params '{"lesson":"deduce","devHideBanner":true,"devBiome":"crystal","devEntities":[{"index":10,"type":"enemy"},{"index":21,"type":"enemy"},{"index":8,"type":"pit"},{"index":5,"type":"coin"},{"index":17,"type":"coin"},{"index":12,"type":"coin"}]}'`
- 03: `-Screens CoverScreen` · 04/05: `-Screens CharactersScreen -Params '{"devHero":4}'` (Mira) / `'{"devHero":5}'` (Bram)
- 06/07/08: `-Screens ForgeScreen,ProgressScreen,AchievementsScreen`
