# Activos de tienda: requisitos, estado real y lo que falta

Medido el 2026-10-14 sobre los archivos reales de `assets/` (script al final). Requisitos de Google Play y Apple tal como los conocemos; **verifica las cifras en Play Console / App Store Connect al subir**, porque las tiendas las cambian.

## 1. Requisitos exactos

### Google Play

| Activo | Requisito | Obligatorio |
| --- | --- | --- |
| Icono de la app | **512 x 512 px**, PNG de 32 bits (con alfa), máx. **1024 KB**; cuadrado completo, sin esquinas redondeadas ni sombra (Play aplica su máscara) | Sí |
| Gráfico de funciones | **1024 x 500 px**, JPEG o PNG de 24 bits (sin alfa), máx. 15 MB | Sí |
| Capturas de teléfono | **2 a 8**, JPEG o PNG de 24 bits, lado mínimo 320 px y máximo 3840 px, el lado largo no puede superar 2x el corto. Horizontal recomendado aquí: **1920 x 1080** (16:9). Para optar a promoción, se recomienda 1080 px o más en el lado corto | Sí (mín. 2) |
| Capturas de tableta 7" y 10" | Hasta 8 cada una, mismas reglas de formato. Recomendadas porque la app es compatible con tabletas (`ios.supportsTablet`; en Android no hay restricción) | No, pero mejora la calidad percibida en tabletas |
| Vídeo promocional | URL de YouTube pública o no listada, sin restricción de edad ni monetización con anuncios, horizontal | No |
| Icono adaptativo (dentro de la app) | Primer plano 1024 x 1024 transparente con el motivo en el centro (zona segura ~66 %); fondo de color | Sí (ya configurado en `app.json`) |

### Apple App Store (si publicas en iOS)

| Activo | Requisito |
| --- | --- |
| Icono 1024 x 1024 | PNG sin alfa, sin esquinas redondeadas |
| iPhone 6.9" | Apaisado **2868 x 1320** (o la medida que muestre App Store Connect), 1-10 capturas |
| iPhone 6.5" | Apaisado **2778 x 1284** si no usas las de 6.9" |
| iPad 13" | Apaisado **2752 x 2064** (o 2732 x 2048 para 12.9") porque `supportsTablet: true` |
| Vista previa de la app | Opcional, 15-30 s |

## 2. Qué archivos de `assets/` cumplen qué

| Archivo | Tamaño real | Formato | Cumple | Notas |
| --- | --- | --- | --- | --- |
| `assets/icon.png` | **1024 x 1024** | 24 bits, sin alfa, 820 KB | Icono de app en Expo; icono App Store 1024 (sin alfa) | Es la cabeza del monstruo violeta con tres ojos rojos y una gema cian sobre un degradado índigo. Original, sin parecido con la mascota de Discord. Sirve de base para el icono de Play |
| `assets/adaptive-icon.png` | **1024 x 1024** | 32 bits con alfa, 520 KB | Icono adaptativo Android (primer plano) | Motivo dentro del 62 % central (script `buildAppIcons.py`); fondo `#140F2A` en `app.json` |
| `assets/emblem.png` | **1254 x 1254** | 32 bits con alfa, 1,6 MB | Fuente de iconos y del gráfico de funciones | Es el original transparente; el gráfico de funciones debería partir de este archivo |
| `assets/splash.png` | **768 x 768** | 32 bits con alfa, 636 KB | Pantalla de carga (plugin `expo-splash-screen`, fondo `#0E0B1F`) | El script `buildAppIcons.py` dice 1024; el archivo actual mide 768. Funciona; regenerar solo si se ve borroso en tabletas |
| `assets/splash-icon.png` | **1024 x 1024** | 32 bits, 17 KB | No se usa en `app.json` ni en el código | Resto de la plantilla; se puede borrar |
| `assets/favicon.png` | **256 x 256** | 24 bits, 79 KB | Favicon web | No es un requisito de tienda |
| `assets/laba.wav`, `assets/wumpa.wav` | - | audio | - | **Riesgo de IP.** No las referencia ningún código (`docs/ASSETS.md`), pero siguen dentro de `assets/` y `assetBundlePatterns: ["**/*"]` puede empaquetarlas en el APK/AAB. "Wumpa" es la fruta de *Crash Bandicoot*: **borrarlas antes del primer AAB** salvo que documentes su origen |
| `docs/release/store/icon-512.png` | **512 x 512** | 32 bits con alfa, 288 KB | **Icono de Play (512, <= 1024 KB)** | Generado hoy desde `assets/icon.png` con el script de la sección 4 |

