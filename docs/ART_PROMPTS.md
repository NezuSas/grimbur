# Paquete de arte para ChatGPT (prompts listos para copiar)

Este documento reemplaza el uso práctico de `ART_BRIEF.md`: aquí cada archivo tiene su prompt completo,
su ruta y su nombre exacto. Respeta los nombres tal cual (mayúsculas incluidas) y yo los conecto sin tocar código.

## Cómo trabajar con ChatGPT (haz esto una sola vez al empezar)

1. Abre **un solo chat nuevo** de ChatGPT con generación de imágenes y úsalo para TODO el set.
   Así mantiene el mismo estilo. Si el chat se alarga y el estilo se desvía, pega de nuevo el "Prompt maestro".
2. Primer mensaje: pega el **Prompt maestro** (abajo) y la **paleta**. Dile: "Confirma y espera el primer pedido".
3. Para cada archivo: pega su prompt. Si el resultado no te gusta, pide cambios en lenguaje normal
   ("más oscuro", "ojos más grandes") sin cambiar el estilo.
4. **Fondo transparente:** pídelo siempre. Si ChatGPT te entrega fondo blanco o con cuadros pintados, repite con:
   *"Same image on a flat solid pure magenta (#FF00FF) background, no gradients, no shadows"*. Yo quito el magenta.
5. Para que los sprites sean consistentes, **adjunta la imagen del primer sprite aprobado** como referencia en los siguientes
   ("same style as the attached image").
6. Guarda cada imagen con el **nombre exacto** en la **carpeta exacta** (columna "Guardar como"). Rutas relativas a la raíz del
   proyecto: `C:\Users\ocuen\Developer\Nezu\WumpusAdventures\`.
7. No importa el tamaño exacto que te dé ChatGPT (suele dar 1024x1024 o 1536x1024). Yo lo redimensiono y comprimo.
8. Anota en `docs/ASSETS.md` por cada imagen: herramienta, fecha, prompt y que tu plan permite uso comercial.
9. Antes de reemplazar, **no borres los originales**: yo los respaldo en `src/assets/_old/` cuando me avises.

Reglas: sin texto en las imágenes (salvo la gráfica de la tienda), sin sombras pintadas, sin marcas de agua, sin nombres de
artistas ni personajes existentes. Nada parecido a la mascota Grimbur de Discord, a Mario ni a Pokémon.

## Paleta (si ChatGPT la respeta, tu juego se verá unificado)

| Uso | Color | Hex |
| --- | --- | --- |
| Cueva, sombras | Índigo muy oscuro | `#0E0B1F` |
| Piedra revelada | Violeta-gris cálido | `#3B3358` |
| Piedra oculta (niebla) | Azul carbón | `#1A1730` |
| Peligro (guardianes, boss) | Rojo/naranja ardiente | `#FF4B3E` / `#FF9A3C` |
| Vórtice | Púrpura mágico | `#9C4DFF` |
| Gemas y tesoro | Cian brillante + oro | `#00E5FF` / `#FFD54F` |
| Fuego / brasas (Forja) | Ámbar | `#FFAB40` |
| Héroes | Cian `#00E5FF`, Rojo `#FF1744`, Verde `#76FF03`, Oro `#FFD600` |

Cuando lleguen las imágenes, ajusto yo los colores de la interfaz (botones, paneles, fondos) a esta paleta o a la que
resulte de tus imágenes.

## Prompt maestro (pégalo primero y al inicio de cada sesión nueva)

```
You are my art generator for a mobile game called Grimbur Adventures: a dark-fantasy cave puzzle roguelite viewed top-down
in landscape on phones. Use ONE consistent style for every image I request from now on:

STYLE: chunky 2D hand-painted game illustration, bold dark outline (3 px at 512 px), soft top-left lighting, rich saturated
colors on a deep indigo cave mood, limited palette (deep indigo #0E0B1F, violet stone #3B3358, ember orange #FF9A3C, danger
red #FF4B3E, magic purple #9C4DFF, gem cyan #00E5FF, treasure gold #FFD54F). Shapes must read clearly when shrunk to 56 px:
big silhouettes, few details, high contrast. Friendly-but-spooky tone, like a polished indie mobile game.

TECHNICAL: transparent background (PNG), subject centered with about 8% padding, same camera angle and lighting in every
image, no text, no letters, no watermark, no cast shadow, no frame. Never imitate any existing character, brand or living artist.

Reply "ready" and wait for my first request.
```

