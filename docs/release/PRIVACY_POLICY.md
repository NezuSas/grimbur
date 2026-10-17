# Política de privacidad / Privacy Policy

> **Para el titular (no publicar este recuadro).** Este archivo es la política lista para alojar (ver `HOSTING_PRIVACY_POLICY.md`). Verificada contra el código el 2026-10-14.
> Antes de publicar, busca `TODO(owner)` y resuélvelos todos (el comando `grep -n "TODO(owner)" docs/release/*.md` los lista):
>
> 1. Fecha de vigencia, nombre del titular, país, correo de contacto.
> 2. Región elegida para Firestore (afecta a "transferencias internacionales").
> 3. Elegir **un** caso para analítica/fallos (sección 2, fila "Diagnóstico") y **un** caso para las compras (sección 2, fila "Compra"), y borrar los demás.
> 4. Si en la versión que subes no existe el código de copia de seguridad o la petición de reseña, borra esas filas.
> 5. Quitar este recuadro y las marcas `TODO(owner)` ya resueltas. Si queda alguna `TODO(owner)` en el texto público, la política no está lista.
>
> Esto no es asesoría legal: que un abogado/a la revise (LOPDP de Ecuador; GDPR si hay descargas en la UE).
> Si añades anuncios, cuentas, nuevos SDK o nuevos datos, actualiza antes esta política y `DATA_SAFETY.md` (lista al final).

---

# English

**Wumpus Adventures: Privacy Policy**

**Effective date:** TODO(owner): date of publication
**Developer / data controller:** TODO(owner): your full name or company name, Ecuador
**Contact for privacy requests:** TODO(owner): support email

## 1. What this app is

Wumpus Adventures is a single-player puzzle game for Android (and iOS where available). It has **no accounts**, **no advertising** and does not ask for your real name, email, phone number, contacts, photos, camera, microphone or location. It does not use App Tracking Transparency or an advertising ID.

## 2. Data we process and why

| Data | When | Why | Where it goes |
| --- | --- | --- | --- |
| **Leaderboard entry**: the display name you type (up to 20 characters), score, floor reached, gems collected, hero used and run time | Only if your run qualifies for the global top 10 **and** you choose to save it | To show the public global leaderboard | Google Firebase (Cloud Firestore). Visible to every player. Contains no email, device ID or timestamp |
| **Reading the leaderboard** | When you open the ranking and once at app start (to know whether a score would qualify) | To show the top 10 | Firestore receives the request, which includes your IP address, as every internet service does |
| **Cloud copy of your progress** (optional, off by default): your game progress and settings as one backup code, stored under a random 16-character recovery key | Only if you turn on "Save my progress in the cloud" in Settings; saved after each run and when you leave the app | So you can get your progress back on another phone or after reinstalling | Google Firebase (Cloud Firestore, United States). Not tied to your name, email or device: whoever has the key can read the copy. Turning the option off deletes it |
| **Game progress and settings**: best score and floor, runs and wins, embers and Forge upgrades, achievements, daily-challenge streak, run history, hero use, language, sound, vibration, control layout, tutorial and tips seen, purchase status | Always | To remember your progress | **Only on your device** (app storage). We do not receive it. On Android, Google's automatic backup may keep a copy in your Google account, under your Google account settings |
| **App updates**: app version, runtime version, platform and the release channel | When the app starts, if over-the-air updates are enabled | To deliver bug fixes without a store update | Expo (EAS Update). Their servers see your IP address |
| **Diagnostics** (crashes, errors, anonymous usage events such as "run started" or "floor cleared") | TODO(owner): choose one and delete the rest. **A:** currently nothing leaves the device; delete the rest of this row. **B:** if Firebase Analytics/Crashlytics is enabled in the release: "Always, in the background" | To fix bugs and understand how the game is used | **B:** Google Firebase. Collects an app-instance identifier, device model and OS version, country-level location derived from IP, crash stack traces and anonymous events. No name or email |
| **Purchase** (one-time "full game" unlock) | TODO(owner): only if the paywall is enabled in the release | To process and restore your purchase | **A:** Google Play Billing (or Apple, on iOS): they process payment, we never see your card. We only receive whether the purchase is valid. **B:** if RevenueCat is used: an anonymous app user ID, the purchase receipt and your IP address are sent to RevenueCat to validate and restore the purchase |
| **Backup code** (copy of your progress as text) | TODO(owner): only if released. When you press "copy backup" or "restore" | So you can move your progress to another device | The code is placed on your device clipboard or pasted by you. The app does not send it to us. The app reads the clipboard only when you ask it to restore |
| **Review prompt** | After a good moment (for example a victory) | To let you rate the game | Google Play's (or Apple's) own in-app review window. We do not receive the content of your review through the app |
| **Share** | When you press "Share result" | To post your result | The text goes to the app you choose in your device's share sheet. We do not receive it |
| **Audio log** (a short text log about sound) | Only if you press "Share audio log" in Settings | Bug reports | The app you choose in the share sheet (for example email to the developer) |

