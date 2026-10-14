# Plan de lanzamiento suave (soft launch)

Objetivo: comprobar con jugadores reales, gastando casi nada, si el juego retiene lo suficiente como para invertir en difundirlo y cobrarlo.
Puertas heredadas de `docs/GAME_DESIGN.md`: **D1 >= 30 %** y **D7 >= 6 %**. Referencias de `docs/market-research-notes/retention_engagement.md`
(GameAnalytics 2026, todos los géneros): mediana D1 ~22 %, D7 ~4 %; cuartil superior D1 ~30 %, D7 6-7 %, D30 1,6-1,8 %. Es decir, las puertas
equivalen a "cuartil superior"; un indie sin compra de usuarios puede conseguirlo porque no hay dilución de tráfico pagado (inferencia, no dato).

Supuestos: Android primero (iOS depende de confirmar Ecuador en Apple, ver checklist A7), un solo desarrollador, presupuesto de marketing 0 a 50 USD.

## 1. Analítica: lo que el juego emite HOY

Fuente: `src/services/analytics.ts` (`AnalyticsEvents`) y las llamadas `analytics.track(...)`. El proveedor activo es `consoleProvider`
(solo escribe en consola en desarrollo): **nada sale del dispositivo hasta que se implemente un `AnalyticsProvider` y se llame a `setAnalyticsProvider`**.
Los errores JS no capturados también pasan por `analytics.recordError` (`installGlobalErrorHandler` en `App.tsx`).

| Evento | Parámetros | Cuándo se dispara (archivo) |
| --- | --- | --- |
| `game_start` | `mode` (`expedition`/`daily`/`endless`), `character` (0-3) | Al montar la pantalla de juego, una vez por partida o reinicio (`GameScreen.tsx`) |
| `level_complete` | `level`, `score`, `time` (s de la sesión) | Al limpiar un piso (`GameScreen.tsx`) |
| `game_over` | `level`, `score`, `time`, `cause` | Derrota. La causa es la de `deathCause` o `unknown` (`GameScreen.tsx`) |
| `expedition_won` | `score`, `time`, `character`, `mode` | Victoria (en lugar de `game_over`); también en el reto diario si se vence al Wumpus |
| `relic_picked` | `relic` (id), `floor` | Al elegir una reliquia |
| `high_score_submitted` | `level`, `score` | Tras guardar con éxito una puntuación en el ranking global |
| `daily_shared` / `run_shared` | `score` | Al abrir la hoja de compartir del reto diario / de una partida (se registra aunque el usuario cancele) |
| `trap_triggered` | `level` | Al pisar una trampa (`useGameEngine.ts`) |
| `powerup_collected` | `kind` (`shield`/`ammo`) | Al recoger escudo o flechas |
| `paywall_view` | `source` (`cover`, `floor`, `demo`, `endless`) | Al abrir la pantalla de compra (`PaywallScreen.tsx`; solo si `monetization.enabled`) |
| `paywall_purchase_started` / `paywall_purchase_succeeded` | `source` | Inicio y éxito de la compra |
| `paywall_purchase_failed` | `source`, `reason` | Compra fallida o cancelada (`reason` = estado devuelto por la tienda) |
| `paywall_restore` | `source`, `result` | Pulsar "Restaurar compras" |
| `paywall_dismiss` | `source` | Cerrar el muro sin comprar |
| `screen_view` | `screen` | **Solo** `tutorial` (inicio del tutorial) y `lesson_<deduce\|relics\|shop\|tools>` (inicio de cada lección). No hay `screen_view` de portada, Forja, ranking, ajustes, etc. |

Lo que NO existe todavía (no lo cites en nada hasta que se añada): `app_open`, `tutorial_complete`/`tutorial_skip` (el tutorial marca `tutorialSeen` igual al completar
y al saltar), `lesson_complete`, compras de la Forja, `daily_start`, instalación/primer arranque.

### Eventos a añadir (tarea para DEV, ver Checklist C1; el embudo de compra ya está cubierto por los 6 eventos `paywall_*`)

