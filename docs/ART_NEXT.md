# Arte que falta: segundo paquete para ChatGPT

El primer paquete (`ART_PROMPTS.md`) ya está hecho y integrado: héroes, el Grimbur, el guardián, el vórtice, gemas, reliquias,
casillas y el fondo de portada. Este documento es lo que el juego necesita **ahora**, por orden de impacto, con prompts listos.
Todo se pide en el **mismo chat y la misma línea gráfica** (ver "Cómo mantener el estilo").

## Cómo mantener el estilo (lo más importante)

El estilo actual es: ilustración 2D tipo mobile pulido, **contorno oscuro grueso**, colores saturados y brillantes sobre mood de
cueva índigo, formas grandes y legibles al reducirlas a 56 px, un toque de brillo/sparkle, personajes de proporción "chibi"
(cabeza grande). Para no desviarse:

1. **Usa el mismo chat de ChatGPT del primer paquete.** Si ya no existe, abre uno nuevo y pega el *Prompt maestro* de
   `ART_PROMPTS.md`.
2. **Adjunta imágenes de referencia en cada pedido.** Es lo que más pesa. Las que debes adjuntar están en cada sección con su
   ruta (por ejemplo `src/assets/sprites/enemies/Guardian_Enemy.png`). Escribe: *"Same art style, outline thickness, lighting
   and level of detail as the attached image(s)."*
3. **Fondo transparente.** Si te devuelve fondo blanco o cuadriculado, repite con: *"same image on a flat solid pure magenta
   #FF00FF background, no gradients"*. Yo quito el magenta.
4. **Un personaje por mensaje**, sin texto, sin marca de agua, sin sombra pintada.
5. Mira el resultado **a tamaño pequeño** (reduce la imagen a unos 60 px): si no se entiende de un vistazo, pídelo de nuevo con
   "bigger shapes, fewer details, higher contrast".
6. Guarda cada archivo con el **nombre exacto** y en la **carpeta exacta** de la tabla. No importa el tamaño que te dé
   (1024x1024 o 1536x1024): yo lo redimensiono, comprimo y conecto.
7. Anota en `docs/ASSETS.md` por cada imagen: herramienta, fecha, prompt, y que tu plan permite uso comercial.

Reglas: nada parecido a Mario, Pokémon, la mascota de Discord ni personajes existentes; no uses nombres de artistas.

---

## Prioridad 1: acechadores y durmientes (2 imágenes) — lo que más se nota

Hoy los **acechadores** (los que caminan hacia ti) y los **durmientes** usan el mismo dibujo que el guardián normal, con solo un
aura de color. Es difícil saber qué te amenaza. Con dibujo propio, el jugador aprende los enemigos de un vistazo.

Adjunta como referencia: `src/assets/sprites/enemies/Guardian_Enemy.png` y `src/assets/sprites/enemies/Grimbur_Boss.png`.
Todos 1024x1024, transparente, vista frontal, centrado.

### 1.1 Acechador (el que camina)
- **Guardar como:** `src/assets/sprites/enemies/Stalker_Enemy.png`
```
A lean, fast cave stalker monster that hunts the player: low hunched predator body made of dark purple shadow and cracked
obsidian plates, long thin limbs with claws, a narrow head with two glowing magenta slit eyes, a faint wisp of purple mist
trailing from its back. Clearly more agile and more sinister than the round mossy stone guardian, and smaller than the huge
Grimbur boss. Same art style, bold dark outline and lighting as the attached images. Transparent background, centered,
no text, no shadow.
```

### 1.2 Durmiente (guardián dormido)
- **Guardar como:** `src/assets/sprites/enemies/Sleeper_Enemy.png`
```
The same kind of round stone-and-moss cave guardian as the attached image, but fast asleep: curled up like a sleeping dog,
eyes shut with peaceful little closed lids, a tiny bubble at the nostril, moss growing on its back, calm and harmless-looking
so the player is tempted to walk past. No letters and no 'zzz' text. Same art style, bold dark outline and lighting as the
attached image. Transparent background, centered.
```
(Cuando lleguen, el juego deja de usar el guardián con transparencia para los durmientes y muestra este.)

---

## Prioridad 2: una cueva distinta por bioma (9 imágenes)