We do **not** sell your data, do not use it for advertising and do not build advertising profiles.

Please do not type personal information (your real name, phone or email) as your display name. Names are filtered for offensive words, but anything you type is public.

## 3. Legal basis

Your consent (you decide whether to save a score or restore a backup) and our legitimate interest in running and securing the game. Under Ecuador's Ley Orgánica de Protección de Datos Personales (LOPDP); for people in the EU/UK, the GDPR.

## 4. Sharing and processors

We share leaderboard data only with **Google Firebase** (Cloud Firestore), which acts as our processor. Data location: United States (multi-region nam5). Other processors that appear depending on the release configuration: **Expo** (updates), **Google Play** / **Apple** (purchases and reviews), and, only if enabled in the release, **Firebase Analytics/Crashlytics** or **RevenueCat**. Data may be processed in countries other than yours, including the United States, with the safeguards those providers publish. We do not share data with anyone else, except where the law requires.

## 5. Retention, deletion and your rights

- **On your device:** progress and settings stay until you use **Settings > Delete my data** (erases progress, embers and achievements), clear the app's storage or uninstall. If Android's automatic backup is active, a restored copy may come back after reinstalling; clear it from your Google account backup settings if you want it gone.
- **Leaderboard:** entries stay until removed. To remove an entry, email TODO(owner): support email with the name you used and the score, floor and time shown in the ranking (entries have no date or account, so these details are how we find it). We reply within 30 days and delete it. Deleting local data does **not** delete a leaderboard entry.
- **Rights:** access, rectification and update, deletion, objection, portability, suspension and not to be subject to automated decisions, as set out by the LOPDP (or GDPR where it applies). Because we hold no account or identifier that links you to your data, we can act only on leaderboard entries you can identify for us.
- You can complain to the data protection authority of your country (in Ecuador, the Superintendencia de Protección de Datos Personales).

## 6. Children

The game is **not directed to children under 13** (or the minimum age in your country). We do not knowingly collect personal data from them. If you think a child has saved a name on the leaderboard, contact us and we will remove it.

## 7. Security

Traffic to Firebase uses HTTPS. The database accepts only well-formed score entries and denies edits and deletions from the app. No system is perfectly secure.

## 8. Changes

We will publish changes on this page and update the effective date. If a change affects what data we collect, the store listing's data-safety information will be updated at the same time.

---

# Español

**Wumpus Adventures: Política de privacidad**

**Fecha de vigencia:** TODO(owner): fecha de publicación
**Titular / responsable del tratamiento:** TODO(owner): tu nombre completo o razón social, Ecuador
**Contacto para solicitudes de privacidad:** TODO(owner): correo de soporte

## 1. Qué es esta aplicación

Wumpus Adventures es un juego de puzles para un jugador en Android (y iOS cuando esté disponible). **No tiene cuentas**, **no tiene publicidad** y no pide tu nombre real, correo, teléfono, contactos, fotos, cámara, micrófono ni ubicación. No usa la transparencia de seguimiento de Apple ni identificador publicitario.

## 2. Datos que tratamos y para qué

