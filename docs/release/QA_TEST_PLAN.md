# Plan de pruebas en dispositivos reales

Para ejecutar con un APK/AAB de **producción** o `preview` (no con Expo Go ni con el cliente de desarrollo: audio, rendimiento y permisos se comportan distinto).
Cada casilla es pasa/falla. Si falla, anota modelo, versión de Android, pasos y captura en la tabla final (sección 15).
Orden recomendado: sección 2 (humo) en todos los dispositivos; el resto, completo en el dispositivo principal y por muestreo en los demás.

Build para probar: `eas build -p android --profile preview` (APK instalable). Para la compra y el aspecto final de Play, usa la pista interna con el AAB de producción.

## 1. Matriz de dispositivos

Mínimo viable (3 dispositivos); ideal 5. Marca cuál usarás y su resultado global.

| ID | Tipo | Ejemplo / criterio | Por qué | Android | Resultado |
| --- | --- | --- | --- | --- | --- |
| D1 | **Teléfono pequeño 5,5"**, 16:9, 720p o 1080p | Moto G, Galaxy J/A antiguo, cualquier gama baja de ~2 GB RAM | Espacio horizontal mínimo, rendimiento bajo, botones de navegación clásicos | 7-9 (mín. soportado: **API 24 = Android 7**) | [ ] |
| D2 | **Teléfono con notch/isla/agujero**, 20:9 | Pixel, Galaxy S/A, Xiaomi reciente | Recortes en horizontal, bordes redondeados, navegación por gestos | 13-16 | [ ] |
| D3 | **Tableta 8-11"** | Galaxy Tab A/S, Lenovo Tab | Escalado, tamaños de controles y tablero, `supportsTablet` | 12-14 | [ ] |
| D4 (opcional) | Teléfono gama media | ~4 GB RAM | Rendimiento y térmico típicos de LatAm | 11-12 | [ ] |
| D5 (opcional) | Plegable o ventana dividida | Galaxy Fold/Flip | Cambios de tamaño de ventana; la app fija el horizontal | 14+ | [ ] |

Versiones de Android que deben quedar cubiertas entre todos: **7 o 8**, **9-11**, **12-13**, **14**, **15-16** (API 36: borde a borde obligatorio; `predictiveBackGestureEnabled` está en `false`).
Idiomas del sistema: probar el juego con el teléfono en español y con el teléfono en inglés (el idioma "Automático" debe seguirlo) y con un tercer idioma (debe caer en inglés).

## 2. Humo rápido (15 minutos, en cada versión y cada dispositivo)

- [ ] La instalación termina y la app abre sin pantalla en blanco; el splash dura menos de ~5 s en D1 (audio capado a 2,5 s).
- [ ] Portada (CoverScreen): se ven Jugar, Reto diario, Forja, Ranking, Logros, Cómo jugar, Ajustes; ningún texto cortado ni solapado.
- [ ] La app está **siempre horizontal**, también con la rotación automática del sistema activada y girando el teléfono en cualquier sentido.
- [ ] Jugar > elegir héroe > se abre el tutorial (primer arranque) o la partida.
- [ ] Completar el piso 1: gema, pistas, disparo, pasar a la siguiente pantalla (LevelCompleteScreen).
- [ ] Pausar con el botón de la partida y con el botón Atrás del sistema; Reanudar funciona; Menú sale a la portada.
- [ ] Morir una vez: aparece la pantalla de derrota con pista, brasas ganadas, Reintentar y Menú.
- [ ] Ranking (HighScoresScreen) carga o muestra el mensaje de error de conexión, sin colgarse.
- [ ] Sonido y vibración funcionan y se pueden apagar en Ajustes.
- [ ] Cerrar y reabrir: el progreso (mejor puntuación, brasas) persiste.

## 3. Primer arranque y tutorial

Hacer con la app recién instalada (sin datos). Alternativa: Ajustes > Borrar mis datos y reiniciar la app (nota: el tutorial se controla con `tutorialSeen` en los ajustes; "Borrar mis datos" puede no reiniciarlo: para probar el primer arranque real, desinstala y reinstala o borra el almacenamiento desde los ajustes de Android).

