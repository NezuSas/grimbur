# Cómo activar el cobro (desbloqueo único)

El juego ya está **preparado para cobrar**, pero el cobro está **apagado**: con `GAME_CONFIG.monetization.enabled = false` todo está abierto, igual que siempre. Esta guía explica cómo pasar de "preparado" a "cobrando" sin sorpresas. Léela entera una vez antes de tocar nada.

## 1. Qué se vende

Decisión ya tomada (ver `docs/GAME_DESIGN.md`, sección Monetisation, y `docs/market-research-notes/monetization.md`):

| | Gratis para siempre | Pago único (~US$2,99 a 3,99) |
|---|---|---|
| Tutorial | sí | |
| Expedición pisos 1 a 3 | sí | |
| Reto diario | sí | |
| Expedición pisos 4 a 10 y el Wumpus | | sí |
| Modo Endless (descenso sin fin) | | sí |
| Forja, logros, ranking, héroes desbloqueables | sí (se ganan jugando) | |

Reglas: sin anuncios forzados, sin cajas de botín, nada que se compre da ventaja en el ranking. La pantalla de compra lo dice y **hay que cumplirlo**.

## 2. Cómo está construido (para saber qué tocar)

- `src/config/gameConfig.ts` → `monetization`: `enabled`, `freeFloors` (3), `productId` (`wumpus_full_game`), `fallbackPrice`, `termsUrl`, `privacyUrl`.
- `src/core/entitlements/gating.ts`: reglas puras (`isFloorLocked`, `isModeLocked`, `shouldGateDescent`), con tests en `tests/engine/entitlements.test.ts`.
- `src/services/entitlements.ts`: la **fachada** de compras (como `analytics.ts`). El juego nunca habla con un SDK de tienda; habla con un `PurchaseProvider`. Hoy hay dos: `NullProvider` (sin tienda: la pantalla dice "aún no disponible") y `LocalTestProvider` (solo `__DEV__`, concede el desbloqueo tras un segundo).
- `src/state/entitlements/store.ts`: guarda `fullUnlocked` en el dispositivo (AsyncStorage).
- `src/screens/PaywallScreen.tsx`: la pantalla de compra (comprar, **restaurar compras siempre visible**, "no, gracias", enlaces legales).
- Dónde actúa el bloqueo: la tarjeta Endless de la portada (candado, abre la pantalla de compra) y, en la expedición, al terminar el piso `freeFloors` (tarjeta de piso superado, luego la pantalla de compra; si se rechaza, el run se guarda y se muestra "Demo completada" con el botón "Continuar la expedición").

Probar sin tienda (solo desarrollo):
1. En el navegador del arnés: `http://localhost:8081/?screen=CoverScreen&preset=veteran&monetization=on` (añade `&owned=1` para simular que ya compró).
2. Para ver todo el flujo con compra simulada: pon `dev.localPurchases: true` en `gameConfig.ts` y `monetization.enabled: true` (solo en tu copia; **no lo subas así**). En Expo Go el botón "Desbloquear" concederá el desbloqueo a los 0,9 s.

## 3. Elegir SDK de compras

**Expo Go no puede hacer compras reales.** Las compras necesitan código nativo, así que hace falta un *development build* (`eas build --profile development --platform android`) o el build de producción. Opciones:

| | RevenueCat (`react-native-purchases`) | `react-native-iap` / Play Billing directo |
|---|---|---|
| Esfuerzo | Bajo: unas 40 líneas, él gestiona reconocimiento (acknowledge), reintentos y restauración | Medio-alto: tú gestionas `acknowledge` (si no, Google reembolsa a los 3 días), pendientes, errores |
| Servidor | No necesitas el tuyo; RevenueCat valida con Google | Idealmente validar tú en un servidor |
| Coste | Gratis hasta US$2.500 de ingresos mensuales; luego ~1 % | Gratis |
| Panel (ventas, reembolsos) | Sí | No |
| Dependencia | Un tercero más (declararlo en privacidad y Data safety) | Ninguna extra |
| iOS después | Mismo código | Otra implementación (StoreKit) |

**Recomendación: RevenueCat.** Para un solo desarrollador, que el reconocimiento y la restauración los haga un servicio probado vale más que el 1 % a partir de US$2.500/mes. Si prefieres cero terceros, Play Billing directo (`react-native-iap`) también sirve con la misma fachada.

## 4. Crear el producto en Google Play Console (paso a paso)

Requisitos previos (ya en `RELEASE_CHECKLIST.md`): cuenta de desarrollador (25 USD), **perfil de pagos / cuenta de comerciante** con datos fiscales (Ecuador es país soportado para recibir pagos; consulta a tu contador por RUC, IVA de servicios exportados y formulario W-8BEN), y la app creada.