| Dato | Cuándo | Para qué | Adónde va |
| --- | --- | --- | --- |
| **Entrada del ranking**: el nombre que escribes (hasta 20 caracteres), puntuación, piso alcanzado, gemas recogidas, héroe y tiempo de la partida | Solo si tu partida entra en el top 10 global **y** decides guardarla | Mostrar el ranking global público | Google Firebase (Cloud Firestore). Visible para todos los jugadores. No incluye correo, identificador de dispositivo ni fecha |
| **Lectura del ranking** | Al abrir el ranking y una vez al iniciar la aplicación (para saber si una puntuación entraría) | Mostrar el top 10 | Firestore recibe la petición, que incluye tu dirección IP, como cualquier servicio de internet |
| **Copia de tu progreso en la nube** (opcional, desactivada por defecto): tu progreso y ajustes como un código de respaldo, guardado con una clave de recuperación aleatoria de 16 caracteres | Solo si activas "Guardar mi progreso en la nube" en Ajustes; se guarda después de cada partida y al salir de la app | Para recuperar tu progreso en otro teléfono o tras reinstalar | Google Firebase (Cloud Firestore, Estados Unidos). No está ligada a tu nombre, correo ni dispositivo: quien tenga la clave puede leer la copia. Al desactivar la opción se borra |
| **Progreso y ajustes**: mejor puntuación y piso, partidas y victorias, brasas y mejoras de la Forja, logros, racha del reto diario, historial de partidas, héroes usados, idioma, sonido, vibración, disposición de controles, tutorial y consejos vistos, estado de compra | Siempre | Recordar tu progreso | **Solo en tu dispositivo** (almacenamiento de la app). No lo recibimos. En Android, la copia de seguridad automática de Google puede guardar una copia en tu cuenta de Google, según los ajustes de tu cuenta |
| **Actualizaciones**: versión de la app y del entorno, plataforma y canal de publicación | Al iniciar la app, si las actualizaciones por aire están activas | Entregar correcciones sin esperar a la tienda | Expo (EAS Update). Sus servidores ven tu dirección IP |
| **Diagnóstico** (fallos, errores y eventos anónimos de uso como "partida iniciada" o "piso superado") | TODO(owner): elige una opción y borra la otra. **A:** por ahora nada sale del dispositivo; borra el resto de la fila. **B:** si en la versión se activa Firebase Analytics/Crashlytics: "siempre, en segundo plano" | Corregir errores y entender cómo se usa el juego | **B:** Google Firebase. Recoge un identificador de instancia de la app, modelo de dispositivo y versión del sistema, ubicación aproximada a nivel de país por IP, trazas de fallos y eventos anónimos. Sin nombre ni correo |
| **Compra** (desbloqueo único del juego completo) | TODO(owner): solo si el muro de pago está activo en la versión | Procesar y restaurar tu compra | **A:** Google Play Billing (o Apple en iOS): procesan el pago y nosotros nunca vemos tu tarjeta; solo recibimos si la compra es válida. **B:** si se usa RevenueCat: se envían a RevenueCat un identificador anónimo de usuario de la app, el recibo de compra y tu IP para validar y restaurar la compra |
| **Código de copia de seguridad** (copia de tu progreso como texto) | TODO(owner): solo si se publica. Cuando pulsas "copiar copia de seguridad" o "restaurar" | Mover tu progreso a otro dispositivo | El código se coloca en el portapapeles de tu dispositivo o lo pegas tú. La app no nos lo envía. Solo lee el portapapeles cuando le pides restaurar |
| **Petición de reseña** | Tras un buen momento (por ejemplo, una victoria) | Permitirte valorar el juego | La ventana de reseña de Google Play (o Apple). No recibimos el contenido de tu reseña a través de la app |
| **Compartir** | Cuando pulsas "Compartir resultado" | Publicar tu resultado | El texto va a la app que elijas en el menú de compartir. No lo recibimos |
| **Registro de audio** (texto breve sobre el sonido) | Solo si pulsas "Compartir registro de audio" en Ajustes | Informar de errores | La app que elijas en el menú de compartir (por ejemplo, correo al desarrollador) |

