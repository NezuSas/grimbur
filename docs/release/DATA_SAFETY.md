# Formularios de privacidad de las tiendas (respuestas listas)

Verificado contra el código el 2026-10-14. Describe la app **tal como está hoy en el repo** y marca con `[SI ...]` las filas que cambian según lo que actives en la versión que subas.
Rehacer el formulario cuando cambie cualquier SDK, dato o modalidad (ver `PRIVACY_POLICY.md`, lista final). Debe coincidir en todo con la política publicada.

`TODO(owner)`: marcar en cada fila condicional cuál es tu caso real antes de enviar el formulario a Google.

## Inventario real (qué hace el código)

| Componente | Qué hace | Datos |
| --- | --- | --- |
| `src/services/highscores.ts` + `firestore.rules` | Lee el top 20 (al iniciar la app y al abrir el ranking) y escribe una entrada si la partida entra en el top 10 y el jugador la guarda | Documento con 6 campos: `name`, `score`, `level`, `coins`, `characterIndex`, `time`. Sin fecha, sin ID de usuario, sin autenticación |
| `src/services/localStats.ts`, `src/state/settings/store.ts` | Guardan progreso y ajustes en AsyncStorage (claves `wumpus.stats.v1` y `wumpus-adventures-settings`) | Solo en el dispositivo |
| `src/services/analytics.ts` | Fachada con 17 eventos; proveedor por defecto = consola (solo en desarrollo) | Nada sale del dispositivo hoy |
| `expo-updates` (canal `production`) | Comprueba actualizaciones OTA de Expo | IP, versión de app/runtime, plataforma |
| Compartir (`Share.share`) | Texto del resultado / registro de audio | Lo envía el usuario a la app que elija |
| `expo-clipboard` (en construcción) | Código de copia de seguridad | Local; el usuario lo copia o pega |
| `expo-store-review` (en construcción) | Ventana de reseña del sistema | Gestionado por Google/Apple |
| Anuncios | **No hay** | Ninguno |
| Cuentas / login | **No hay** | Ninguno |
| Permisos Android | `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`, `MODIFY_AUDIO_SETTINGS`. Bloqueados: `RECORD_AUDIO`, `READ/WRITE_EXTERNAL_STORAGE` (ver `app.json`) | Sin permisos "peligrosos" |

## Google Play: Seguridad de los datos

### Preguntas generales

| Pregunta | Respuesta |
| --- | --- |
| ¿Tu app recopila o comparte alguno de los tipos de datos requeridos? | **Sí** (el nombre del ranking y los datos de la partida se envían a un servidor) |
| ¿Todos los datos recopilados se cifran en tránsito? | **Sí** (HTTPS de Firebase/Expo) |
| ¿Ofreces una forma de que los usuarios soliciten el borrado de sus datos? | **Sí**: por correo (política, sección 5). Introduce la URL de la política o una página con el correo en el campo de "solicitud de eliminación de datos". `TODO(owner)` |
| ¿Cumple la app la Política de Familias? | No aplica: el público objetivo es 13+ |
| ¿Se ha validado de forma independiente (MASA)? | No |

### Tipos de datos

| Categoría | Tipo | ¿Recopilado? | ¿Compartido? | ¿Opcional? | Finalidad |
| --- | --- | --- | --- | --- | --- |
| Información personal | **Nombre** | Sí (alias escrito para el ranking, puede ser un apodo) | No | **Sí** (el usuario decide guardar) | Funcionalidad de la app |
| Información personal | Correo, dirección, teléfono, ID político/religión, otros | No | - | - | - |
| Actividad en la app | **Otro contenido generado por el usuario / Otras acciones en la app** (puntuación, piso, gemas, héroe, tiempo) | Sí (solo al guardar en el ranking) | No | Sí | Funcionalidad de la app |
| Actividad en la app | Interacciones de la app (eventos de uso) | **No hoy.** `[SI Firebase Analytics]` Sí; finalidad: Analítica; no compartido, procesado por Firebase como encargado | - | No | - |
| Información y rendimiento de la app | **Registros de fallos / Diagnósticos** | **No hoy.** `[SI Crashlytics]` Sí; finalidad: Analítica; datos procesados en nombre del desarrollador | - | No | - |
| Dispositivo u otros ID | ID de dispositivo | **No hoy.** `[SI Firebase Analytics/Crashlytics]` Sí (identificador de instancia de la app); `[SI RevenueCat]` Sí (ID de usuario anónimo de RevenueCat); finalidad: Analítica / Funcionalidad | No (procesador) | No | - |
| Historial de compras | Historial de compras | **No hoy.** `[SI compra única]` Sí: Google Play Billing; no lo recibes como dato personal. Si usas RevenueCat declara "Historial de compras" recopilado, finalidad: Funcionalidad | No | No | Funcionalidad de la app |
| Ubicación | Aproximada / precisa | No (la IP la ve el servidor pero no se usa para ubicar) | - | - | - |
| Mensajes, fotos, vídeos, audio, archivos, calendario, contactos | Todos | No | - | - | - |
| Salud y estado físico, información financiera | Todos | No (los pagos los gestiona Google; no ves tarjetas) | - | - | - |
| Portapapeles | (Play no lo declara como tipo; la política sí lo describe) | La app lee el portapapeles solo al pulsar "restaurar copia" `[SI backup]` | No | Sí | - |

