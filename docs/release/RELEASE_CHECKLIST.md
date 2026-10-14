# Checklist de lanzamiento: de hoy a producción

Estado verificado contra el repositorio el 2026-10-14 (rama `feat/ascension-forge`). Leyenda: `[x]` hecho en el repo, `[ ]` pendiente.
Responsables: **DEV** = código del repo (agentes/tú), **OWNER** = solo tú (cuentas, dinero, legal, personas), **AMBOS**.
Duraciones orientativas para una sola persona; las esperas de terceros (Google, bancos) no las controlas.

Documentos hermanos en `docs/release/`: `LAUNCH_PLAN.md`, `STORE_LISTING.md`, `PRIVACY_POLICY.md`, `DATA_SAFETY.md`,
`HOSTING_PRIVACY_POLICY.md`, `ASSETS_CHECKLIST.md`, `QA_TEST_PLAN.md` y `MONETIZATION_SETUP.md` (este último lo escribe otro agente junto con la pantalla de compra).

## 0. Qué ya está hecho en el repo

- [x] Juego completo: expedición de 10 pisos con Wumpus final, reliquias (elige 1 de 3), 4 héroes (Vael, Sera, Borin, Auric) con poder y habilidad, acechadores, durmientes, presagios, cuevas por bioma, tienda entre pisos, puertas, altar, reliquias malditas.
- [x] Modos: Expedición, Reto diario (misma cueva para todos, racha), Descenso sin fin (se desbloquea al vencer al Wumpus).
- [x] Seis profundidades de dificultad (Normal a Legendaria) que se desbloquean ganando.
- [x] La Forja: mejoras permanentes con brasas (18 mejoras; no se aplican al reto diario). Pantalla "Mi progreso" y 104 logros.
- [x] Tutorial jugable en el primer arranque + 4 lecciones opcionales en el manual (deducir, reliquias, tienda, herramientas); consejos de primer uso.
- [x] Bilingüe EN/ES (idioma automático o manual), accesibilidad: reducir destellos, tamaño/posición de controles, deslizar para mover, etiquetas a11y.
- [x] Orientación horizontal bloqueada (`app.json` `orientation: landscape`; actividad Android con `screenOrientation=landscape`); pasada responsive en todas las pantallas.
- [x] Audio original generado por scripts (`scripts/generateAudio.js`, `generateHorrorAudio.py`); sin assets de terceros sin licencia en audio.
- [x] "Borrar mis datos" en Ajustes (borra progreso local), error boundary, pausa al salir de la app.
- [x] Build de producción = AAB (`eas.json`), canal `production`, `autoIncrement` con `appVersionSource: remote`; `targetSdkVersion` 36 (visto en el manifiesto generado).
- [x] Reglas de Firestore escritas (`firestore.rules`) y validación en cliente del ranking.
- [x] Fachada de analítica (`src/services/analytics.ts`) con 17 eventos (6 de ellos del muro de pago); proveedor real aún NO conectado (ver 3.4).
- [~] En construcción por otro agente: preparación del muro de pago (`GAME_CONFIG.monetization`, `src/core/entitlements/gating.ts`, apagado por defecto), copia de seguridad por portapapeles (`expo-clipboard`) y petición de reseña (`expo-store-review`). Cuando aterricen, actualizar `PRIVACY_POLICY.md`/`DATA_SAFETY.md` si cambia algo (ya están redactados contemplándolos).
- [x] Configuración de tienda en `app.json`/`eas.json` revisada hoy (ver sección 8).

## Ruta ordenada hasta producción

Cada paso depende del anterior salvo que se indique "en paralelo". Las fechas relativas parten de "Día 0 = hoy".

### Fase A. Decisiones y cuentas (Día 0 a 3) — bloquean todo lo demás