**No** vendemos tus datos, no los usamos para publicidad ni creamos perfiles publicitarios.

Por favor no escribas información personal (nombre real, teléfono o correo) como nombre visible. Los nombres pasan por un filtro de palabras ofensivas, pero todo lo que escribas es público.

## 3. Base legal

Tu consentimiento (tú decides si guardas una puntuación o restauras una copia) y nuestro interés legítimo en operar y proteger el juego. En Ecuador, la Ley Orgánica de Protección de Datos Personales (LOPDP); para personas de la UE/Reino Unido, el RGPD.

## 4. Con quién se comparte

Compartimos los datos del ranking solo con **Google Firebase** (Cloud Firestore), que actúa como encargado del tratamiento. Ubicación de los datos: Estados Unidos (multi-región nam5). Según la configuración de la versión, también intervienen **Expo** (actualizaciones), **Google Play** / **Apple** (compras y reseñas) y, solo si se activan, **Firebase Analytics/Crashlytics** o **RevenueCat**. Los datos pueden tratarse en países distintos del tuyo, incluido Estados Unidos, con las garantías que publican esos proveedores. No compartimos datos con nadie más salvo obligación legal.

## 5. Conservación, eliminación y tus derechos

- **En tu dispositivo:** el progreso y los ajustes permanecen hasta que uses **Ajustes > Borrar mis datos** (borra progreso, brasas y logros), borres el almacenamiento de la app o la desinstales. Si la copia de seguridad automática de Android está activa, una copia restaurada puede volver tras reinstalar; bórrala desde los ajustes de copia de tu cuenta de Google si quieres eliminarla.
- **Ranking:** las entradas permanecen hasta que se eliminen. Para eliminar una, escribe a TODO(owner): correo de soporte con el nombre que usaste y la puntuación, piso y tiempo que aparecen en el ranking (las entradas no tienen fecha ni cuenta, así que esos datos son la forma de encontrarla). Respondemos en 30 días y la borramos. Borrar los datos locales **no** borra una entrada del ranking.
- **Derechos:** información, acceso, rectificación y actualización, eliminación, oposición, portabilidad, suspensión del tratamiento y a no ser objeto de decisiones automatizadas, según la LOPDP (o el RGPD donde aplique). Como no tenemos una cuenta ni un identificador que te vincule con tus datos, solo podemos actuar sobre entradas del ranking que puedas identificarnos.
- Puedes presentar una reclamación ante la autoridad de protección de datos de tu país (en Ecuador, la Superintendencia de Protección de Datos Personales).

## 6. Menores

El juego **no está dirigido a menores de 13 años** (o la edad mínima de tu país). No recogemos conscientemente datos personales de menores. Si crees que un menor guardó un nombre en el ranking, escríbenos y lo eliminaremos.

## 7. Seguridad

El tráfico hacia Firebase usa HTTPS. La base de datos solo acepta entradas de puntuación bien formadas y rechaza ediciones y borrados desde la app. Ningún sistema es totalmente seguro.

## 8. Cambios

Publicaremos los cambios en esta página y actualizaremos la fecha de vigencia. Si un cambio afecta a los datos que recogemos, actualizaremos a la vez la información de seguridad de los datos de la tienda.

---

## Lista de actualización (para el titular, borrar de la versión pública)

- **Anuncios (AdMob u otros):** declarar ID de publicidad, flujo de consentimiento (Google UMP) para EEE/Reino Unido, ATT en iOS; actualizar secciones 1, 2 y 4 y los formularios de tienda.
- **SDK de analítica o fallos:** listar datos recogidos, actualizar la fila "Diagnóstico", sección 4 y `DATA_SAFETY.md`.
- **Cuentas o guardado en la nube:** añadir identificadores, borrado de cuenta dentro de la app (obligatorio en Play y Apple), actualizar sección 5.
- **Compras integradas:** el procesador de pagos (Google/Apple) y, si se usa, RevenueCat; botón "Restaurar compras".
- **Cambio de proyecto Firebase o de región:** actualizar sección 4.
