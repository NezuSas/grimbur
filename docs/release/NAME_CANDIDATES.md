# Nombre comercial: candidatos y qué implica el cambio

**DECIDIDO 2026-10-25: el juego y el monstruo se llaman Grimbur** (título de tienda: `Grimbur: Cave of Clues` /
`Grimbur: cueva de pistas`). Renombre ejecutado en app, textos, ficha y package id (`com.nezu.grimbur`).
Pendiente del dueño: búsqueda de marca (A1, última fila de este documento).

Estado 2026-10-25. Decisión del dueño (checklist A1). "Wumpus" viene de *Hunt the Wumpus* (1973) y es
la mascota de Discord: funciona como homenaje, pero no se puede poseer como marca y compite mal en búsquedas.

## Colisiones verificadas (búsqueda web del 2026-10-25)

| Candidato | Resultado |
| --- | --- |
| **Grimbur** | Sin ningún resultado: nombre inventado, libre y registrable. |
| **Gemhollow** | Libre como videojuego (solo existe *Gnome Hollow*, un juego de mesa distinto). |
| **Cluefall** | Libre. |
| **Hollow Mountain** | Casi libre (solo un proyecto fan de itch.io con otro nombre completo), pero el espacio "Hollow" está saturado (*Hollow Knight*, *Grimm's Hollow*, *Hollow Mine*). |
| ~~Emberdeep~~ | DESCARTADO: ya existen dos juegos con ese nombre. |

Competencia directa en el nicho (buscaminas-roguelite): *DemonCrawl*, *Dungelot*, *RogueSweeper*, *ROGRID*, *DungeonSweeper*.
Conclusión: evitar nombres con "sweeper" (hay cuatro) y buscar una marca propia + subtítulo descriptivo para las búsquedas.

## Recomendación

1. **Grimbur** — renombrar también al monstruo (hoy "el Wumpus") a **Grimbur** y conservar la estructura de marca actual
   (criatura + subtítulo). Título Play (≤30): `Grimbur: Cave of Clues` (22) / ES `Grimbur: cueva de pistas`.
   Pros: único en internet, registrable, pronunciable igual en ES y EN, el icono ya ES el monstruo.
   Contras: palabra sin significado (hay que construirla con el arte).
2. **Gemhollow** — `Gemhollow: Deduce & Descend` (27). Evoca gemas + cueva; el monstruo necesitaría nombre aparte.
3. **Hollow Mountain** — ya es el lugar de la historia ("bajo la Montaña Hueca"); cero reescritura de lore, pero marca débil (descriptiva y espacio saturado).

## Qué toca un renombre (DEV, ~1 día)

- `app.json` (`name`; el `slug` y el `projectId` de EAS pueden quedarse: son internos).
- **`android.package` / `ios.bundleIdentifier`** (`com.cuencaoscar.wumpusadventures`): como aún NO se subió nada a Play,
  este es el único momento barato para cambiarlos (después de la primera subida son permanentes). Sugerencia: `com.nezu.<nombre>`.
- Textos: ~40 claves de i18n que dicen "Wumpus" (EN/ES), historia, logros, compartir, ficha de tienda, política de privacidad.
- El monstruo: sprites se quedan, cambia solo el nombre en textos (`Wumpus_Boss.png` puede conservar su nombre de archivo).
- Música/sonido: sin cambios. Firebase: sin cambios (el proyecto es `nezu-games`, neutro a propósito).
- Antes de decidir: búsqueda de marca en USPTO/EUIPO/SENADI y en Play/App Store con el nombre exacto (OWNER).