- [ ] La portada muestra el mensaje "Tu primera expedición empieza con un breve tutorial" (cover.firstRun) y no hay ranking ni logros con datos falsos.
- [ ] Jugar > héroe > **TutorialScreen** arranca solo en Expedición (no en Reto diario ni Sin fin).
- [ ] Paso a paso, el texto coincide con la acción pedida: caminar a la gema, pista del guardián, disparar, última gema, final con consejo de marcar con pulsación larga.
- [ ] Caminar sobre el guardián en el tutorial reinicia el paso con el mensaje "Vuelve a intentarlo", sin bloquearse.
- [ ] "Saltar tutorial" funciona y no vuelve a salir al volver a jugar.
- [ ] Completar el tutorial lleva a una partida normal con el mismo héroe.
- [ ] Manual (InstructionsScreen): "Repetir el tutorial" abre el tutorial y al terminar vuelve al manual.
- [ ] Las 4 **lecciones** opcionales (deducir, reliquias, tienda, herramientas) abren desde el manual (LessonScreen), se pueden completar y se puede salir con "Dejar la lección".
- [ ] Primeros consejos contextuales (habilidad, deshacer, detector, bomba) aparecen **una sola vez** cada uno.
- [ ] El tutorial, en D1 (pantalla pequeña), se lee sin desplazarse, y el botón de ataque es alcanzable con el pulgar.

## 4. Modos y partida

**Expedición**

- [ ] Elegir cada héroe bloqueado/desbloqueado (Vael libre; Sera al llegar al piso 4; Borin al piso 7; Auric al ganar; Mira tras jugar 5 retos diarios; Bram tras ganar 500 brasas en total): los bloqueados muestran el requisito y no se pueden elegir.
- [ ] Mover con la cruceta; con "Deslizar para moverse" activado; tocar una casilla explorada para caminar hasta ella (se detiene si algo cambia); pulsación larga marca un peligro y la casilla marcada no se pisa.
- [ ] Disparar: botón de ataque, mantener y arrastrar para apuntar sin mover (el tablero muestra la trayectoria).
- [ ] Habilidad del héroe: botón dorado sobre la cruceta, enfriamiento y recarga visibles.
- [ ] Deshacer (una vez por piso), detector y bomba (comprados en la tienda) funcionan y se agotan.
- [ ] Reliquias: tras cada piso aparece la elección de 3 (o 2 en profundidad 5); una maldita lleva marco rojo y solo se puede llevar una.
- [ ] Tienda entre pisos, altar y elección de puerta aparecen y se pueden saltar.
- [ ] Pisos 4-6 (cristal) y 7-9 (magma) muestran su banner; el piso 10 es la guarida del Grimbur con corazones en el HUD y sin gemas.
- [ ] Morir por guardián, acechador, durmiente, vórtice (teletransporta, no mata) y Grimbur: el mensaje de derrota y el consejo corresponden a la causa.
- [ ] Vencer al Grimbur: pantalla de victoria con lluvia de gemas, desbloqueos, brasas y botón compartir.

**Reto diario**

- [ ] Mismo mapa en dos dispositivos distintos el mismo día (UTC).
- [ ] Racha y bono diario de brasas (una vez al día UTC); el reto diario no entra en el ranking global; la Forja no se aplica.
- [ ] A medianoche UTC (19:00 en Ecuador) el reto cambia al reabrir la app. Probar adelantando la hora del sistema un día.
- [ ] Cambiar la hora/zona horaria del sistema no duplica el bono (comprobar que no se pagan dos bonos el mismo día).

**Sin fin y profundidades**

- [ ] Sin fin está bloqueado hasta ganar una expedición y muestra la razón.
- [ ] Tras una victoria se desbloquea la profundidad siguiente; el selector (flechas) respeta lo desbloqueado.

## 5. Pantallas, tamaño de fuente y recortes

Repetir cada punto en D1, D2 y D3. Pantallas: Cover, Characters, Tutorial, Lesson, Game (con overlays), LevelComplete, HighScores, Progress, Instructions, Settings, Achievements, Forge.