1. **Sube un build con la librería de facturación** a una pista de pruebas (interna o cerrada). Play Console solo deja crear productos cuando existe un APK/AAB con el permiso `com.android.vending.BILLING`. (Al instalar `react-native-purchases` o `react-native-iap` se añade solo.)
2. Play Console → tu app → **Monetizar con Play → Productos → Productos únicos** (*One-time products*).
3. **Crear producto**:
   - ID del producto: `wumpus_full_game` (debe ser exactamente `GAME_CONFIG.monetization.productId`; **no se puede cambiar después**).
   - Nombre: "Juego completo" / Descripción: "Pisos 4 a 10, el Wumpus y el modo Endless. Pago único, sin anuncios."
4. **Opción de compra** (purchase option): tipo "Comprar" (compra única, **no consumible**: el jugador la conserva para siempre). Precio base: US$3,99 (o 2,99). Google convierte al resto de países; revisa los precios regionales (LatAm suele convenir bajarlos a mano).
5. **Activar** el producto.
6. Si usas **RevenueCat**: crea cuenta y proyecto, conecta Google Play (cuenta de servicio con permisos de finanzas/pedidos; la guía de RevenueCat lo explica), importa el producto, crea el **Entitlement** `full_game`, un **Offering** `default` con un paquete "lifetime" apuntando a `wumpus_full_game`, y copia la **API key pública de Android** (`goog_...`).

## 5. `PurchaseProvider` listo para pegar (RevenueCat)

**No va en la app todavía.** Instala primero: `npx expo install react-native-purchases` y construye con EAS (development build). Crea `src/services/revenueCatProvider.ts`:

```ts
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import type { PurchaseProvider, ProductInfo, PurchaseOutcome, RestoreOutcome } from './entitlements';

const API_KEY = 'goog_XXXXXXXXXXXXXXXX'; // clave PÚBLICA de Android de RevenueCat (no es secreta)
const ENTITLEMENT = 'full_game';

const owns = (info: CustomerInfo) => info.entitlements.active[ENTITLEMENT] !== undefined;

export class RevenueCatProvider implements PurchaseProvider {
  readonly name = 'revenuecat';
  readonly available = true;
  private pkg: PurchasesPackage | null = null;

  async init() {
    Purchases.configure({ apiKey: API_KEY });
    const info = await Purchases.getCustomerInfo(); // owned=false aquí también retira un desbloqueo reembolsado
    return { owned: owns(info) };
  }

  async getProduct(): Promise<ProductInfo | null> {
    const offerings = await Purchases.getOfferings();
    this.pkg = offerings.current?.lifetime ?? offerings.current?.availablePackages[0] ?? null;
    return this.pkg ? { price: this.pkg.product.priceString, title: this.pkg.product.title } : null;
  }

  async purchase(): Promise<PurchaseOutcome> {
    try {
      if (!this.pkg) await this.getProduct();
      if (!this.pkg) return { status: 'unavailable' };
      const { customerInfo } = await Purchases.purchasePackage(this.pkg);
      return owns(customerInfo) ? { status: 'success' } : { status: 'error', message: 'not entitled' };
    } catch (e) {
      const err = e as { userCancelled?: boolean; message?: string };
      return err.userCancelled ? { status: 'cancelled' } : { status: 'error', message: err.message };
    }
  }

  async restore(): Promise<RestoreOutcome> {
    try {
      const info = await Purchases.restorePurchases();
      return { status: owns(info) ? 'restored' : 'nothing' };
    } catch {
      return { status: 'error' };
    }
  }

  addListener(listener: (event: { owned: boolean }) => void) {
    const handler = (info: CustomerInfo) => listener({ owned: owns(info) });
    Purchases.addCustomerInfoUpdateListener(handler);
    return () => Purchases.removeCustomerInfoUpdateListener(handler);
  }
}
```

Y conéctalo una sola vez, **antes** de `initEntitlements()`, en `App.tsx` (junto a los imports de `entitlements`):

```ts
import { setPurchaseProvider } from './src/services/entitlements';
import { RevenueCatProvider } from './src/services/revenueCatProvider';
import { Platform } from 'react-native';

if (Platform.OS === 'android') setPurchaseProvider(new RevenueCatProvider());
```

### Variante Play Billing directo (`react-native-iap`), esquema

Misma interfaz: `init` → `initConnection()` + `getAvailablePurchases()` (¿está `wumpus_full_game`?); `getProduct` → `fetchProducts({ skus: [productId], type: 'in-app' })` y `displayPrice`; `purchase` → `requestPurchase(...)` y, al recibir la compra en `purchaseUpdatedListener`, **`finishTransaction({ purchase, isConsumable: false })`** (esto hace el *acknowledge*; sin él Google reembolsa en 3 días); `restore` → `getAvailablePurchases()`. Los nombres exactos cambian entre versiones: sigue la documentación de la versión que instales.

## 6. Probar sin gastar dinero