| # | Tarea | Resp. | Duración |
| --- | --- | --- | --- |
| A1 | Decidir el **nombre final**. "Wumpus" es la mascota de Discord (riesgo moderado-bajo, sin verificar; `docs/market-research-notes/wumpus_ip_risks.md`). Búsqueda de conocimiento previo en USPTO, EUIPO TMview, WIPO Brand DB, SENADI y en Google Play/App Store. Un nombre con "Wumpus" pero sin parecerse a Discord (color, mascota) es defendible; si dudas, cambia el título y deja "Wumpus" en subtítulo/palabras clave. | OWNER | 1-2 días |
| A2 | Si cambias el nombre: actualizar `app.json` `name` (el `slug` y los identificadores NO se deben cambiar después de publicar; decídelo ahora) y los textos de `STORE_LISTING.md` (`[NAME]`). Los identificadores actuales son `com.cuencaoscar.wumpusadventures` (Android e iOS): **son permanentes una vez subidos a Play**; confirma que te gustan ahora. | OWNER decide, DEV aplica | 1 h |
| A3 | Crear cuenta de **Google Play Console** (25 USD, verificación de identidad; Ecuador está soportado para registro y comerciante). Cuenta personal = prueba cerrada obligatoria (12 testers x 14 días). | OWNER | 1-3 días (verificación) |
| A4 | Crear el **perfil de pagos / comerciante** en Play Console (necesario para vender el desbloqueo y cobrar). Cuenta bancaria en USD a tu nombre o el de la SAS; Play paga por transferencia, mínimo 100 USD. | OWNER | 1 día + validación |
| A5 | Cuenta de **Expo/EAS** ya existe (`projectId` en `app.json`). Verificar `eas whoami` y que haya cuota de builds. | OWNER | 15 min |
| A6 | **Contador/a**: RUC y régimen (RIMPE/Negocio Popular), si los pagos de plataformas extranjeras son exportación de servicios (IVA 0%), W-8BEN, si conviene SAS. Preguntas en `docs/market-research-notes/ecuador_tax.md`. En paralelo, no bloquea la prueba cerrada pero SÍ el primer cobro. | OWNER | 1-2 semanas (en paralelo) |
| A7 | Apple Developer (99 USD/año): **confirmar primero que Ecuador es aceptado para inscripción y pagos**. Opcional: lanzar solo en Android primero (recomendado, ver `LAUNCH_PLAN.md`). | OWNER | 1-7 días si se hace |

### Fase B. Backend y legal mínimo (Día 1 a 5, en paralelo con A)

| # | Tarea | Resp. | Duración |
| --- | --- | --- | --- |
| B1 | **Proyecto Firebase propio**: el actual se llama `mario-s-grid` (sobrante de otro juego; el id es visible en el APK). Crear uno nuevo, activar Firestore en modo producción, y sustituir la config web en `src/lib/firebase.ts` (DEV, 10 min). Migrar no hace falta: el ranking empieza vacío. | OWNER crea, DEV cambia | 1 h |
| B2 | **Desplegar `firestore.rules`** (`firebase deploy --only firestore:rules --project <id>`). Hasta que lo hagas, cualquiera puede escribir en el ranking. Pasos en `docs/SECURITY.md`. | OWNER | 30 min |
| B3 | Activar **App Check** (Play Integrity) y reforzar: requiere `@react-native-firebase/app-check` y build de desarrollo; si tarda, publicar sin ello y dejarlo para 1.1 (riesgo aceptado: ranking falsificable dentro de rangos plausibles). | AMBOS | 0.5-1 día |
| B4 | **Correo de contacto público** para privacidad y soporte (crea uno dedicado, p. ej. soporte@tu-dominio o Gmail específico). Sustituir todos los `TODO(owner)` de `PRIVACY_POLICY.md` y `STORE_LISTING.md`. Poner la misma dirección en `GAME_CONFIG.support.email` (`src/config/gameConfig.ts`): es la que usa el botón de reportar entradas del ranking. | OWNER | 30 min |
| B5 | **Hospedar la política de privacidad** (GitHub Pages, gratis): `HOSTING_PRIVACY_POLICY.md`. Deja la URL final anotada en `GAME_CONFIG.monetization.privacyUrl` (DEV) y en Play Console. Lo mismo para los términos si los usas. | OWNER | 30 min |
| B6 | Que un abogado/a revise la política (LOPDP de Ecuador; GDPR si te descargan en la UE). Se puede hacer después de publicar la prueba cerrada, pero antes de producción. | OWNER | 1 semana (en paralelo) |