## 3. Qué falta

| Falta | Prioridad | Cómo |
| --- | --- | --- |
| **Gráfico de funciones 1024 x 500** (ES y EN) | Bloquea la ficha | Briefing en `STORE_LISTING.md`. Hacerlo en Figma/Canva/Photopea con `assets/emblem.png`. Exportar PNG sin alfa |
| **Capturas de teléfono 1920 x 1080** (mín. 2, ideal 8) en ES y EN | Bloquea la ficha | Guion con escenas y textos en `STORE_LISTING.md`. Tomarlas de un teléfono real con `adb exec-out screencap -p > shot.png` (Android) y recortar a 16:9 |
| Capturas de tableta 7" y 10" | Recomendada | Mismas escenas en una tableta o en un emulador con perfil de tableta apaisada |
| Vídeo promocional (30-60 s) | Opcional | Grabación de pantalla (`adb shell screenrecord`), 4 escenas: pistas, deducción, reliquia, Grimbur; música original del juego; subir a YouTube |
| Icono 1024 sin alfa y capturas iPad/iPhone | Solo si hay iOS | Ver tabla de Apple; el icono ya existe |
| **Procedencia del arte** | **Bloquea la tienda en la práctica** | `docs/ASSETS.md` tiene casi todas las filas de sprites con "Source: ?". Documentar origen y licencia de cada sprite, icono y pista (el arte es generado con IA según `docs/ART_PROMPTS.md`; guarda los prompts, la herramienta y las fechas). Además: el historial de git contiene imágenes de Mario/Luigi/Pokémon de los primeros commits; **no hagas público el repositorio del juego** (por eso la política va en un repo aparte, `HOSTING_PRIVACY_POLICY.md`) |
| Prueba de licencia del arte y audio | Recomendado | `docs/ASSETS.md` con origen y licencia de cada sprite, pista y efecto (el arte es generado con IA según `docs/ART_PROMPTS.md`; guarda los prompts y las fechas) |
| Imagen o texto para redes (1200 x 630) | Para `LAUNCH_PLAN.md` | Reutilizar el gráfico de funciones |

## 4. Script para medir los archivos y generar el icono de 512

PowerShell (mide todas las imágenes):

```powershell
Add-Type -AssemblyName System.Drawing
Get-ChildItem assets -Filter *.png | ForEach-Object {
  $i = [System.Drawing.Image]::FromFile($_.FullName)
  "{0} {1}x{2} {3} {4}KB" -f $_.Name, $i.Width, $i.Height, $i.PixelFormat, [math]::Round($_.Length/1KB)
  $i.Dispose()
}
```

Python (icono de Play de 512 desde el de 1024, con alfa):

```python
from PIL import Image
Image.open('assets/icon.png').convert('RGBA').resize((512, 512), Image.LANCZOS).save('docs/release/store/icon-512.png', optimize=True)
```

Comprobación de tamaño y peso de cualquier captura antes de subirla:

```python
from PIL import Image; import os, sys
for p in sys.argv[1:]:
    im = Image.open(p); print(p, im.size, im.mode, round(os.path.getsize(p)/1024), 'KB')
```

## 5. Lista final de subida (Play)

- [ ] Icono 512 (`docs/release/store/icon-512.png`).
- [x] Gráfico de funciones 1024 x 500 sin alfa: `docs/release/store/feature-graphic.png` (se regenera con `python scripts/makeFeatureGraphic.py`; el título lo dibuja el script con la tipografía del juego, así que al cambiar el nombre basta editar `TITLE`/`SUBTITLE`).
- [ ] 2-8 capturas de teléfono 16:9, ES y EN.
- [ ] (Opcional) capturas de tableta y vídeo de YouTube.
- [ ] Textos de `STORE_LISTING.md` con los `TODO(owner)` resueltos.
- [ ] Comprobar en "Vista previa de la ficha" que ningún texto superpuesto queda recortado.
