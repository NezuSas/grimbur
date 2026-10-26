# Capturas de la ficha de Google Play

Ocho capturas en horizontal de 1920x1080 (16:9, PNG, menos de 8 MB cada una), hechas con la propia app (versión web de desarrollo) en español.
Están en el orden recomendado para la ficha: las dos primeras son las que se ven sin deslizar.

| # | Archivo | Qué enseña | Texto superpuesto sugerido (EN / ES) |
| --- | --- | --- | --- |
| 1 | `01_wumpus_and_guardians.png` | Tablero de magma con guardianes, acechadores, un durmiente, un vórtice y el Grimbur | Face the Grimbur / Enfréntate al Grimbur |
| 2 | `02_read_the_clues.png` | Tablero de cristales con las pistas numeradas | Read the clues, avoid the danger / Lee las pistas y evita el peligro |
| 3 | `03_cover.png` | Portada | Descend. Deduce. Slay the Grimbur. / Desciende. Deduce. Vence al Grimbur. |
| 4 | `04_hero_mira.png` | Selección de héroe (Mira) con su poder y habilidad | Six heroes, six playstyles / Seis héroes, seis estilos |
| 5 | `05_hero_bram.png` | Selección de héroe (Bram) | Unlock new heroes / Desbloquea nuevos héroes |
| 6 | `06_forge.png` | La Forja | Every run makes you stronger / Cada partida te hace más fuerte |
| 7 | `07_progress.png` | Mi progreso | Track your progress / Sigue tu progreso |
| 8 | `08_achievements.png` | Logros | 100+ achievements / Más de 100 logros |

Para la ficha en inglés, vuelve a generarlas con el idioma en inglés: `& .\scripts\screenshots.ps1 -Screens ... -Lang en -Sizes 1280x720 -Scale 1.5`
(ver `scripts/screenshots.ps1`; los parámetros de cada pantalla están en el historial de este commit y en `docs/release/QA_TEST_PLAN.md`).
Regenerarlas después de cambiar el aspecto del juego, para que no queden desactualizadas.