| Evento nuevo | Parámetros | Para qué |
| --- | --- | --- |
| `app_open` | `first_open` (bool), `days_since_install` | Retención D1/D7 propia, independiente de Play |
| `tutorial_complete` / `tutorial_skip` | `step` alcanzado, `replay` (bool) | Embudo de onboarding |
| `lesson_complete` | `lesson` | Uso de lecciones opcionales |
| `forge_purchase` | `upgrade`, `level`, `embers_left` | Economía de brasas |
| `review_prompt_shown` | `trigger` (`victory`/`streak`) | Frecuencia de la petición de reseña (se pide en la portada tras una victoria o racha de 3+, con al menos 3 partidas y 60 días entre peticiones) |
| `backup_exported` / `backup_restored` | resultado | Uso del código de copia de seguridad |
| `daily_start` | `streak` | Seguir el hábito diario |

Cuando se conecte un SDK (Firebase Analytics/Crashlytics), actualizar `PRIVACY_POLICY.md` sección 2 y `DATA_SAFETY.md` (datos de diagnóstico e identificadores).

### Sin SDK aún: Play Console ya da retención

Play Console > Estadísticas > "Retención" (instaladores retenidos D1/D7/D30 por cohorte de instalación) funciona sin tu código, pero solo con volumen mínimo
de instalaciones y con un retraso de ~1-2 días. Úsalo como medida oficial de las puertas y la analítica propia para explicar el "por qué".

## 2. Embudo a construir

```
Instalación (Play Console) ──► screen_view{tutorial} ──► tutorial_complete ──► game_start{expedition} ──► level_complete (piso 1)
   ──► level_complete (piso 3) ──► [paywall_view] ──► [paywall_purchase_succeeded]
                               └─► app_open (día 1)  ──► app_open (día 7)
```

| Paso | Fuente hoy | Meta de la prueba |
| --- | --- | --- |
| Instalación → inicia tutorial | `screen_view{tutorial}` (con SDK) | > 90 % de los nuevos |
| Inicia tutorial → tutorial_complete | **falta evento** | > 75 % (el tutorial es de 1 piso) |
| Tutorial → primera partida real | `game_start{expedition}` | > 85 % |
| Primera partida → piso 1 limpio | `level_complete{level:1}` | > 70 % |
| Piso 3 limpio (borde del muro de pago) | `level_complete{level:3}` | > 35 % de los que empezaron |
| Primera sesión ≥ 5 min | (suma de `time`) | > 50 % (5 min = cuartil superior en benchmarks de sesión) |
| Vuelve el día 1 | `app_open`/Play | **>= 30 %** (puerta) |
| Vuelve el día 7 | `app_open`/Play | **>= 6 %** (puerta) |
| Completa algún reto diario | `game_start{mode:daily}` | > 25 % de quienes vuelven |
| Comparte resultado | `daily_shared` + `run_shared` | > 3 % de los que terminan una partida |

## 3. Qué medir y qué decisión dispara

Tamaño mínimo para decidir: **>= 200 instalaciones por cohorte semanal**. Con menos, 6 % de D7 son 12 personas y el ruido manda; en ese caso amplía la ventana en vez de decidir.

| Métrica | Verde | Amarillo | Rojo | Decisión |
| --- | --- | --- | --- | --- |
| D1 | >= 30 % | 20-29 % | < 20 % | Rojo: **iterar** primeros 3 minutos (tutorial, claridad de pistas) antes de nada. Verde con D7 verde: **escalar** |
| D7 | >= 6 % | 3-5 % | < 3 % | Rojo con D1 verde: el hábito no se forma → reforzar reto diario/racha/Forja, no marketing |
| D30 | >= 1,6 % | 0,8-1,5 % | < 0,8 % | Informativo (no es puerta); alimenta la conversación sobre contenido nuevo |
| Tutorial completado | >= 75 % | 55-74 % | < 55 % | Rojo: acortar o hacer saltable antes; mirar en qué paso se abandona |
| Primera partida llega al piso 3 | >= 35 % | 20-34 % | < 20 % | Rojo: la dificultad inicial es demasiado alta o poco clara; revisar `scripts/simulate.ts` y las pistas |
| Conversión al desbloqueo (de quienes ven el muro) | >= 3 % | 1-2,9 % | < 1 % | Rojo: precio (3,99 USD) o punto de corte (piso 4); probar piso 5 libre o 2,99 USD |
| Reembolsos / reseñas de 1 estrella por "pago" | < 3 % | 3-8 % | > 8 % | Revisar honestidad del muro; el copy dice claramente qué es gratis |
| Crashes (usuarios sin fallos) | >= 99,5 % | 98,5-99,4 % | < 98,5 % | Rojo: **parar el despliegue**, parche antes de seguir |
| ANR / crash en Play Console | por debajo del umbral "malo" de Play | cerca | por encima | Idem: afecta a la visibilidad en la tienda |
| Valoración media | >= 4,3 | 4,0-4,2 | < 4,0 | Leer reseñas cada semana, responder todas |