- [ ] **Escala de fuente** del sistema al 85 %, 100 %, 130 % y el máximo ("Tamaño de fuente" en Ajustes de Android): ningún botón queda ilegible, tapado ni fuera de pantalla; las listas se pueden desplazar hasta el final.
- [ ] **Tamaño de pantalla/zoom** del sistema en "Grande": sigue sin desbordes.
- [ ] Notch/isla en D2: ningún control crítico (cruceta, ataque, pausa, HUD) queda bajo el recorte ni bajo la barra de gestos; `SafeAreaProvider` respeta los bordes izquierdo y derecho.
- [ ] Barra de navegación de 3 botones en D1: no tapa la cruceta ni el botón de ataque.
- [ ] Tablet D3: el tablero y los controles escalan; no hay estiramientos ni bandas inútiles enormes; los textos no quedan diminutos.
- [ ] Ajustes > posición de controles (izquierda/derecha), tamaño (pequeño/mediano/grande), botón de ataque (lado opuesto/en la cruceta): cada combinación cabe en D1 y no solapa el tablero.
- [ ] Forja: las tres pestañas/filtros (Poder, Economía, Reliquias) se ven completas y se puede comprar con el pulgar; el contador de brasas es legible.
- [ ] Ranking: las 7 columnas (rango, héroe, nombre, piso, puntuación, gemas, tiempo) caben en D1 con nombres de 20 caracteres.
- [ ] Logros: 104 logros con filtros (Todos/Pendientes/Hechos) desplazan con fluidez.
- [ ] Progreso: el calendario de 14 días y el gráfico se ven bien con 0 partidas, con 3 y con 30.

## 6. Interrupciones

En medio de una partida (piso con al menos 3 casillas exploradas), por cada caso verificar que no se pierde el estado, no se acumula tiempo de partida en segundo plano y la música/sonidos se reanudan solos.

- [ ] **Llamada entrante**: rechazar y contestar; al volver, la partida está en pausa y se reanuda.
- [ ] **Home** y volver desde recientes tras 10 s, 2 min y 15 min (el sistema puede matar el proceso: al volver no debe quedar pantalla negra ni crash; si se reinicia, debe volver a la portada con el progreso guardado).
- [ ] **Notificación/ventana flotante** y barra de estado desplegada.
- [ ] **Apagar y encender la pantalla** (bloqueo).
- [ ] **Rotar 180 grados** (de horizontal a horizontal invertido): sin reinicio de partida.
- [ ] **Modo no molestar / silencio / volumen a cero**: no crashea; con "Sonido" activado y volumen del sistema cero no hay error.
- [ ] **Conectar auriculares Bluetooth** o cable en medio de la partida: el audio sigue.
- [ ] **Otra app que reproduce música**: el juego no debe romper la reproducción ajena de forma molesta ni quedarse mudo al volver.
- [ ] **Botón Atrás** del sistema durante una partida: pausa (no sale ni pierde la partida). Atrás en la portada sale de la app.
- [ ] **Gesto de borde** (deslizar desde el borde) durante la partida: no abandona la partida.
- [ ] **Compartir** resultado: abrir y cancelar el menú de compartir no rompe la pantalla de resultados.
- [ ] **Multitarea / ventana flotante** (si el dispositivo la ofrece): la app se mantiene horizontal y usable.

## 7. Sin conexión y ranking

- [ ] **Modo avión desde el principio**: la app abre, se puede jugar Expedición, Diario y Forja completos. Ranking muestra "No se pudo cargar el ranking. Revisa tu conexión." con Reintentar; nunca se invita a guardar una puntuación (offline).
- [ ] Conexión que se cae durante el guardado de una puntuación: aparece el error, se puede reintentar y **no** se duplica la fila.
- [ ] Conexión muy lenta (limitar con el modo de red del emulador o un punto de acceso lento): el ranking falla a los ~8 s sin colgar la pantalla.
- [ ] Top 10: con una puntuación que entra, aparece "Top 10", nombre admitido (1-20 caracteres), nombre con palabra ofensiva rechazado, nombre vacío rechazado.
- [ ] Datos móviles sin saldo / Wi-Fi sin internet: igual que modo avión.
- [ ] Reglas de Firestore **desplegadas** (checklist B2): intentar guardar una puntuación imposible (herramienta externa) debe ser rechazada.
- [ ] Se recupera la conexión: el ranking carga al reintentar sin reiniciar la app.

## 8. Persistencia, reinstalar y borrado de datos