1. Play Console → **Configuración → Pruebas de licencia**: añade los correos Gmail de tus probadores. Sus compras son de prueba (tarjeta de prueba, no cobran; se cancelan solas a los pocos minutos).
2. Añade esos mismos correos a la **pista de pruebas cerrada/interna** y que instalen **desde el enlace de Play Store** (no por `adb`: la facturación solo funciona con la app instalada desde Play).
3. Casos a probar: comprar y que se desbloquee; cancelar el diálogo (mensaje "compra cancelada", nada se cobra); sin conexión (precio de reserva, mensaje de error, **el juego gratis sigue funcionando**); desinstalar, reinstalar y **Restaurar compras**; otro teléfono con la misma cuenta Google; reembolso (ver sección 8).
4. Tu propio juego "pagado" en un teléfono: con el correo en pruebas de licencia puedes volver a comprar tras reembolsar desde Play Console (Pedidos).

## 7. Cómo encender el cobro

1. Sección 4 completa (producto activo) y proveedor pegado (sección 5) y probado en pista cerrada.
2. `src/config/gameConfig.ts`:
   - `monetization.enabled: true`
   - `termsUrl` y `privacyUrl`: las URL reales (hoy son `example.com`). **Sin ellas no publiques.**
   - `fallbackPrice`: el mismo precio que pusiste en Play.
   - `dev.localPurchases` debe seguir en `false`.
3. `npm run typecheck && npx jest`, y un build de producción: `eas build -p android --profile production`.
4. Subir primero a la pista interna, probar con un probador de licencia, y solo después a producción.

Para apagar el cobro (emergencia): `enabled: false` y nueva versión; los que ya compraron no pierden nada y todos tienen todo abierto.

**Decisión pendiente (jugadores que ya existen):** quien ya jugó los pisos 4+ antes de activar el cobro perdería acceso. Si hay jugadores reales antes del lanzamiento de pago, considera dejar `enabled: false` hasta que el cobro salga en la **primera** publicación, o conceder el desbloqueo a quien tenga `stats.bestLevel >= 4` (regalo de "fundador"). Si el cobro va desde el primer lanzamiento público, no hay nada que decidir.

## 8. Reembolsos y restauración

- Google permite reembolso automático dentro de ~2 horas desde la app y tú puedes reembolsar desde Play Console → Pedidos. El reembolso revoca el derecho.
- Al abrir el juego, `initEntitlements()` pregunta a la tienda: si responde "no es dueño", se retira el desbloqueo (el progreso, ranking y Forja se conservan). El `NullProvider` nunca retira nada.
- **Restaurar compras** está siempre visible en la pantalla de compra (Google lo exige a efectos prácticos y los jugadores lo esperan): cubre reinstalaciones y teléfono nuevo con la misma cuenta de Google.
- Si el jugador compra desde la pantalla "Demo completada", la expedición **continúa donde estaba**. Esa partida se guardó una vez como demo y se vuelve a guardar al terminar de verdad (cuenta como dos partidas jugadas en estadísticas; es un detalle conocido y menor).

## 9. Privacidad y Data safety: qué revisar antes de cobrar

Con un SDK de compras cambian los datos que se tratan. Antes de publicar:

- `docs/release/PRIVACY_POLICY.md`: añade que las compras las procesa **Google Play** (y **RevenueCat**, si lo usas), qué reciben (identificador de usuario anónimo, historial de compras, identificador de dispositivo/app) y para qué (validar y restaurar la compra). Incluye contacto para solicitudes de datos.
- `docs/release/DATA_SAFETY.md` y el formulario de Play Console → Seguridad de los datos: declara **Información financiera → Historial de compras** (recopilado, para funcionalidad de la app, **no** compartido con fines publicitarios) y, con RevenueCat, **Identificadores de dispositivo o de otro tipo**. Marca que los datos viajan cifrados.
- Publica la política y los términos en una URL pública y pon esas URL en la ficha de Play, en la app (`termsUrl`/`privacyUrl`) y en la política misma.
- Ficha de la tienda: marca "Contiene compras directas desde la aplicación" y actualiza la descripción (qué es gratis y qué es de pago, sin anuncios).
- Si el SDK añade permisos o la versión cambia el SDK objetivo, repasa `RELEASE_CHECKLIST.md` ("Before every release").

## 10. Lista previa al cobro

- [ ] Producto `wumpus_full_game` creado y **activo** en Play Console; precio y países revisados.
- [ ] Perfil de pagos y datos fiscales completos (contador consultado: RUC, IVA, W-8BEN).
- [ ] Proveedor real pegado; `setPurchaseProvider(...)` llamado antes de `initEntitlements()`.
- [ ] Probado con licencia de pruebas: compra, cancelación, sin conexión, reinstalar + restaurar, reembolso.
- [ ] `termsUrl` y `privacyUrl` reales; política de privacidad y Data safety actualizadas.
- [ ] `monetization.enabled: true`, `dev.localPurchases: false`, `fallbackPrice` = precio de Play.
- [ ] Texto de la ficha de Play honesto sobre qué es gratis y qué es de pago.
- [ ] `npm run typecheck`, `npx jest`, `npx expo-doctor` en verde; build de producción instalado desde Play (pista interna).
- [ ] Decidido qué pasa con jugadores previos (sección 7).
- [ ] Revisión final del gancho: tras superar el piso 3 aparece la pantalla de compra; "No, gracias" lleva a "Demo completada"; Endless muestra candado; el reto diario sigue gratis.