### Fase C. Código listo para vender (Día 1 a 7)

| # | Tarea | Resp. | Duración |
| --- | --- | --- | --- |
| C1 | **Analítica real**: implementar `AnalyticsProvider` (Firebase Analytics + Crashlytics vía `@react-native-firebase`, requiere build nativo) y llamar `setAnalyticsProvider` al arrancar. Añadir los eventos que faltan para el embudo (`tutorial_complete`, `tutorial_skip`, `app_open`, `lesson_complete`, `forge_purchase`; lista exacta en `LAUNCH_PLAN.md`). Si tu cuenta es nueva, ten presente que los informes de retención de Play Console funcionan sin SDK. Actualizar `DATA_SAFETY.md` y la política al conectar un SDK. | DEV | 1-2 días |
| C2 | **Compra única** ("Juego completo", id `wumpus_full_game`, ~3,99 USD): integrar RevenueCat o `react-native-iap`, botón **Restaurar compras** obligatorio, crear el producto en Play Console, activar `GAME_CONFIG.monetization.enabled`. Guía: `MONETIZATION_SETUP.md`. Gratis: tutorial, pisos 1-3 y reto diario; de pago: resto de la expedición, Wumpus y Sin fin. Sin anuncios. | DEV (otro agente) + OWNER (producto en consola) | 2-4 días |
| C3 | Copia de seguridad por portapapeles y petición de reseña: probar en dispositivo real (`QA_TEST_PLAN.md` secciones 11 y 12). La reseña se pide tras un buen momento (victoria o récord), nunca al arrancar. | DEV | ya en curso |
| C4 | Reportar/ocultar nombres del ranking (Apple 1.2; en Play es recomendable): como mínimo, correo de contacto visible en la ficha; ideal: botón "Reportar" en una fila. Obligatorio antes de iOS. | DEV | 1 día |
| C5 | `package.json` dice `1.0.0` y `app.json` `1.1.0`: unificar (el valor que cuenta para la tienda es `app.json` `version`; el versionCode lo gestiona EAS). | DEV | 5 min |
| C6 | Congelar `GAME_CONFIG.dev.*` en `false` (`unlockAllHeroes`, `localPurchases`) y `monetization.termsUrl/privacyUrl` con URLs reales. Comprobación final antes de cada AAB. | DEV | 10 min |

### Fase D. Activos de tienda (Día 3 a 9, en paralelo con C)

| # | Tarea | Resp. | Duración |
| --- | --- | --- | --- |
| D1 | **Icono 512x512**: ya generado en `docs/release/store/icon-512.png`. Producir el **gráfico de funciones 1024x500** (falta; ver `ASSETS_CHECKLIST.md`). | OWNER/DEV | 0.5-1 día |
| D2 | **Capturas** horizontales según el guion de `STORE_LISTING.md` (mín. 2, recomendado 8; 16:9) en ES y EN. Se capturan de un dispositivo real. `scripts/screenshots.ps1` sirve para pasadas rápidas en web, no para la tienda. | OWNER | 0.5 día |
| D3 | **Arte y audio**: `docs/ASSETS.md` aún dice "Source: ?" en casi todos los sprites. Documentar origen y licencia (IA incluida). **Borrar `assets/wumpa.wav` y `assets/laba.wav`** (sin uso en el código, posible audio de Crash Bandicoot; pueden empaquetarse por `assetBundlePatterns`). El historial de git conserva imágenes de Mario/Pokémon: no publicar nunca el repositorio. Play no pide pruebas, pero una reclamación sí. | OWNER | 0.5 día |
| D4 | Vídeo promocional (opcional, YouTube, 30-60 s). | OWNER | 0.5 día |

### Fase E. QA en dispositivos reales (Día 6 a 10)