- [ ] Forzar cierre desde Ajustes de Android, reabrir: se conservan brasas, mejoras de la Forja, logros, racha, héroes, idioma y ajustes.
- [ ] Cierre brusco **durante** una partida: al reabrir no hay crash; el progreso anterior sigue; no se paga dos veces un bono.
- [ ] **Ajustes > Borrar mis datos**: pide confirmación ("Toca de nuevo para confirmar"), borra progreso, brasas y logros; mensaje "Tus datos se borraron"; el ranking global conserva la entrada (es lo esperado y lo dice la política).
- [ ] **Desinstalar y reinstalar**: probar con la copia de seguridad automática de Android activa y desactivada. Con ella activa, el progreso puede volver tras reinstalar (esperado, descrito en la política); con ella desactivada, empieza de cero con tutorial.
- [ ] **Actualizar sobre una versión anterior** (instala v1.0 y luego v1.1 encima): el progreso se conserva y no hay crash por formato antiguo de datos (`wumpus.stats.v1`).
- [ ] **Almacenamiento casi lleno**: la app abre y avisa o falla sin crash; las compras de la Forja informan "No se pudo guardar la compra" si no se puede escribir.
- [ ] Datos corruptos (solo con ayuda): borrar a mano el valor de la clave devuelve a valores por defecto, sin crash.

## 9. Batería, rendimiento y térmico

- [ ] **Batería baja (< 15 %) y modo ahorro de energía**: la partida es fluida o al menos jugable; animaciones y partículas no provocan tirones graves; el audio no falla.
- [ ] Partida de 15-20 min seguidos en D1: sin calentamiento extremo, sin cierre por falta de memoria, sin ANR.
- [ ] FPS subjetivo en D1: movimiento y toque responden en < 100 ms; disparar no se retrasa.
- [ ] Consumo: perfilar con Ajustes > Batería durante 20 min; no debe aparecer como consumidor extremo (> 15 %/hora en gama baja es sospechoso).
- [ ] Tiempo de arranque en frío en D1: < 6 s hasta la portada (anotar el valor).
- [ ] Memoria: dos horas de uso alternando pantallas (Forja, Logros, Progreso, partidas) sin que la app se cierre sola.

## 10. Audio y vibración

- [ ] Música de portada, de selección, de partida; efectos de pasos, disparo, gemas, victoria y derrota; sonidos de proximidad (guardián/vórtice cerca) se cortan al alejarse.
- [ ] Ajustes > Sonido apagado: silencio total; encendido: vuelve sin reiniciar.
- [ ] Ajustes > Vibración apagada: sin vibración; encendida: vibra en golpes y muertes.
- [ ] "Reducir destellos": los destellos de muerte, muertes y teletransporte se suavizan.
- [ ] La partida pausa el audio al ir a segundo plano y lo reanuda al volver.
- [ ] Ajustes > Compartir registro de audio abre el menú de compartir con texto (no vacío si hubo problemas).

## 11. Compra y muro de pago (solo cuando esté activo: `GAME_CONFIG.monetization.enabled`)

Usar una cuenta de **tester de licencia** de Play Console (no se cobra) con la pista interna.

- [ ] Sin compra: pisos 1-3 y reto diario libres; al limpiar el piso 3 aparece el muro antes del piso 4; Sin fin muestra bloqueo y precio.
- [ ] El precio mostrado viene de la tienda (en moneda local); sin conexión muestra el precio de reserva sin romper nada.
- [ ] Comprar: el juego se desbloquea al instante (pisos 4-10, Grimbur, Sin fin) y no vuelve a aparecer el muro.
- [ ] Cancelar la compra: vuelve al juego sin bloqueo, sin crash.
- [ ] **Restaurar compras**: tras reinstalar o en otro dispositivo con la misma cuenta, el botón devuelve el desbloqueo.
- [ ] Compra pendiente/sin conexión: mensaje claro, sin desbloquear en falso.
- [ ] Reembolso (probar desde la consola con la cuenta de prueba): el desbloqueo se retira en el siguiente arranque.
- [ ] Enlaces a Términos y Privacidad del muro abren las URL reales (no `example.com`).
- [ ] El copy del muro dice exactamente qué es gratis y qué no, coincide con la ficha de la tienda.

## 12. Copia de seguridad (portapapeles) y petición de reseña (cuando estén en la versión)

