# Guía de operación (para el dueño)

Cómo operar el juego ya publicado sin tocar código ni generar un APK nuevo. Todo se hace desde la
[consola de Firebase](https://console.firebase.google.com/project/nezu-games) (proyecto **nezu-games**,
cuenta `nezu.ec@nezuecuador.com`) o desde esta carpeta con la terminal.

## 1. Publicar un aviso en la portada (eventos, noticias)

El juego lee el documento `config/live` al abrirse y muestra su texto como un cartel en la portada,
que el jugador puede cerrar (y no vuelve a ver ese aviso).

1. Consola → Firestore Database → colección `config` → documento `live` (créalo si no existe, con id exacto `live`).
2. Campos (todos de tipo *string*):
   - `id`: cambia con cada aviso nuevo, p. ej. `evento-halloween-1`. Un aviso cerrado se identifica por este id.
   - `en`: el texto en inglés (máx. 140 caracteres). Obligatorio.
   - `es`: el texto en español. Opcional (sin él se muestra el inglés).
   - `until`: opcional, último día del aviso como `2026-10-31`. Después de ese día desaparece solo.
3. Para quitar el aviso antes de tiempo: borra el documento.

Ejemplo: `id = "doble-brasas-1"`, `es = "¡Fin de semana de doble brasas! Juega el reto diario."`, `until = "2026-11-02"`.
Ojo: el aviso solo informa; no cambia reglas del juego por sí mismo.

## 2. Avisar de una versión nueva (o forzar actualización)

El juego lee `config/app` al abrirse y compara con su propia versión (`app.json → expo.version`).

- Documento `config/app`, campos *string*:
  - `latest`: la versión más nueva publicada, p. ej. `1.3.0`. Quien tenga una anterior ve "Hay una versión nueva" (se puede cerrar, una vez por versión).
  - `min`: opcional, la versión mínima que sigue funcionando. Quien tenga una anterior ve un aviso que **no** se puede cerrar.
  - `url`: opcional, enlace `https://…` que abre el botón Actualizar (la ficha de Play, o una página de descarga).

Úsalo p. ej. cuando cambies las reglas de Firestore de forma incompatible: sube `min` para que nadie juegue con una versión rota.

## 3. Moderar clasificaciones y retos

No hay cuentas: cada fila es anónima. Para quitar una entrada ofensiva o tramposa:

- Consola → Firestore → colección (`highscores`, `daily_scores`, `challenge_scores` o `duel_players`) → borrar el documento.
- Los jugadores pueden ocultar y reportar entradas desde la app (botón de bandera); los reportes llegan al correo de `GAME_CONFIG.support.email`.
- Un nombre ofensivo que se repita: bórralo y, si hace falta, añade la palabra a la lista de `src/core/leaderboard/validation.ts` (eso sí requiere versión nueva).

## 4. Desplegar reglas de Firestore

Las reglas viven en `firestore.rules` y los índices en `firestore.indexes.json`. Tras cualquier cambio:

```
npx firebase-tools login --reauth        # si la sesión caducó
npm run test:rules                       # 60+ pruebas contra el emulador (necesita Java 17+)
npx firebase-tools deploy --only firestore --project nezu-games
```

Nunca despliegues reglas sin pasar `npm run test:rules` antes.

## 5. Vigilar uso y cuota (plan gratuito)

Consola → Firestore → pestaña *Usage*. Límites diarios del plan Spark: 50 000 lecturas, 20 000 escrituras.
Lo que más consume son los **duelos en vivo** (una escritura cada pocos segundos por jugador durante la partida).
Si el uso se acerca al límite: considerar subir `MIN_PUBLISH_MS` en `src/core/duel/duel.ts` (versión nueva) o pasar al plan Blaze.

## 6. Compilar un APK en esta computadora

Cuando no haya cuota de EAS (se reinicia el día 1 de cada mes):

```
set WUMPUS_ARCHS=arm
npx expo prebuild --platform android --clean --no-install   # solo si cambió app.json o algún paquete nativo
cd android && set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot" && gradlew assembleRelease
```

El APK queda en `android\app\build\outputs\apk\release\app-release.apk`. Va firmado con la clave de
desarrollo local: se instala encima de otro APK local, pero **no** encima de uno de EAS (ni al revés).
Para la tienda se usa siempre EAS (`npx eas-cli build --platform android --profile production`), que firma con la clave real.

## 7. Qué NO hacer

- No borres los proyectos ni las colecciones de Firestore "para limpiar": las reglas impiden borrar desde la app, pero la consola no.
- No actives productos de pago en Play sin encender y probar `GAME_CONFIG.monetization` primero.
- No compartas la clave de recuperación de tu copia en la nube: quien la tenga puede leer tu progreso.