El juego cambia de cueva cada 3 pisos (cristales, magma, la guarida del Grimbur) pero hoy solo cambia un **tinte** de color sobre
la misma imagen. Con arte propio cada tramo del juego se siente como un lugar nuevo.

Adjunta: `src/assets/sprites/backgrounds/Cover_Background.png` y `src/assets/sprites/tiles/Tile_Hidden.png` +
`Tile_Revealed.png` (para ver cómo son las casillas actuales).

### 2.1 Fondos de juego (3 imágenes)
1536x1024 o similar, **sin transparencia**, misma composición que el fondo de portada: antorchas a los lados, el centro oscuro y
despejado (ahí va el tablero). Sin texto.
- `src/assets/sprites/backgrounds/Bg_Crystal.png` — *Same composition and style as the attached cave background, but a crystal
  cavern: walls dense with huge glowing cyan and ice-blue crystals, cold blue light, torches replaced by glowing crystal lamps,
  dark clear center.*
- `src/assets/sprites/backgrounds/Bg_Magma.png` — *Same composition and style, but a volcanic magma tunnel: dark basalt walls
  with glowing orange-red lava cracks and rivers, ember sparks floating, warm red-orange light, torches burning bigger, dark
  clear center.*
- `src/assets/sprites/backgrounds/Bg_Lair.png` — *Same composition and style, but the Grimbur' lair: a huge dark chamber with
  bones, giant claw marks on the walls, a pile of old treasure and gems at the sides, faint red glow, ominous, dark clear
  center.*

### 2.2 Casillas por bioma (6 imágenes)
1024x1024, **cuadradas, sin transparencia**. Cada casilla actual es una **baldosa con marco de piedra grueso** alrededor (se ven
las piedras del marco en el borde); las nuevas deben tener exactamente esa estructura, cambiando material y color.
- `Tile_Hidden_Crystal.png` y `Tile_Revealed_Crystal.png` — oculta: piedra oscura azulada cubierta de bruma fría; revelada:
  piedra azul pálida con pequeños cristales cian incrustados.
- `Tile_Hidden_Magma.png` y `Tile_Revealed_Magma.png` — oculta: basalto casi negro con humo; revelada: basalto con grietas
  naranjas brillantes.
- `Tile_Hidden_Lair.png` y `Tile_Revealed_Lair.png` — oculta: piedra negra-roja con polvo; revelada: piedra manchada con rasguños
  de garras y huesos pequeños.
- **Guardar en:** `src/assets/sprites/tiles/`
- Los prompts exactos están en la conversación; la regla es: misma estructura de marco, mismo grosor y brillo, solo cambia el
  material. Genera primero la oculta y, al pedir la revelada, adjunta también la oculta recién aprobada.

---

## Prioridad 3: iconos de herramientas, habilidades y tienda (9 imágenes)

Hoy la barra de herramientas y la tienda usan iconos genéricos del sistema (un "radio", una "llama"). Con iconos propios, al
estilo de las reliquias, el juego se ve de una sola pieza.

Adjunta: `src/assets/sprites/relics/lantern.png` y `src/assets/sprites/relics/phoenix.png` (son el estilo exacto a seguir:
objeto con **aro dorado** y brillo).
Todos 512x512, transparente, centrados, objeto grande que llene el 80% del cuadro.

| Guardar como (en `src/assets/sprites/tools/`) | Qué es |
| --- | --- |
| `Tool_Detector.png` | Un cristal-brújula que pulsa ondas verdes (detecta peligros cercanos) |
| `Tool_Bomb.png` | Una bomba negra redonda con mecha encendida y chispas naranjas |
| `Tool_Undo.png` | Un reloj de arena con una flecha curva que gira hacia atrás, brillo violeta |
| `Ability_Scout.png` | Un ojo abierto brillante dentro de un aro, destello cian (explorar) |
| `Ability_Volley.png` | Tres flechas disparadas en abanico, plumas naranjas (andanada) |
| `Ability_Brace.png` | Un escudo redondo con las manos en guardia o rayos azules (resguardo) |
| `Ability_Magnet.png` | Un imán en forma de herradura atrayendo gemas cian y doradas |
| `Shop_Altar.png` | Un pequeño altar de piedra con una llama violeta y un escudo en ofrenda |
| `Shop_Arrows.png` | Dos flechas cruzadas con "+2" en forma de runas (sin texto): una carcaj pequeño |

