# Ficha de tienda: textos finales (EN + ES) y guion de activos

Todo lo que dice este texto se ha contrastado con el código (versión 1.2.0 del repo, 2026-10-25). Las secciones de texto de tienda están en inglés y español; el resto en español.

Límites de Google Play: título 30, descripción corta 80, descripción completa 4000, "novedades" 500. App Store: nombre 30, subtítulo 30, texto promocional 170, palabras clave 100.

**Nombre decidido: Grimbur** (2026-10-25; investigación en `NAME_CANDIDATES.md`). El monstruo también se llama el Grimbur. Falta la búsqueda de marca del dueño (A1).
`TODO(owner)`: nombre final, correo de contacto, URL de política de privacidad, URL del sitio web (opcional).

**Suposición de monetización.** Los textos describen el modelo previsto: gratis hasta el piso 3 + reto diario, y una **compra única** para el resto (`GAME_CONFIG.monetization`, hoy `enabled: false`).
Si lanzas el juego completamente gratis, borra las líneas marcadas con `[COMPRA]`. Si activas el muro de pago, las descripciones deben decir claramente qué es gratis y qué no (política de Play: no engañar sobre el precio).

---

## English (en-US)

**Title (<=30):** `Grimbur: Cave of Clues` (22)
Alternatives: `Grimbur` (7) / `Grimbur: Deduction Roguelite` (28).

**Short description (<=80):** `Read the clues, dodge the guardians, grab the gems and slay the Grimbur.` (72)

**Full description (<=4000):**

```text
Every step could be your last.

Grimbur is a bite-sized deduction roguelite. Explore a fogged cave, read the icons and numbers on the tiles you reveal, grab every gem and escape the guardians and vortexes hiding in the dark. Every floor can be solved by deduction alone: think like a detective, then commit.

HOW IT PLAYS
- Clues, not luck: each tile you reveal shows how many guardians and vortexes touch it. Gems are always visible, dangers never are.
- Ten floors, one Grimbur: descend through ten floors of growing danger to the Grimbur lair. It hunts you, so aim true.
- Draft relics: after each floor pick 1 of 3 relics. They stack for the whole expedition. Beware the cursed ones: powerful, but they take something back.
- Six heroes, six styles, each with a passive perk and a rechargeable ability. Unlock them by playing and dress them in more than 30 outfits.
- Shop, altar and doors: spend the gems you collect between floors on arrows, a shield, a detector or a bomb, trade a shield for a second relic, and choose between two doors, each with its own twist.
- Cave twists: crystal veins, magma tunnels and omens that change each floor's rules.
- Stalkers and sleepers: late-game guardians that walk toward you or wake when you come close. Aim and fire first. Undo one step per floor.

COME BACK EVERY DAY
- Daily challenge: one cave per day, the same for every player. Keep your streak, climb the daily and weekly leaderboards and share your result as a picture.
- The Forge: every run earns embers, win or lose. Spend them on permanent upgrades that stay forever (they do not apply to the daily challenge, which stays fair for everyone).
- Six depths: win an expedition to unlock a harder one. Each stacks a new penalty on top of the last.
- Endless descent: no last floor, and a stronger Grimbur every ten floors. [COMPRA]
- Missions and ranks: three daily and two weekly missions, and a 12-rank ladder that grows with every ember you ever earn.
- Second chance: spend embers to come back right before the fatal move, or buy arrows mid-floor. Each costs more than the last; never in the daily.
- More than 100 achievements, a progress screen with your win rate and trend, and global, daily and weekly leaderboards.

PLAY WITH FRIENDS
- Live duels: two to four players race through the same cave at the same time, watching each other's floor and score. Stake embers if you dare: the winner takes the pot. Rematch in one tap.
- Challenge with a code: create a cave and send its 8-letter code. Whoever types it plays exactly the same floors, whenever they want, on its own leaderboard.
- Optional cloud copy of your progress with a private recovery key, to move to a new phone. Still no accounts.

MADE FOR QUICK SESSIONS
- A run takes minutes. Play in landscape with the pad or by swiping on the board; tap an explored tile to walk there; long-press to flag a danger.
- Short interactive tutorial, plus optional practice lessons (deducing, relics, shop, tools).
- English and Spanish. Adjustable controls (side, size, attack button), reduced flashes, haptics and sound options.
- Original soundtrack and sound effects.
- No ads. No accounts. No energy timers. Online features (leaderboards, duels) need internet; the rest of the game does not.

FREE TO START, ONE PURCHASE TO FINISH [COMPRA]
The tutorial, floors 1 to 3 and the daily challenge are free forever. A single one-time purchase unlocks the full expedition (floors 4 to 10 and the Grimbur) and the endless descent. No subscriptions, no loot boxes, no purchases that give a ranking advantage. Restore your purchase any time from the paywall.

Privacy: your progress stays on your device, with an optional cloud copy protected by a private key. If you save a score to a leaderboard or play a duel or challenge, only the name you type, your score, floor, gems, hero and time are sent. Read the policy: <TODO(owner): privacy policy URL>
Contact: <TODO(owner): support email>
```