| # | Tarea | Resp. | Duración |
| --- | --- | --- | --- |
| E1 | Ejecutar `QA_TEST_PLAN.md` completo en: un teléfono pequeño, uno con notch/isla, una tableta; Android 7-8 (el mínimo es API 24), 12-13 y 14-16 si es posible. Anotar fallos y corregir los bloqueantes. | OWNER (probar), DEV (corregir) | 2-3 días |
| E2 | Comandos de verificación: `npm run typecheck`, `npm test`, `npx expo-doctor`, `npx expo export --platform android`; tras cualquier cambio de balance, `npx tsx scripts/simulate.ts`. | DEV | 30 min |

### Fase F. Build y prueba cerrada (empezar lo antes posible; ~Día 8 a 22)

La prueba cerrada fija el calendario: 14 días continuos con 12 testers inscritos. Cuanto antes se suba la primera build, antes puedes pedir producción.

| # | Tarea | Resp. | Duración |
| --- | --- | --- | --- |
| F1 | Crear la app en Play Console, activar **Play App Signing**, rellenar "Contenido de la app": política de privacidad (URL), anuncios (**No**), acceso a la app (sin login), clasificación IARC (respuestas en `STORE_LISTING.md`), público objetivo (**13+, no niños**), formulario de **Seguridad de los datos** (`DATA_SAFETY.md`), categoría, correo de contacto. Si usas compra única: declarar "contiene compras dentro de la aplicación". | OWNER | 1 día |
| F2 | Primera build: `eas build -p android --profile production` (AAB). Subir con `eas submit -p android --profile production` (pista interna, borrador; requiere la clave de cuenta de servicio en `./secrets/play-service-account.json`, ver sección 8) o a mano en la consola la primera vez. | AMBOS | 1-2 h (cola EAS) |
| F3 | Prueba interna (tú + 2-3 amigos) para validar que la instalación y la compra de prueba funcionan. Añadir cuentas como **testers de licencia** para probar compras sin pagar. | OWNER | 1-2 días |
| F4 | **Reclutar 12+ testers** (familia, compañeros, grupos de Discord/Reddit r/AndroidClosedTesting, comunidades de testers). Pide 20 por si algunos se salen. Crear pista de prueba cerrada, lista de correos Google, subir el AAB, compartir el enlace de opt-in. Pedir que **no se desinstalen** durante 14 días. | OWNER | 1-5 días reclutando |
| F5 | **14 días continuos** con 12+ testers inscritos. Mientras tanto: arreglar fallos, publicar builds nuevas a la misma pista (el contador de 14 días no se reinicia por actualizar, pero un tester que se sale resta). Pedir feedback con 2-3 preguntas. | OWNER | 14 días (fijo) |
| F6 | Revisar el informe previo al lanzamiento (Pre-launch report) y las alertas de Play Console (ANR, crashes, permisos). | DEV | 1 h |

### Fase G. Producción y soft launch (Día ~23 en adelante)

| # | Tarea | Resp. | Duración |
| --- | --- | --- | --- |
| G1 | Solicitar **acceso a producción** en Play Console (cuestionario sobre la prueba cerrada). | OWNER | 10 min; respuesta de Google ~1-7 días |
| G2 | Ficha completa: textos EN/ES (`STORE_LISTING.md`), capturas, icono, gráfico, etiquetas, ficha de precios si hay compra. País inicial: ver `LAUNCH_PLAN.md` (Ecuador + LatAm hispana primero). | OWNER | 0.5 día |
| G3 | Publicar en producción con **despliegue escalonado** (20 % → 50 % → 100 %) y revisión de Google (de horas a ~7 días en apps nuevas). | OWNER | 1-7 días |
| G4 | Ejecutar `LAUNCH_PLAN.md`: 4 semanas, puertas D1 >= 30 % y D7 >= 6 % antes de gastar en marketing. | OWNER | 4 semanas |
| G5 | Activar mejoras continuas: responder reseñas, parches rápidos, OTA con `expo-updates` solo para cambios de JS (canal `production`; cambios de versión nativa requieren nuevo AAB). | AMBOS | continuo |

