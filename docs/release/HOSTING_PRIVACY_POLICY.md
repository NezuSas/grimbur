# Cómo alojar la política de privacidad gratis (GitHub Pages)

Google Play y la App Store exigen una **URL pública** de la política (sin inicio de sesión, no un PDF descargable, accesible desde cualquier país). GitHub Pages es gratis, estable y sirve HTTPS.
Requisito: la página de un sitio gratuito sale de un repositorio **público**. Por eso se crea un repo aparte, solo con el texto legal (no publiques el código del juego).

Tiempo: ~20 minutos. Necesitas una cuenta de GitHub (ya tienes `NezuSas`).

## Paso a paso

1. **Resolver los `TODO(owner)`** de `docs/release/PRIVACY_POLICY.md` (fecha, nombre del titular, correo, región de Firestore, filas condicionales de diagnóstico/compra/copia de seguridad/reseña).
   Comprobación: `grep -n "TODO(owner)" docs/release/PRIVACY_POLICY.md` solo debe devolver el recuadro inicial, que no se publica (paso 3).

2. **Crear el repositorio público**: GitHub > New repository > nombre `grimbur-legal` (o el nombre final del juego) > **Public** > con README. No añadas más archivos que los de abajo.

3. **Crear la página** `privacy/index.md` en el repo con el contenido público. Desde la raíz del repo del juego, en PowerShell:

   ```powershell
   $src = Get-Content docs\release\PRIVACY_POLICY.md -Raw -Encoding UTF8
   # quitar el recuadro del titular (hasta el primer ---) y la lista de actualización final
   $body = ($src -split "(?m)^---\s*$", 2)[1]
   $body = ($body -split "(?m)^## Lista de actualización", 2)[0]
   $front = "---`ntitle: Privacy Policy`nlang: en`n---`n"
   New-Item -ItemType Directory -Force ..\grimbur-legal\privacy | Out-Null
   Set-Content ..\grimbur-legal\privacy\index.md ($front + $body) -Encoding UTF8
   ```

   Opcional pero recomendable: crear también `index.md` en la raíz del repo con una línea y un enlace a `privacy/`, y un fichero vacío `.nojekyll` si prefieres HTML puro.
   Revisa el resultado: NO debe contener ninguna `TODO(owner)` ni el recuadro "Para el titular".

4. **Activar Pages**: en el repo > Settings > Pages > Build and deployment > Source: *Deploy from a branch* > Branch: `main` / carpeta `/ (root)` > Save.
   Espera 1-2 minutos. La URL será: `https://nezusas.github.io/grimbur-legal/privacy/` (usuario en minúsculas; cámbiala si el repo se llama distinto).

5. **Verificar** en una ventana privada del navegador y desde el móvil con datos móviles: carga sin iniciar sesión, se ven las dos secciones (English y Español) y los enlaces. Si ves un 404, revisa que el archivo se llame exactamente `privacy/index.md` y que Pages esté en `main`.

6. **Usar la URL** en todos estos sitios (y apuntar el enlace final en el checklist, Fase B5):
   - Play Console > Contenido de la app > Política de privacidad.
   - Play Console > Seguridad de los datos (campo de política y de solicitud de eliminación de datos).
   - `STORE_LISTING.md` (texto "Privacy: <TODO(owner): privacy policy URL>").
   - `src/config/gameConfig.ts` `monetization.privacyUrl` (hoy `https://example.com/grimbur/privacy`; lo cambia DEV). Si añades términos, `termsUrl`.
   - App Store Connect (si publicas en iOS) > Información de la app > URL de la política.

7. **Actualizaciones**: edita `privacy/index.md` en GitHub, guarda; Pages redespliega solo. Cambia siempre la "Fecha de vigencia". Si cambia algo que afecta a los datos, también el formulario de Play/Apple (`DATA_SAFETY.md`).

## Si prefieres otra opción gratuita

| Opción | Cuándo | Nota |
| --- | --- | --- |
| **Firebase Hosting** | Ya tienes Firebase (proyecto nuevo del checklist B1) | `firebase init hosting`, carpeta `public/privacy/index.html`, `firebase deploy --only hosting`. URL `https://<proyecto>.web.app/privacy/`. Requiere HTML (convierte el Markdown con cualquier conversor) |
| **Google Sites** | No quieres usar Git | Pega el texto, publica con acceso "cualquiera con el enlace". La URL por defecto es larga; cuida que no pida inicio de sesión |
| Dominio propio | Si compras uno más adelante | Apunta un CNAME a Pages (Settings > Pages > Custom domain) y actualiza las URL en todas las tiendas |

No uses: Notion, Google Docs sin publicar, PDF en Drive (a veces piden inicio de sesión o fallan en la revisión de Google).

## Antes de enviar a revisión

- [ ] La URL abre sin login, en HTTPS, desde móvil y desde un país distinto al tuyo (usa una VPN o pide a alguien).
- [ ] Contiene el nombre del titular y un correo operativo (revísalo: te llegarán solicitudes y la revisión de Google puede escribirte).
- [ ] Coincide con lo que haces en `DATA_SAFETY.md` y con el SDK real del AAB.
- [ ] Mismo nombre de la app que en la ficha de la tienda.