**What's new (first release, <=500):**

```text
First release. 10 floors and the Grimbur, six heroes with outfits, relics, the Forge, a daily challenge, live duels and code challenges with friends, ember stakes, optional cloud save, endless descent, six difficulty depths and 100+ achievements. Available in English and Spanish. Feedback is welcome at <TODO(owner): support email>.
```

**Promo text (App Store, <=170):** `Deduce where the dangers hide, draft relics, slay the Grimbur and race your friends in live duels. A new cave every day. No ads.` (135)

**Subtitle (App Store, <=30):** `Deduce. Descend. Survive.` (25)

**App Store keywords (<=100):** `roguelike,puzzle,deduction,minesweeper,dungeon,monster,logic,strategy,offline,daily,duel,versus` (95)

## Español (es-419 principal; es-ES reutiliza el mismo texto)

**Título (<=30):** `Grimbur: cueva de pistas` (24)
Alternativas: `Grimbur` (7).

**Descripción corta (<=80):** `Lee las pistas, esquiva guardianes, recoge gemas y vence al Grimbur.` (68)

**Descripción completa (<=4000):**

```text
Cada paso puede ser el último.

Grimbur es un roguelite de deducción para partidas cortas. Explora una cueva entre la niebla, lee las pistas de cada casilla, recoge las gemas y esquiva los peligros ocultos. Cada piso se resuelve solo con deducción: piensa como detective y luego arriesga.

CÓMO SE JUEGA
- Pistas, no suerte: cada casilla revelada te dice cuántos guardianes y vórtices la rodean. Las gemas siempre se ven; los peligros, nunca.
- Diez pisos, un Grimbur: desciende por diez pisos cada vez más peligrosos hasta la guarida del Grimbur. Te persigue, así que apunta bien.
- Elige reliquias: tras cada piso escoges 1 de 3. Se acumulan durante toda la expedición. Cuidado con las malditas: muy poderosas, pero te quitan algo.
- Seis héroes, seis estilos, cada uno con su poder pasivo y una habilidad que se recarga al jugar. Se desbloquean jugando y se visten con más de 30 trajes.
- Tienda, altar y puertas: entre pisos gasta tus gemas, cambia un escudo por otra reliquia y elige entre dos puertas distintas.
- Giros de la cueva: vetas de cristal, túneles de magma y presagios que cambian las reglas de cada piso.
- Acechadores y durmientes: guardianes que caminan hacia ti o despiertan si te acercas. Apunta y dispara primero. Deshaz un paso por piso.

VUELVE CADA DÍA
- Reto diario: una cueva por día, igual para todos. Mantén tu racha, sube en las clasificaciones diaria y semanal y comparte tu resultado como imagen.
- La Forja: cada partida da brasas, ganes o pierdas. Gástalas en mejoras permanentes (no cuentan en el reto diario, que es justo para todos).
- Seis niveles de dificultad: gana una expedición para desbloquear una más difícil. Cada una suma una penalización nueva a la anterior.
- Descenso sin fin: sin último piso, y un Grimbur más fuerte cada diez pisos. [COMPRA]
- Misiones y rangos: tres misiones diarias y dos semanales, y una escalera de 12 rangos que crece con cada brasa que ganas.
- Segunda oportunidad: gasta brasas para volver justo antes del movimiento fatal, o compra flechas a mitad de piso. Cada vez cuesta más; nunca en el reto diario.
- Más de 100 logros, una pantalla de progreso con tu porcentaje de victorias y tendencia, y clasificaciones global, diaria y semanal.

JUEGA CON AMIGOS
- Duelos en vivo: de 2 a 4 jugadores recorren la misma cueva a la vez, viendo el piso y los puntos de los demás. Apuesta brasas: el ganador se lleva el bote. Revancha con un toque.
- Reto con código: crea una cueva y manda su código. Quien lo escriba juega los mismos pisos cuando quiera, con su propia clasificación.
- Copia opcional de tu progreso en la nube con una clave privada, para cambiar de teléfono. Sigue sin cuentas.

PARA PARTIDAS RÁPIDAS
- Una partida dura minutos. Se juega en horizontal, con cruceta, joystick o deslizando; toca una casilla explorada para caminar y mantén pulsado para marcar un peligro.
- Tutorial corto y lecciones de práctica opcionales.
- Inglés y español. Controles ajustables (lado, tamaño, botón de ataque), reducción de destellos, opciones de vibración y sonido.
- Banda sonora y efectos originales.
- Sin anuncios. Sin cuentas. Sin energía. Las funciones en línea (clasificaciones, duelos) necesitan internet; el resto del juego, no.

GRATIS PARA EMPEZAR, UNA COMPRA PARA TERMINAR [COMPRA]
El tutorial, los pisos 1 a 3 y el reto diario son gratis para siempre. Una sola compra desbloquea la expedición completa (pisos 4 a 10 y el Grimbur) y el descenso sin fin. Sin suscripciones, sin cajas de botín, sin ventajas de pago en la clasificación. Restaura tu compra cuando quieras.

Privacidad: tu progreso se queda en tu dispositivo, con una copia opcional en la nube protegida por una clave privada. Si guardas una puntuación en una clasificación o juegas un duelo o reto, solo se envía el nombre que escribes, tu puntuación, piso, gemas, héroe y tiempo. Política: <TODO(owner): URL de la política de privacidad>
Contacto: <TODO(owner): correo de soporte>
```