---

## LOTE 1 — El impacto más grande (hazlo primero)

Todos: 1024x1024, fondo transparente. Prepend mental: "Same style as the master prompt."

### 1.1 El Grimbur (jefe final)
- **Guardar como:** `src/assets/sprites/enemies/Grimbur_Boss.png`
```
A hulking cave beast boss called the Grimbur: huge shaggy dark-violet fur, three glowing red eyes in a row, wide mouth with
big fangs, long curved claws, small horns, intimidating but slightly goofy, front view, fills the frame. Dark-fantasy mobile
game boss sprite, transparent background, centered, no text, no shadow.
```

### 1.2 Guardián (enemigo común)
- **Guardar como:** `src/assets/sprites/enemies/Guardian_Enemy.png`
```
A small cave guardian monster, round stone-and-moss body, two angry glowing orange eyes, little tusks, short stubby arms,
menacing but cute, front view. Must look clearly different from the huge Grimbur boss. Transparent background, centered.
```

### 1.3 Vórtice
- **Guardar como:** `src/assets/sprites/tiles/Danger_Vortex.png`
```
A swirling magic purple vortex portal seen from above on a stone floor, spiral of violet and cyan light, glowing center,
sparkles. Top-down, fits inside a square tile, transparent background.
```

### 1.4 Gema
- **Guardar como:** `src/assets/sprites/items/Icon_Gem.png`
```
A single faceted cyan gem with a golden glint, bright inner glow, sparkle highlights, collectible game item icon, 3/4 top
view. Transparent background, centered.
```

### 1.5 Escudo (recogible)
- **Guardar como:** `src/assets/sprites/items/Icon_Shield.png`
```
A round blue steel shield with a glowing cyan rune in the center, magical glow around it, collectible game icon.
Transparent background, centered.
```

### 1.6 Flechas (recogible)
- **Guardar como:** `src/assets/sprites/items/Icon_Arrows.png`
```
A small bundle of three arrows tied together with a leather strap, bright orange feather fletching, steel arrowheads,
collectible game icon, diagonal composition. Transparent background, centered.
```

### 1.7 Trampa activada
- **Guardar como:** `src/assets/sprites/tiles/Trap_Sprung.png`
```
A sprung stone floor trap: a square metal plate with sharp steel spikes rising out of it, a few dark red stains, top-down
3/4 view, fits inside a square tile. Transparent background.
```

---

## LOTE 2 — Casillas (cambian toda la mirada del juego)

Cuadradas, **bordes que encajan unos con otros** (van pegadas en una cuadrícula). 1024x1024. Fondo NO transparente: la
baldosa llena todo el cuadro, de borde a borde.

### 2.1 Casilla oculta (niebla)
- **Guardar como:** `src/assets/sprites/tiles/Tile_Hidden.png`
```
A square stone floor tile seen from above, filling the entire image edge to edge, covered in thick dark blue fog and shadow,
faint swirling mist, mysterious and unexplored, very subtle thin bevel at the edges so neighbors tile cleanly. Palette dark
charcoal blue #1A1730. No text.
```

### 2.2 Casilla revelada
- **Guardar como:** `src/assets/sprites/tiles/Tile_Revealed.png`
```
A square stone floor tile seen from above, filling the entire image edge to edge, warm violet-gray cobblestone lit by
torchlight, clean readable surface, small cracks, subtle thin bevel at the edges so neighbors tile cleanly. Palette #3B3358
with warm highlights. Calm enough that numbers and icons drawn on top stay readable. No text.
```

---

## LOTE 3 — Héroes (si quieres cambiar el estilo, regenera los 12 juntos)

Hoy hay 4 héroes con 3 imágenes cada uno. Si el estilo nuevo no combina con los viejos, haz los 12. Todos 1024x1024,
transparente, vista frontal, mismo encuadre.

Para cada color, tres versiones: **Hero** (de pie), **Attack** (disparando el arco), **Icon** (cabeza y hombros, para el menú).

| Color | Personaje (describe en el prompt) | Archivos |
| --- | --- | --- |
| Cyan `#00E5FF` | Explorador ágil con capa y capucha cian, "Trapfinder" | `Hero_Cyan.png`, `Attack_Cyan.png`, `Icon_Cyan.png` |
| Red `#FF1744` | Cazadora con armadura ligera roja, "Piercing arrows" | `Hero_Red.png`, `Attack_Red.png`, `Icon_Red.png` |
| Green `#76FF03` | Guerrero robusto con armadura verde de piedra, "Stoneskin" | `Hero_Green.png`, `Attack_Green.png`, `Icon_Green.png` |
| Gold `#FFD600` | Buscatesoros con abrigo dorado y bolsa de gemas, "Treasure hunter" | `Hero_Gold.png`, `Attack_Gold.png`, `Icon_Gold.png` |