Reglas de decisión al final de la semana 4 (con cohortes suficientes):

- **Escalar**: D1 >= 30 % y D7 >= 6 % → ampliar países (incluyendo EN), subir esfuerzo en vídeos cortos, pedir pitch a creadores, plantear iOS, abrir contenido nuevo.
- **Iterar**: D1 entre 20 y 30 % o D7 entre 3 y 6 % → una ronda de cambios de 2 semanas centrada en la métrica más débil, nueva cohorte, repetir la puerta. Máximo dos rondas.
- **Detener (kill)**: D1 < 20 % o D7 < 3 % tras dos rondas de iteración con >= 300 instalaciones por cohorte → pausa inversión en marketing, mantener el juego en tienda (coste ~0), y aplicar lo aprendido a otro título.

## 4. Calendario de 4 semanas

La semana 0 es la prueba cerrada del checklist (Fase F); la ficha aún no es pública. El soft launch arranca cuando Google concede producción.

| Semana | Foco | Qué se hace | Salida |
| --- | --- | --- | --- |
| **0** (prueba cerrada, 14 días) | Estabilidad | 12+ testers, 2-3 preguntas de feedback (¿entendiste las pistas?, ¿en qué momento te aburriste?, ¿pagarías 3,99 USD por el resto?). Analítica real conectada. Capturas y vídeo de 30 s grabados | Producción solicitada; sin crashes bloqueantes |
| **1** | Lanzamiento en 5 países hispanohablantes | Producción al 20-50 % solo en: Ecuador, México, Colombia, Perú, Chile (más España y Argentina si quieres). Ficha ES como principal. Publicar en tus redes y en 3-4 comunidades pequeñas de juegos (ver sección 6). Sin pagar anuncios | Primeras 200-500 instalaciones; revisar crashes a diario |
| **2** | Medir D1 y primeras correcciones | Con la primera cohorte completa: leer D1, tutorial, piso 3. Un parche con el mayor fallo del embudo. Responder reseñas. 2 vídeos cortos a la semana | Informe corto con las métricas de la sección 3 |
| **3** | Medir D7 y abrir a EN | Si D1 >= 25 %: añadir EE. UU., Canadá, Reino Unido, Australia, Filipinas con ficha EN. Primera cohorte con D7 listo. Publicar el primer "post-mortem" o diario de desarrollo | D7 de la cohorte 1; decisión provisional |
| **4** | Decisión | Cohortes de semanas 1-3 con tamaño suficiente. Aplicar la regla de decisión (escalar / iterar / detener). Si escalar: 100 % de despliegue global, plan de contenido de 8 semanas. Si iterar: lista de 3 cambios | Decisión escrita en `docs/release/` (añade `LAUNCH_RESULTS.md`) |

Cambios de precio o del punto de corte: uno solo por semana, apuntando la fecha para poder atribuir el efecto.

## 5. ASO (optimización de ficha)

Reglas de Play: el título pesa mucho, la descripción corta y la larga también (texto indexado), no hay campo de palabras clave como en Apple.
Evita repetir una palabra más de 3-4 veces en la descripción larga y no metas palabras irrelevantes (Google lo penaliza).

**Español (mercado principal del soft launch)**

| Tema | Términos |
| --- | --- |
| Núcleo | juego de deducción, roguelike, mazmorras, cueva, tesoro, gemas |
| Género | buscaminas roguelike, puzzle de lógica, juego de estrategia por turnos, juego de pistas |
| Marca / nostalgia | cazar al Wumpus, hunt the wumpus, Wumpus, juego retro de lógica |
| Uso | juego sin conexión, partidas rápidas, juego sin anuncios, un jugador, reto diario |
| Diferenciadores | héroes, reliquias, jefe final, descenso infinito, racha diaria |

**English (second wave)**