**Novedades (primera versión, <=500):**

```text
Primera versión. 10 pisos y el Grimbur, seis héroes con trajes, reliquias, la Forja, reto diario, duelos en vivo y retos con código entre amigos, apuestas de brasas, copia opcional en la nube, descenso sin fin, seis niveles de dificultad y más de 100 logros. En español e inglés. Tus comentarios son bienvenidos en <TODO(owner): correo de soporte>.
```

**Texto promocional (App Store, <=170):** `Deduce dónde se esconden los peligros, elige reliquias, vence al Grimbur y reta a tus amigos en duelos en vivo. Una cueva nueva cada día. Sin anuncios.` (152)

**Subtítulo (App Store, <=30):** `Deduce. Desciende. Sobrevive.` (29)

**Palabras clave (App Store, <=100):** `roguelike,puzzle,deduccion,buscaminas,mazmorra,monstruo,logica,estrategia,sin conexion,diario,duelo` (99)

---

## Etiquetas, categoría y datos de la ficha

| Campo | Valor |
| --- | --- |
| Tipo | Juego |
| Categoría Play | **Puzles** (alternativa: Estrategia). Es lo que busca quien juega buscaminas/lógica; "Rol" mezcla con RPG de combate |
| Etiquetas (hasta 5, elige las que ofrezca la consola) | Puzles, Estrategia, Un jugador, Roguelike/Mazmorras (si existe), Lógica |
| Precio | Gratis con compras integradas `[COMPRA]` (producto `grimbur_full_game`, precio objetivo 3,99 USD, ajustado por país con la tabla de Play) |
| Anuncios | **No contiene anuncios** |
| Idiomas de la ficha | Inglés (predeterminado) y español (Latinoamérica); duplicar a español (España) si quieres |
| Correo de contacto | `TODO(owner)` |
| Sitio web | `TODO(owner)` (opcional; puede ser la página de GitHub Pages de la política) |
| Política de privacidad | `TODO(owner)` URL, ver `HOSTING_PRIVACY_POLICY.md` |
| Países de distribución inicial | Ver `LAUNCH_PLAN.md` (Ecuador, México, Colombia, Perú, Chile; luego resto) |

## Público objetivo y clasificación

**Público objetivo (Play Console > Contenido de la app):** grupos de edad **13-15, 16-17 y 18+**. NO marcar "5 años o menos", "6-8" ni "9-12": al incluir niños la app pasaría al programa Familias, con SDK y requisitos de anuncios distintos; la política está redactada para 13+.
¿Atrae por error a niños? No: arte oscuro de cueva, sin personajes infantiles. Responder "no" a atractivo principal para menores.

**Cuestionario IARC (respuestas honestas, resultado esperado: PEGI 7 / ESRB E10+; el resultado definitivo lo emite el cuestionario):**

| Pregunta | Respuesta |
| --- | --- |
| Categoría | Juego |
| Violencia | Sí, fantasía suave: se disparan flechas a guardianes de piedra y a un monstruo; sin sangre ni humanos |
| Sangre / gore | No |
| Contenido sexual / desnudez | No |
| Lenguaje soez | No (el nombre del ranking pasa por un filtro de palabras ofensivas) |
| Sustancias (alcohol, drogas, tabaco) | No |
| Juego de azar simulado o real | No. Las reliquias que ofrecen tras cada piso se eligen entre tres, no se compran ni se sortean con dinero |
| Interacción entre usuarios | El nombre introducido para el ranking es visible por otros jugadores (contenido de usuario); no hay chat ni mensajes |
| Comparte la ubicación | No |
| Compras digitales | Sí, un producto de pago único `[COMPRA]`. Sin cajas de botín |
| Contenido que da miedo | Ambiente oscuro de cueva y sonidos de terror suave (latidos, goteo, gruñidos); sin imágenes truculentas |