Prompt base: *{OBJETO} as a collectible game icon, glowing gold rim around it like the attached relic icons, bold dark outline,
magical glow, big readable shape. Same art style as the attached images. Transparent background, centered, no text.*

---

## Prioridad 4: héroes nuevos (6 imágenes por héroe)

Más héroes = más motivo para jugar y para coleccionar trajes (cada héroe nuevo trae sus propios trajes automáticamente: yo los
genero con el script). Propongo **dos** que se diferencian de los cuatro actuales en forma y color, y cada uno juega distinto
(yo diseño sus poderes y habilidades en el código cuando llegue el arte).

**Reglas de consistencia (críticas para que no se note la diferencia):**
- Cuerpo completo, **de frente mirando levemente a la derecha** (el juego lo voltea cuando camina a la izquierda), pies cerca del
  borde inferior.
- Misma proporción que los actuales: cabeza grande, cuerpo corto. Adjunta **`Hero_Cyan.png` y `Attack_Cyan.png`** de
  `src/assets/sprites/characters/` y pide "same proportions, same outline thickness, same size on the canvas".
- Colores que **no se repitan** con los actuales (cian, rojo, verde y dorado).
- 1024x1024, transparente. Tres poses: parado, disparando, retrato.

### 4.1 Mira, la guardiana del farol (maga de luz)
Color principal: **magenta y blanco crema**. Juega la información: ve más y revela más.
- `src/assets/sprites/characters/Hero_Pink.png` — de pie.
```
A young lantern-keeper heroine, full body, standing, facing slightly right: a short hooded cape in magenta and cream, big
bright eyes, short messy hair, carrying a glowing ornate lantern in one hand and a small wand in the other. Chibi proportions
(big head, short body) exactly like the attached hero images, same bold dark outline and lighting. Transparent background,
centered, feet near the bottom edge, no text.
```
- `src/assets/sprites/characters/Attack_Pink.png` — *Same character and outfit, casting a bolt of light from the wand toward the
  right, the lantern flaring brightly, dynamic pose like the attached attack image.*
- `src/assets/sprites/characters/Icon_Pink.png` — *Same character, bust portrait only (head and shoulders) filling a square,
  like the attached icon images.* (256 es suficiente)

### 4.2 Bram, el artillero (enano de las bombas)
Color principal: **naranja cobre y gris hollín**. Juega los objetos: bombas y detectores.
- `src/assets/sprites/characters/Hero_Orange.png` — de pie.
```
A stocky dwarf tinkerer hero, full body, standing, facing slightly right: soot-stained copper-orange apron and leather straps,
round goggles pushed up on his forehead, a braided beard, a bandolier full of small round bombs and a big wrench in hand.
Chibi proportions (big head, short wide body) exactly like the attached hero images, same bold dark outline and lighting.
Transparent background, centered, feet near the bottom edge, no text.
```
- `src/assets/sprites/characters/Attack_Orange.png` — *Same character, throwing a lit round bomb to the right, arm extended,
  mid-throw, dynamic pose.*
- `src/assets/sprites/characters/Icon_Orange.png` — *Same character, bust portrait only, square, like the attached icons.*

> Si quieres pedir un tercero después, que sea otro cuerpo distinto (por ejemplo una criatura pequeña o un caballero grande) para
> que la plantilla no se parezca a las otras.

---

## Prioridad 5: poses de victoria y derrota (8 imágenes)

La tarjeta de fin de partida y la de piso completado muestran al héroe siempre de pie. Con poses propias se siente la emoción.
Adjunta del héroe correspondiente `Hero_<Color>.png` (de `src/assets/sprites/characters/`).
Por héroe, 2 imágenes: 1024x1024, transparente, mismo traje y proporciones.

- `Win_Cyan.png`, `Win_Red.png`, `Win_Green.png`, `Win_Gold.png` — *Same character, joyful victory pose: one arm raised, a big
  smile, a few sparkles around, a gem in the free hand.*
- `Lose_Cyan.png`, `Lose_Red.png`, `Lose_Green.png`, `Lose_Gold.png` — *Same character, defeated pose: sitting on the ground or
  kneeling, head down, tired but cute (not gory, no blood), a small cloud of dust.*
- **Guardar en:** `src/assets/sprites/characters/`