- **Guardar en:** `src/assets/sprites/characters/` con los nombres de la tabla.

Plantilla (cambia lo que está entre corchetes):
```
A [description of the hero] adventurer for a dark-fantasy cave puzzle game, color accent [hex], chunky proportions, big head,
standing pose facing right, holding a small bow, same camera angle as the other heroes, front 3/4 view. Transparent
background, centered.
```
Versión Attack: "…same character, drawing the bow and shooting an arrow to the right."
Versión Icon: "…same character, head and shoulders portrait only, circular composition, friendly expression."

---

## LOTE 4 — Reliquias (11 iconos)

1024x1024, transparente, ícono de objeto con aro dorado brillante. Mismo estilo.
- **Guardar en:** `src/assets/sprites/relics/` con el id exacto como nombre.

| Archivo | Objeto a dibujar |
| --- | --- |
| `quiver.png` | Aljaba de cuero con muchas flechas, brillo mágico |
| `lucky_coin.png` | Moneda de oro con trébol de cuatro hojas |
| `iron_boots.png` | Par de botas de hierro pesadas |
| `lantern.png` | Linterna antigua encendida con luz cálida |
| `phoenix.png` | Pluma de fénix de fuego naranja y roja |
| `hunter.png` | Cabeza de lobo estilizada con marca de cazador |
| `long_bow.png` | Arco largo de madera con runas |
| `bulwark.png` | Baluarte: escudo grande de piedra con borde de hierro |
| `greed.png` | Bolsa de monedas rebosante de gemas |
| `frost.png` | Cristal de hielo azul con escarcha |
| `trap_sense.png` | Ojo místico con una trampa de pinchos delante |

Plantilla:
```
A [object] as a collectible relic icon for a dark-fantasy game, glowing gold rim, magical sparkle, chunky bold outline,
transparent background, centered.
```

---

## LOTE 5 — Fondo, icono y pantalla de carga

### 5.1 Fondo de portada
- **Guardar como:** `src/assets/sprites/backgrounds/Cover_Background.png` — pedir **1536x1024** (horizontal)
```
Wide landscape illustration of a cave mouth lit by torches, glowing gems in the walls, purple mist, deep indigo shadows,
dramatic but not too busy. Keep the center area calm and dark so a menu card can sit on top. No characters, no text.
```

### 5.2 Icono de la app
- **Guardar como:** `assets/icon.png` — 1024x1024, **sin transparencia**, a sangre
```
Square mobile app icon, full bleed: the three glowing red eyes of a cave beast peeking out of darkness, with a bright cyan
gem in the foreground, deep indigo background, high contrast, minimal detail, readable at 48 px. No text.
```

### 5.3 Icono adaptable Android (primer plano)
- **Guardar como:** `assets/adaptive-icon.png` — 1024x1024, transparente, el sujeto en el 66 % central
```
Same artwork as the app icon (three glowing red eyes and a cyan gem) but with a transparent background and the subject
shrunk to fit within the central 66% of the image so nothing is cropped. No text.
```

### 5.4 Splash
- **Guardar como:** `assets/splash.png` — 1284x2778 vertical, fondo `#000000`
```
Vertical splash screen: the same three red eyes and cyan gem emblem, centered, on a pure black background, soft glow, lots of
empty space around it. No text.
```

---

## LOTE 6 — Tienda (más adelante)

- `store/feature-graphic.png` — 1024x500, **aquí sí se permite texto** (el título).
- `store/screenshots/` — capturas reales del juego (yo no puedo hacerlas): tablero, jefe, elección de reliquia, victoria.

---

## Cómo me avisas

Dime: "Lote 1 listo" (o el que sea) y yo:
1. respaldo los originales en `src/assets/_old/`,
2. quito fondos magenta, redimensiono y comprimo (< 150 KB por sprite),
3. conecto lo nuevo (tablero, reliquias, portada) y ajusto colores de la interfaz a la paleta,
4. verifico el bundle y actualizo `docs/ASSETS.md`.

Puedes mandar por lotes; el Lote 1 + Lote 2 ya cambian casi toda la apariencia.