## Capturas de pantalla: guion

Formato: **horizontal 16:9, 1920x1080 PNG/JPEG de 24 bits sin transparencia** (Play: lado mínimo 320 px, máximo 3840 px, relación máxima 2:1; 2-8 capturas de teléfono). Capturarlas en un teléfono real con el idioma del store (ES y EN), sin barra de estado (el juego ya la oculta) y sin cuenta de prueba visible.
Si el dispositivo es más estrecho (20:9), recortar a 16:9 sin deformar. Sube también 4 capturas en tableta de 7"/10" (misma resolución) porque `supportsTablet: true`.
Texto superpuesto: una línea, fuente gruesa, borde oscuro, fuera del 8 % del margen de seguridad; no tapar la interfaz. No pongas el precio en las capturas.

| # | Escena a capturar (pantalla) | Texto superpuesto EN | Texto superpuesto ES |
| --- | --- | --- | --- |
| 1 | Tablero en el piso 4-5 con 6-8 casillas exploradas, pistas de guardián y vórtice visibles, un par de gemas, héroe Sera con flecha apuntando (GameScreen) | Read the clues. Beat the cave. | Lee las pistas. Vence la cueva. |
| 2 | Momento de deducción: marca de peligro (bandera) en una casilla sospechosa junto a dos pistas iguales (GameScreen, tras pulsación larga) | Every floor solvable by deduction | Cada piso se resuelve deduciendo |
| 3 | Elección de reliquia: 3 cartas con una maldita (marco rojo) (overlay tras limpiar el piso 3) | Draft a relic after every floor | Elige una reliquia en cada piso |
| 4 | Selección de héroe con el héroe grande, sus trajes y el modo en Expedición (CharactersScreen) | Six heroes, six ways to play | Seis héroes, seis estilos |
| 5 | Piso 10, lucha contra el Grimbur con sus corazones visibles en el HUD y la aguja de wind-up (GameScreen) | Slay the Grimbur | Vence al Grimbur |
| 6 | La Forja con mejoras compradas y brasas (ForgeScreen, preset con progreso) | Forge permanent upgrades | Forja mejoras permanentes |
| 7 | Portada con el reto diario y la racha (CoverScreen, racha de 5+) | A new cave every day | Una cueva nueva cada día |
| 8 | Pantalla de victoria con lluvia de gemas y resultado (GameScreen tras vencer al Grimbur) | Share your victory | Comparte tu victoria |

Opcionales, en este orden de prioridad si hay espacio: pantalla de progreso (ProgressScreen) con calendario y gráfico, logros (AchievementsScreen), tienda entre pisos.
Para la ficha de iOS, reutilizar las escenas con las medidas de `ASSETS_CHECKLIST.md` (iPhone e iPad apaisados).

## Gráfico de funciones (Play): briefing

- **Tamaño**: 1024x500 px, PNG o JPEG de 24 bits, sin transparencia, máx. 15 MB.
- **Contenido**: imagen principal del emblema del juego (`assets/emblem.png` recortado, cabeza del Grimbur en tonos violeta oscuro) a la izquierda o centro; título del juego en tipografía gruesa (Fredoka, la del juego); lema de una línea ("Descend. Deduce. Slay the Grimbur." / "Desciende. Deduce. Vence al Grimbur."); fondo de cueva oscura con 3-4 gemas brillantes y una niebla.
- **Paleta**: `#0E0B1F` (fondo), `#140F2A`, `#1E173F` (acentos), gemas cian/dorado.
- **Reglas**: texto en el centro-izquierda (Google recorta bordes y superpone un botón de vídeo si hay vídeo en el centro); sin capturas del juego en miniatura, sin precio, sin texto "gratis" ni "descarga"; sin elementos parecidos a la mascota de Discord (cuerpo redondo azul con orejas) para evitar confusión de marca.
- **Dos variantes**: EN y ES (un solo gráfico por idioma de ficha).

## Plantilla de "Novedades" para próximas versiones

```text
EN: <1-3 líneas con lo más relevante. Ejemplo: "Balance pass on floors 6-9, new omen, fixed a crash when resuming from the background.">
ES: <igual en español>
```

## Respuestas a las reseñas (plantillas)

- Positiva: "¡Gracias por jugar! Si tienes ideas para nuevos héroes o reliquias, escríbenos a <correo>."
- Fallo/bloqueo: "Lamentamos el problema. ¿Nos dices tu modelo de teléfono y versión de Android? Lo corregimos en la siguiente versión."
- Sobre la compra: "El tutorial, los pisos 1-3 y el reto diario siempre serán gratis. La compra única desbloquea el resto de la expedición y el descenso sin fin."