(Si te tardas, puedo derivar poses sencillas del arte actual, pero no se verán igual de buenas.)

---

## Prioridad 6: puertas del camino (4 imágenes)

Entre pisos eliges una de dos puertas, cada una con su regla. Hoy son texto. Con un icono, el jugador decide con el corazón.
Adjunta `relics/lantern.png` como referencia de estilo. 512x512, transparente, **con aro dorado**.

| Guardar como (en `src/assets/sprites/doors/`) | Qué es |
| --- | --- |
| `Door_Bounty.png` | Un cofre abierto rebosante de gemas y monedas, brillo dorado |
| `Door_Calm.png` | Una luna creciente con una pluma blanca, luz azul suave |
| `Door_Arsenal.png` | Un soporte con arcos y flechas, destello naranja |
| `Door_Plain.png` | Una puerta de piedra sencilla, cerrada, con una antorcha |

---

## Prioridad 7: tienda y presentación (3 imágenes)

| Guardar como | Tamaño | Qué es |
| --- | --- | --- |
| `store/feature-graphic.png` | 1024x500 | Banner de Google Play: el título "GRIMBUR ADVENTURES" (aquí SÍ se permite texto), los cuatro héroes y el Grimbur detrás, cueva oscura con gemas. Composición horizontal, el texto a la izquierda |
| `assets/logo.png` | 1024x512, transparente | El título "GRIMBUR ADVENTURES" como logotipo ilustrado: letras gruesas doradas con contorno oscuro y una gema cian, estilo del juego |
| `assets/icon.png` (opcional, si no te gusta el actual) | 1024x1024 | Icono de la app: los ojos rojos del Grimbur asomando de la oscuridad con una gema cian al frente. Alto contraste, que se lea a 48 px |

Adjunta: `src/assets/sprites/enemies/Grimbur_Boss.png`, `Hero_Cyan.png` y `Icon_Gem.png`.

---

## Resumen y orden recomendado

| # | Paquete | Imágenes | Impacto |
| --- | --- | --- | --- |
| 1 | Acechador + durmiente | 2 | Alto: el jugador entiende a cada enemigo |
| 2 | Biomas (fondos + casillas) | 9 | Alto: cada tramo del juego se siente nuevo |
| 3 | Iconos de herramientas y tienda | 9 | Medio-alto: coherencia visual |
| 4 | Héroes nuevos (2) | 6 | Alto para retención y colección de trajes |
| 5 | Poses de victoria y derrota | 8 | Medio: más emoción al terminar |
| 6 | Puertas del camino | 4 | Medio |
| 7 | Gráfico de tienda y logotipo | 2-3 | Necesario para publicar |

Puedes mandármelos por lotes. En cuanto me digas "ya están las del paquete N", los reviso, los recorto, los comprimo, los conecto
al juego, y te muestro capturas. Si algo no se ve bien contra el resto, te digo exactamente qué pedirle de nuevo a ChatGPT.

---

## Paquete 4b: iconos de las habilidades de Mira y Bram (2 imágenes)

Hoy usan temporalmente el icono del ojo (Destello) y el de la bomba (Estallido). Mismo estilo que `Ability_*.png`: adjunta
`src/assets/sprites/tools/Ability_Scout.png` y `Ability_Magnet.png` como referencia. 1024x1024, transparente, en
`src/assets/sprites/tools/`.

- `Ability_Flare.png` — *Same art style, bold dark outline, glossy shading, golden rim and glow as the attached ability icons. A
  game ability icon for "flare": a bright magenta-and-white starburst of light radiating from a small brass lantern flame, soft
  rays spreading outward in all directions, small sparkles. Big readable shape filling about 80% of the frame. 1024x1024,
  transparent background, centered, no text, no shadow.*
- `Ability_Blast.png` — *Same art style, bold dark outline, glossy shading, golden rim and glow as the attached ability icons. A
  game ability icon for "blast": a big orange explosion burst with a small black round bomb at its center, fiery rays and smoke
  puffs. It must look different from a plain bomb icon: the explosion is the main shape. Big readable shape filling about 80% of
  the frame. 1024x1024, transparent background, centered, no text, no shadow.*

Cuando estén guardados, los conecto en `src/ui/toolArt.ts` (reemplazan a los provisionales).