Notas:

- "Compartido" en Play significa transferir a terceros que no sean tu encargado; Firebase actúa como procesador, por eso se declara "recopilado" y no "compartido". RevenueCat también (Play permite no declarar "compartido" cuando el tercero es un proveedor de servicios que procesa en tu nombre).
- Si en la versión conectas un SDK y no lo declaras, Play puede rechazar la actualización. El informe "Pre-launch" y la Consola muestran los SDK detectados: compáralos con esta tabla.
- Cuando el formulario esté aprobado con el valor de hoy (sin analítica) y luego se active Firebase Analytics, **hay que volver a enviar el formulario antes de publicar esa versión**.

### Anuncios, compras y público

| Elemento | Respuesta |
| --- | --- |
| ¿Contiene anuncios? | **No** |
| ¿Ofrece compras dentro de la app? | `[SI muro de pago activo]` **Sí** (un producto de pago único) / si no, No |
| Público objetivo | 13-15, 16-17, 18+. No incluir menores de 13 |
| ¿Atractivo para niños? | No |
| Acceso a la app (credenciales) | Toda la funcionalidad está disponible sin cuenta |
| Aplicaciones de noticias, salud, finanzas, gobierno | No |
| ID de publicidad (Android 13+) | **No** declarado (no se usa `AD_ID`; si añades un SDK que lo incluya, hay que declararlo o bloquearlo con `android.blockedPermissions`) |
| Clasificación de contenido (IARC) | Violencia fantástica suave; sin azar; contenido de usuario limitado al apodo del ranking. Respuestas completas en `STORE_LISTING.md` |

## Apple: Privacidad de la app ("etiqueta nutricional")

Solo si publicas en iOS.

| Elemento | Respuesta |
| --- | --- |
| Datos utilizados para rastrearte | **Ninguno** |
| Datos vinculados contigo | Ninguno (no hay cuenta). `[SI RevenueCat]`: Identificadores (ID de usuario anónimo) y Compras, finalidad: Funcionalidad, no usados para seguimiento |
| Datos no vinculados contigo | **Otro contenido de usuario** (apodo) y **Contenido del juego** (puntuación, piso), finalidad: Funcionalidad de la app. `[SI Firebase Analytics]` además: Datos de uso, Diagnósticos, Identificadores, finalidad: Analítica |
| ATT (App Tracking Transparency) | No se necesita (sin seguimiento ni anuncios) |
| Cifrado de exportación | `ios.config.usesNonExemptEncryption = false` ya está en `app.json` (solo HTTPS) |
| Directriz 1.2 (contenido generado por usuarios) | Apodos filtrados (lista de palabras) y limitados por reglas de Firestore. **Falta un mecanismo de reporte/ocultar antes de iOS** (Checklist C4). Publicar el correo de contacto |
| Directriz 3.1.1 | Botón "Restaurar compras" obligatorio con la compra única |
| Política de privacidad (URL) | `TODO(owner)` |

## Comprobación final antes de enviar el formulario

1. Abrir el AAB en Play Console > "Detalles del paquete" y ver la lista real de permisos; deben coincidir con el inventario de arriba.
2. `grep -rn "analytics" src --include=*.ts*`: confirmar si ya existe `setAnalyticsProvider(...)` con un proveedor real.
3. Revisar `package.json` por dependencias nuevas con SDK nativo (`@react-native-firebase/*`, `react-native-purchases`, `react-native-iap`, anuncios).
4. Alinear con `PRIVACY_POLICY.md` fila por fila.