## 8. Estado de configuración (`app.json` / `eas.json`)

Revisado hoy. Cambios aplicados (seguros, no tocan nombre, `slug`, `package` ni `bundleIdentifier`):

- `description` y `primaryColor` (`#140F2A`, el fondo del icono adaptativo).
- `android.blockedPermissions`: `RECORD_AUDIO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`. El juego no graba audio ni accede al almacenamiento compartido; un manifiesto generado antes de este cambio (`android/app/src/main/AndroidManifest.xml`, carpeta generada e ignorada por git) los incluía. Se mantiene `MODIFY_AUDIO_SETTINGS`. No se bloquea `SYSTEM_ALERT_WINDOW` (la usan las herramientas de desarrollo en debug): al terminar el primer AAB, revisa en Play Console, "Versión > Detalles del paquete > Permisos" qué permisos declara realmente y compáralo con `DATA_SAFETY.md`.
- `ios.config.usesNonExemptEncryption: false` (solo HTTPS estándar; evita la pregunta de exportación de cifrado de Apple).
- `eas.json` `submit.production.android.serviceAccountKeyPath = ./secrets/play-service-account.json`; `/secrets` añadido a `.gitignore`.

Pendiente / decisiones deliberadas:

- `android.versionCode` y `ios.buildNumber`: los gestiona EAS (`appVersionSource: remote` + `autoIncrement`). Si ya subiste algún AAB a mano, sincroniza con `eas build:version:set`.
- `androidStatusBar`: no se añade (en SDK 57 con edge-to-edge no tiene efecto y el juego oculta la barra de estado desde `StackNavigator`).
- `locales`: no se añade; el nombre de la app es igual en EN y ES. Los idiomas ya están en el plugin `expo-localization` (`en`, `es`). Si el nombre final se traduce, crear `locales/es.json` y referenciarlo.
- iOS submit: no hay bloque `ios` en `submit`. Añadir `"ios": { "ascAppId": "<ID de App Store Connect>" }` cuando exista la app.
- `userInterfaceStyle: "light"` mientras la UI es oscura: no afecta a Android, y en iOS solo condiciona diálogos del sistema. Se deja.
- Auto Backup de Android está activo (`allowBackup=true`, valor por defecto de Expo): Google puede restaurar el progreso local al reinstalar o cambiar de teléfono. Es positivo para jugadores, y está descrito en la política (sección 5).
- `updates.url` + `runtimeVersion.policy=appVersion`: OTA activado para el canal de la build; cada cambio de `version` rompe la compatibilidad OTA con builds anteriores a propósito.

## 9. Antes de cada versión posterior

- [ ] `npm run typecheck`, `npm test`, `npx expo-doctor`, `npx expo export --platform android`.
- [ ] `npx tsx scripts/simulate.ts` si se tocó el balance.
- [ ] Subir `version` en `app.json` (EAS suma el versionCode).
- [ ] Releer `PRIVACY_POLICY.md` y `DATA_SAFETY.md` si cambió algún SDK o dato recogido.
- [ ] Rellenar "Novedades" en ES y EN (plantilla en `STORE_LISTING.md`).
- [ ] Pasar la sección 2 (humo) de `QA_TEST_PLAN.md` en un dispositivo real.

## 10. Bloqueantes vigentes (resumen)

1. Nombre/marca sin decidir (A1) y identificadores permanentes (A2).
2. Firebase `mario-s-grid` heredado y reglas de Firestore **sin desplegar** (B1, B2).
3. Sin proveedor de analítica real: sin él no hay métricas de las puertas D1/D7 salvo los informes de Play (C1).
4. Faltan gráfico de funciones y capturas (D1, D2); el icono 512 ya está en `docs/release/store/icon-512.png`.
5. Procedencia del arte sin documentar y dos WAV sospechosos dentro de `assets/` (D3).
6. Placeholders pendientes: correo de contacto y URL de la política (`TODO(owner)`).
7. Prueba cerrada: 12 testers x 14 días (F4, F5); hay que empezarla cuanto antes.