- [ ] Exportar: se copia un código al portapapeles; pegarlo en un bloc de notas lo muestra completo y sin saltos de línea raros.
- [ ] Restaurar en un dispositivo limpio con ese código: recupera mejor puntuación, brasas, mejoras, logros y racha.
- [ ] Un código alterado o incompleto muestra un error claro y no estropea el progreso actual.
- [ ] Restaurar sobre un progreso existente: avisa antes de sobrescribir (o muestra qué cambia).
- [ ] Android 13+: no aparece aviso de "la app leyó el portapapeles" salvo cuando el usuario pulsa Restaurar.
- [ ] Reseña: la ventana aparece tras un momento bueno (victoria/récord), solo en la portada, nunca en la primera partida ni con menos de 3 partidas jugadas, con al menos 60 días entre peticiones, y cerrar la ventana no bloquea nada.

## 12b. Amigos: duelos, retos, apuestas y nube (necesita 2 dispositivos con internet)

- [ ] Reto con código: crear en el dispositivo A, escribir el código a mano en B (probar con minúsculas y guion). Jugar en ambos; la cueva es idéntica piso a piso. El resultado de cada uno aparece en la clasificación del código y en "Tus retos" con su mejor puntaje.
- [ ] Duelo 1v1 sin apuesta: sala, "Estoy listo" en ambos, cuenta atrás casi simultánea, panel del rival se actualiza en partida (color verde/rojo según quién va delante), vibración cuando el rival baja de piso.
- [ ] Derrota anticipada: morir en el piso 2 mientras el rival ya va por el 4 → la tarjeta dice "Pierdes el duelo" de inmediato, sin esperar a que el rival termine.
- [ ] Duelo con apuesta (10 o 25): las brasas se cobran al arrancar en ambos; el ganador recibe el bote menos el 10 % (comprobar saldos antes/después); el perdedor no recibe nada; el historial en Amigos muestra el neto correcto.
- [ ] Empate forzado (ambos mueren en el mismo piso con los mismos puntos es difícil; al menos verificar que un empate 1v1 devuelve la apuesta).
- [ ] Revancha: al terminar, ambos pulsan "Revancha" → caen en la MISMA sala nueva, con la misma apuesta, sin pasarse código.
- [ ] Abandono: un jugador cierra la app a mitad del duelo → a los ~30 s el otro lo ve "Desconectado"; a los ~2 min el duelo se da por decidido.
- [ ] Unirse tarde: con el duelo ya empezado, un tercero con el código no puede pulsar "Estoy listo" (mensaje "Este duelo ya empezó").
- [ ] Apuesta sin saldo: con menos brasas que la apuesta de la sala, "Estoy listo" está bloqueado con el aviso correspondiente.
- [ ] Copia en la nube: activarla en A (anotar la clave), jugar una partida, restaurar con la clave en B → brasas, Forja, héroes y logros coinciden. Desactivarla borra la copia (restaurar después falla con "No hay ninguna copia").
- [ ] Clasificaciones diaria y semanal: jugar el reto diario en ambos dispositivos con nombres distintos; ambos aparecen en "Hoy" y "Esta semana", cada uno con su fila marcada "Tú".
- [ ] Sin internet: abrir Amigos, un reto y un duelo en avión → mensajes de error razonables, sin cuelgues, y el resto del juego sigue funcionando.

## 13. Idioma

- [ ] Idioma "Automático" en teléfono ES y EN; cambiar a "English"/"Español" en Ajustes actualiza todas las pantallas sin reiniciar.
- [ ] Textos largos en ES (botones, banners, consejos, logros) no se cortan en D1.
- [ ] Plurales y variables correctos ("1 gema" / "2 gemas", "Piso 3", fechas).
- [ ] Texto compartido (reto diario / partida) sale en el idioma activo.

## 14. Accesibilidad

- [ ] TalkBack: se pueden recorrer y activar los botones principales (etiquetas `a11y`: cruceta, ataque, pausa, volver, racha, insignias de la Forja y logros).
- [ ] Contraste y color: los iconos de guardián y vórtice se distinguen sin depender solo del color (probar con simulador de daltonismo).
- [ ] Tamaños de controles grandes en D1 y D3.

## 15. Registro de resultados

| Fecha | Versión (build) | Dispositivo | Android | Sección | Caso | Resultado | Nota / captura |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

**Criterio de salida para producción:** 0 fallos bloqueantes (crash, pérdida de progreso, pantalla inutilizable, compra que cobra sin desbloquear o desbloquea sin cobrar); todos los casos de las secciones 2, 3, 7 y 8 en verde en D1, D2 y D3; secciones 11 y 12 en verde si esas funciones están en la versión.
