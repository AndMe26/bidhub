# Arquitectura y Explicación Técnica Detallada — BidHub

Este documento proporciona una explicación exhaustiva y explícita de cada área del sistema **BidHub**, cómo interactúan sus capas y cómo se garantizan las 20 reglas de negocio y los requisitos técnicos de la plataforma.

---

## Índice

1. [Estructura y Route Groups (`app/`)](#1-estructura-y-route-groups-app)
2. [Base de Datos y Modelo Relacional (`prisma/`)](#2-base-de-datos-y-modelo-relacional-prisma)
3. [Lógica de Estados Dinámicos sin Cron Jobs (`services/`)](#3-lógica-de-estados-dinámicos-sin-cron-jobs-services)
4. [Autenticación Segura y Manejo de Sesión (`lib/` y `components/`)](#4-autenticación-segura-y-manejo-de-sesión-lib-y-components)
5. [Route Handlers y Reglas de Negocio en Backend (`app/api/`)](#5-route-handlers-y-reglas-de-negocio-en-backend-appapi)
6. [Seguridad Perimetral y Control de Historial (`proxy.ts`)](#6-seguridad-perimetral-y-control-de-historial-proxyts)
7. [Frontend, Estrategias de Renderizado y UX](#7-frontend-estrategias-de-renderizado-y-ux)
8. [DevOps, Pruebas Automatizadas y CI/CD](#8-devops-pruebas-automatizadas-y-cicd)

---

## 1. Estructura y Route Groups (`app/`)

Next.js 16 (App Router) permite agrupar rutas mediante carpetas entre paréntesis: `(nombre)`. Estas carpetas organizan la aplicación **sin alterar la URL visible en el navegador**, permitiendo que cada área tenga su propio layout y ciclo de vida:

### `app/(public)/`
- **Rutas asociadas:** `/` (Home), `/auctions` (Catálogo), `/auctions/[id]` (Detalle).
- **Layout:** Incluye `Navbar` y `Footer`.
- **Propósito:** Acceso público universal. Permite a cualquier visitante navegar, filtrar y revisar subastas e historiales sin necesidad de iniciar sesión.

### `app/(auth)/`
- **Rutas asociadas:** `/login` y `/register`.
- **Layout:** Diseño centrado, minimalista y libre de distracciones, sin barras de navegación complejas.
- **Propósito:** Procesos de ingreso y creación de cuenta.

### `app/(private)/`
- **Rutas asociadas:** `/dashboard` (Mis subastas y Mis ofertas) y `/publish` (Publicar/Editar artículo).
- **Layout:** Navbar con menú de usuario activo y contenedor optimizado para paneles de control.
- **Propósito:** Espacio personal exclusivo para usuarios autenticados.

### `app/(admin)/`
- **Rutas asociadas:** `/admin`.
- **Layout:** Barra distintiva de moderador en color ámbar/dorado.
- **Propósito:** Gestión de categorías y moderación de subastas activas. Exclusivo para usuarios con rol `ADMIN`.

---

## 2. Base de Datos y Modelo Relacional (`prisma/`)

La base de datos es **PostgreSQL** alojada en Supabase y administrada con el ORM tipado **Prisma Client**:

```prisma
enum Role {
  USER
  ADMIN
}
```

- **`User`:**
  - `id`: Identificador CUID.
  - `name`, `email` (único indexado).
  - `passwordHash`: Hasheado mediante `bcryptjs` con 10 rondas de salt.
  - `role`: Rol del usuario (`USER` por defecto, `ADMIN` generado por seed).
  - `refreshTokenHash`: Almacena el hash SHA-256 del refresh token activo para permitir revocación inmediata en logout.

- **`Category`:**
  - `id`, `name`, `slug` (único indexado para URLs amigables).

- **`Auction`:**
  - `id`, `title`, `description`, `imageUrl`.
  - `initialPrice` y `minIncrement`: Tipo `Decimal(12, 2)` para precisión financiera exacta.
  - `closesAt`: Fecha y hora de finalización (con índice para consultas rápidas).
  - `isCancelled`: Booleano (default `false`).
  - `cancelReason`: Texto opcional donde se guarda el motivo si es cancelada por el vendedor o el admin.
  - Relaciones con `User` (vendedor) y `Category`.

- **`Bid`:**
  - `id`, `amount` (`Decimal(12, 2)`), `createdAt`.
  - Relaciones con `Auction` y `User` (postor).
  - Índices compuestos `[auctionId, amount]` para ordenar ofertas al instante.

### Configuración de Conexiones
- **`DATABASE_URL` (Puerto 6543):** Conexión con pooling (PgBouncer en modo transacción) optimizada para el tráfico web concurrente en Vercel.
- **`DIRECT_URL` (Puerto 5432):** Conexión directa a PostgreSQL para migraciones (`prisma migrate`) y scripts CLI (`seed.ts`).

---

## 3. Lógica de Estados Dinámicos sin Cron Jobs (`services/`)

Las **Reglas #12 y #13** exigen que el estado de una subasta sea exacto en cualquier milisegundo de consulta, **sin depender de cron jobs, lambdas programadas ni tareas periódicas** que puedan fallar o retrasarse.

En `services/auction-status.ts`:
```ts
export function getAuctionStatus(
  auction: { isCancelled: boolean; closesAt: Date },
  bidsCount: number,
  now: Date = new Date()
): "ACTIVE" | "CLOSED" | "DESERTED" | "CANCELLED" {
  if (auction.isCancelled) return "CANCELLED";
  if (new Date(auction.closesAt).getTime() > now.getTime()) return "ACTIVE";
  if (bidsCount > 0) return "CLOSED";
  return "DESERTED";
}
```

1. **`CANCELLED`:** Si `isCancelled === true` (inmutable tras la cancelación).
2. **`ACTIVE`:** Si no está cancelada y `closesAt > now`.
3. **`CLOSED`:** Si ya pasó la fecha de cierre (`closesAt <= now`) y tiene al menos una oferta (`bidsCount > 0`). El ganador es la oferta más alta.
4. **`DESERTED`:** Si ya pasó la fecha de cierre y no recibió ninguna oferta (`bidsCount === 0`).

Toda la aplicación reutiliza esta misma función matemática tanto en listados como en detalle y transacciones de puja.

---

## 4. Autenticación Segura y Manejo de Sesión (`lib/` y `components/`)

Cumple con el estándar de no exponer tokens en `localStorage`:

1. **Tokens Criptográficos con `jose`:**
   - **`access_token`:** Vida corta (15 minutos). Firmado con `JWT_ACCESS_SECRET`.
   - **`refresh_token`:** Vida larga (7 días). Firmado con `JWT_REFRESH_SECRET`.

2. **Cookies Seguras (`lib/cookies.ts`):**
   - Ambos tokens se envían y almacenan exclusivamente en cookies con:
     - `httpOnly: true` (inaccesibles para JavaScript en el navegador, protege contra ataques XSS).
     - `secure: true` en producción (solo viajan por túneles HTTPS).
     - `sameSite: "lax"` (protege contra ataques CSRF).
     - `path: "/"` (válidas para toda la aplicación).

3. **Revocación por Hash en BD:**
   - Al iniciar sesión, se calcula el hash SHA-256 del `refresh_token` (`lib/token-hash.ts`) y se almacena en la tabla `User`.
   - Cuando el usuario solicita un nuevo token (`POST /api/auth/refresh`), se lee la cookie y se compara el hash criptográfico contra la base de datos con `timingSafeEqual`.
   - Al cerrar sesión (`POST /api/auth/logout`), se establece `refreshTokenHash = null` en la base de datos y se eliminan las cookies, revocando la sesión definitivamente.

4. **Eliminación de Parpadeos (`components/auth-provider.tsx`):**
   - El contexto global `AuthProvider` valida la sesión una vez y la conserva en memoria reactiva.
   - Cuando el usuario navega entre páginas o retrocede con el historial, el `Navbar` conoce el estado de sesión en 0 milisegundos, erradicando por completo el "destello" de botones.

---

## 5. Route Handlers y Reglas de Negocio en Backend (`app/api/`)

Todas las validaciones están garantizadas a nivel de servidor con esquemas `zod`:

### Ofertas y Anti-sniping (`app/api/auctions/[id]/bids/route.ts`)
- **Transacción Atómica (`prisma.$transaction`):** Garantiza que dos ofertas concurrentes en el mismo milisegundo se procesen secuencialmente sin sobreescrituras corruptas.
- **Regla #6:** Rechaza la oferta si `auction.sellerId === session.sub` (no se puede ofertar en subastas propias).
- **Regla #7:** Valida que el estado calculado sea estrictamente `ACTIVE`.
- **Regla #8:** Si es la primera oferta, `monto >= initialPrice`. Si ya hay ofertas, `monto >= ofertaActual + minIncrement`.
- **Regla #9:** Si el usuario autenticado ya es el autor de la oferta más alta, rechaza con `409 Conflict`.
- **Regla #10:** Las ofertas no admiten endpoints de edición ni borrado.
- **Regla #11 (Anti-sniping):** Si faltan 5 minutos o menos para el cierre (`closesAt - now <= 5 minutos`), la transacción ejecuta:
  ```ts
  newClosesAt = new Date(auction.closesAt.getTime() + 5 * 60 * 1000);
  await tx.auction.update({ where: { id }, data: { closesAt: newClosesAt } });
  ```
  Esto extiende el tiempo 5 minutos más, repitiéndose cuantas veces sea necesario.

### Privacidad del Historial (`app/api/auctions/[id]/bids/route.ts`)
- **Regla #18:** El historial público utiliza `maskName()` (`lib/mask.ts`) para transformar nombres como `"Ana Torres"` en `"Ana***"`, protegiendo la identidad de los postores.
- **Regla #20 (`/api/bids/me`):** Devuelve exclusivamente el listado de ofertas pertenecientes al usuario autenticado.

### Publicación, Edición y Cancelación de Subastas
- **Regla #1:** Precios e incrementos deben ser mayores a cero.
- **Regla #2:** `closesAt` validado en un rango estricto de entre 1 hora y 7 días desde el momento actual.
- **Regla #3:** La categoría debe existir en la base de datos.
- **Regla #4:** El vendedor no puede tener más de 5 subastas activas al mismo tiempo (`409 Conflict`).
- **Reglas #5 y #14:** La edición y la cancelación por el vendedor solo están permitidas si la subasta está activa y tiene **cero ofertas**.
- **Regla #19:** Solo el dueño legítimo puede editar o cancelar su subasta.

### Moderación de Administrador (`app/api/admin/auctions/[id]/cancel/route.ts`)
- **Reglas #15 y #16:** El administrador puede cancelar cualquier subasta activa (incluso con ofertas registradas).
- Exige obligatoriamente un campo `reason` (motivo de cancelación).
- La subasta **no se elimina físicamente** de la base de datos: se actualiza `isCancelled: true` y conserva todo su historial intacto.

### Categorías (`app/api/categories/[id]/route.ts`)
- **Regla #17:** Al intentar eliminar una categoría (`DELETE`), se verifica si tiene subastas asociadas. Si tiene al menos una, se bloquea devolviendo código HTTP `409 Conflict`.

---

## 6. Seguridad Perimetral y Control de Historial (`proxy.ts`)

Next.js 16 evalúa `proxy.ts` en el perímetro antes de ejecutar cualquier layout o componente:

1. **Rutas Privadas (`/dashboard`, `/publish`):** Si no hay sesión válida, redirige al usuario a `/login?from=...`.
2. **Rutas Admin (`/admin`):** Si el usuario no tiene `role === "ADMIN"`, se bloquea y redirige a `/dashboard`.
3. **Control Inverso de Historial:** Si un usuario con sesión activa intenta ingresar o retrocede con el navegador a `/login` o `/register`, el proxy lo intercepta y lo devuelve a `/dashboard`.
4. **`router.replace`:** Los formularios de login y registro usan `router.replace("/dashboard")` en lugar de `router.push`, evitando que la pantalla de autenticación quede apilada en el historial de navegación.

---

## 7. Frontend, Estrategias de Renderizado y UX

Cada página aplica la estrategia de renderizado adecuada:

| Vista | Ruta | Estrategia | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| **Home** | `app/(public)/page.tsx` | **SSG** | `force-static`. Pre-renderizada en el build para máxima velocidad y SEO. |
| **Catálogo** | `app/(public)/auctions/page.tsx` | **SSR** | `force-dynamic`. Consulta la base de datos en servidor en cada petición con filtros en tiempo real. |
| **Detalle** | `app/(public)/auctions/[id]/page.tsx` | **SSR** | `force-dynamic`. Precios, historial y estados actualizados en cada recarga. |
| **Dashboard** | `app/(private)/dashboard/page.tsx` | **CSR** | `"use client"`. Pestañas interactivas, cancelación reactiva y actualización sin recargar. |

### Componente de Hidratación Limpia (`components/auctions/auction-countdown.tsx`)
- **Requisito #10:** Para evitar el error de *Hydration Mismatch* entre el servidor y el navegador (causado por diferencias de milisegundos en la hora del sistema), el componente renderiza un estado inicial estable idéntico en SSR y cliente, y solo inicia el temporizador de cuenta regresiva tras montarse en el cliente con `useEffect`.

### Internacionalización (`components/i18n-provider.tsx`)
- **Requisito #9:** Soporte multilingüe completo (Español / Inglés) con diccionarios JSON en `messages/es.json` y `messages/en.json`.
- Selector accesible en el Navbar que conmuta los textos de forma instantánea y persiste la elección en `localStorage`.

### Optimización Visual
- **`next/image`:** Todas las imágenes se sirven optimizadas, con compresión automática, tamaños responsivos (`sizes`) y dominios remotos autorizados en `next.config.ts`.
- **Diseño Premium:** Estilos modernos en `app/globals.css` con estética Glassmorphism, paleta nocturna curada (Slate/Navy) y micro-interacciones hover.

---

## 8. DevOps, Pruebas Automatizadas y CI/CD

1. **Docker Multi-etapa (`Dockerfile`):**
   - Etapa `deps`: Instala dependencias con `npm ci`.
   - Etapa `builder`: Genera cliente Prisma (`npx prisma generate`) y compila Next.js en modo `standalone`.
   - Etapa `runner`: Imagen Alpine mínima sin herramientas de compilación, ejecutada con usuario no root (`nextjs`) en el puerto 3000.
   - `docker-compose.yml`: Archivo listo para levantar el contenedor con variables de entorno.

2. **Pruebas Automatizadas (`test/business-rules.test.ts`):**
   - Ejecutables mediante `npm test` con el test runner nativo de Node.js.
   - Valida formalmente los 4 estados dinámicos (Regla #12) y la extensión anti-sniping de +5 minutos (Regla #11). Pasa 6/6 pruebas.

3. **Pipeline de Integración Continua (`.github/workflows/ci.yml`):**
   - En cada push o pull request ejecuta automáticamente:
     - Instalación limpia (`npm ci`).
     - Generación de Prisma (`npx prisma generate`).
     - Verificación estricta de TypeScript (`npx tsc --noEmit`).
     - Ejecución de pruebas unitarias (`npm test`).
     - Build de producción (`npm run build`).

4. **Despliegue Productivo en Vercel:**
   - Conectado a Supabase en producción con integración continua y variables de entorno seguras.
   - **URL pública:** [https://bidhub-ksomhye5m-n-5937.vercel.app](https://bidhub-ksomhye5m-n-5937.vercel.app)