| Topic | Terms |
| --- | --- |
| Core | deduction game, roguelike, dungeon crawler, cave, treasure, gems |
| Genre | minesweeper roguelike, logic puzzle, turn-based strategy, puzzle roguelite |
| Brand / nostalgia | hunt the wumpus, wumpus, retro logic game |
| Use | offline game, quick sessions, no ads, single player, daily challenge |
| Differentiators | heroes, relics, final boss, endless descent, daily streak |

Ejemplos de combinaciones que ya aparecen en el copy de `STORE_LISTING.md`: "deducción", "roguelite", "buscaminas", "reto diario", "sin anuncios", "sin conexión" (nota: el juego
requiere conexión **solo** para el ranking global; el título puede decir "sin conexión" para jugar). Revisa cada mes el informe "Adquisición > Búsquedas de Play Store" en Play Console y reajusta.

**Pruebas A/B de ficha**: Play Console permite "Experimentos de ficha" gratuitos. Primer experimento (semana 3+, con tráfico): el icono y la primera captura (con y sin texto). Segundo: descripción corta.

## 6. Comunidad y vídeos cortos (barato y realista para una persona)

Principio: 3 horas por semana, constantes, sin presupuesto. El juego es muy "mostrable": la lectura de pistas, el momento de acertar la deducción y la derrota por un pelo se entienden en 10 segundos.

**Vídeos cortos (TikTok, Reels, YouTube Shorts) — 2 a la semana, 15-30 s, formato vertical 9:16 recortando el juego horizontal o grabado girando el móvil**

1. "¿Puedes deducir dónde está el vórtice?" (gancho: mostrar dos casillas con pistas, pausa, resolver y marcar con pulsación larga).
2. "Mi mejor reliquia de hoy" (elección 1 de 3, resultado en el siguiente piso).
3. "Casi lo logro": última gema, por poco, muerte.
4. Derrota por culpa del Wumpus y victoria final con la lluvia de gemas (la victoria tiene ese efecto).
5. Reto diario: "el mismo mapa para todos, ¿cuánto sacas?" con la puntuación del día y enlace en el perfil.
6. Detrás de cámaras: cómo se generaron el audio y los tableros "resolubles por deducción" (gusta en comunidades de desarrollo).
7. Formato semanal fijo "Pista del día": mismo plantilla de texto en pantalla.

Producción: grabación de pantalla del propio móvil (Android permite grabarla), voz en off o solo texto en pantalla, música propia del juego (`scripts/generateAudio.js`, original, sin problemas de licencia).
Subtítulos en ES primero, versión EN a partir de la semana 3. Los sonidos del juego son parte del atractivo (tambores, latidos, goteos): deja el audio original.

**Comunidades (publicar solo si añades valor, leer reglas antes; nada de spam)**

- Español: subreddits de videojuegos indie en español, servidores de Discord de desarrollo de videojuegos en español, grupos de Facebook de juegos móviles, Twitter/X con #gamedev y #indiegame.
- Inglés: r/playmygame, r/indiegames, r/roguelites, r/AndroidGaming (viernes/días de "self-promotion" según su regla), itch.io devlog, Indie Hackers. Presenta un detalle concreto (el reto diario, la deducción sin azar), no "mi juego".
- Pruebas cerradas: r/AndroidClosedTesting y comunidades de testers aceptan intercambio de pruebas; úsalo para las 12 personas.
- Creadores pequeños: 10-20 microcreadores de móvil/puzzles en ES (1-20 mil seguidores). Mensaje corto con enlace directo de Play y una clave de desbloqueo (códigos promocionales de Play Console: Play Console permite generar códigos promocionales de productos integrados, con un cupo por trimestre: confirma el límite vigente). No compres reseñas ni intercambios masivos.
- Cuota de 1 publicación en comunidad por semana + 1 respuesta útil a otras personas: la reputación pesa más que la frecuencia.

**Qué NO hacer**: anuncios de pago antes de pasar las puertas, comprar descargas o reseñas, empujar el juego en comunidades donde no se permite, prometer características que no existen.

## 7. Ritual semanal (30 minutos)

1. Lunes: leer retención D1/D7 (Play Console), tutorial y piso 3 (analítica), crashes.
2. Anotar la métrica más débil y UNA acción para esa semana.
3. Responder todas las reseñas nuevas (la tasa de respuesta ayuda a la valoración).
4. Publicar los 2 vídeos y 1 post en comunidad.
5. Guardar las cifras en una hoja o en `docs/release/LAUNCH_RESULTS.md`.
