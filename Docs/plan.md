# Plan de Desarrollo: BidHub (Next.js 16 Fullstack)

Este documento detalla el plan de trabajo estructurado por fases para construir **BidHub**, cumpliendo con todos los requisitos técnicos y las 20 reglas de negocio especificadas.

---

## Fase 1: Configuración Inicial y Estructura del Proyecto

1. **Inicialización del repositorio y entorno:**
   - Crear el proyecto con **Next.js 16** utilizando **App Router** y **TypeScript estricto** (`"strict": true` en `tsconfig.json`, prohibido el uso de `any`).
   - Configurar las variables de entorno creando el archivo `.env` y la plantilla `.env.example` con las claves requeridas:
     ```env
     DATABASE_URL=
     JWT_ACCESS_SECRET=
     JWT_REFRESH_SECRET=
     ACCESS_TOKEN_EXPIRES_IN=15m
     REFRESH_TOKEN_EXPIRES_IN=7d
     ```
2. **Estructura de carpetas y Route Groups:**
   - Organizar el directorio `app/` usando los *route groups* solicitados para no afectar la URL:
     - `app/(public)/`: Home (`/`) y Catálogo (`/auctions`, `/auctions/[id]`) con layout de navbar y footer.
     - `app/(auth)/`: `/login` y `/register` con layout centrado y simple.
     - `app/(private)/`: `/dashboard` (mis subastas y mis ofertas) y `/publish` con layout de navbar y menú de usuario.
     - `app/(admin)/`: `/admin` con layout propio del panel de administración.
   - Crear carpetas modulares para:
     - `components/ui`, `components/layout`, `components/auctions` (componentes reutilizables).
     - `lib/` (configuración de base de datos, utilidades JWT, helpers de respuesta HTTP).
     - `services/` (lógica de negocio pura y validaciones).
     - `i18n/` o `messages/` (diccionarios en español e inglés).

---

## Fase 2: Base de Datos, ORM y Semilla (Seed)

1. **Aprovisionamiento en Supabase:**
   - Crear un proyecto en **Supabase** y obtener las cadenas de conexión para PostgreSQL (`DATABASE_URL` y `DIRECT_URL` si se usa Prisma con connection pooling).
2. **Modelado de Datos (ORM a elección, ej. Prisma o Drizzle):**
   - **User:** `id`, `name`, `email` (único), `passwordHash`, `role` (`USER` | `ADMIN`), `refreshTokenHash` (nullable para revocación en logout), `createdAt`.
   - **Category:** `id`, `name`, `slug` (único).
   - **Auction:** `id`, `title`, `description`, `imageUrl`, `initialPrice`, `minIncrement`, `createdAt`, `closesAt`, `isCancelled` (booleano, default `false`), `cancelReason` (nullable, para moderación), `sellerId` (FK User), `categoryId` (FK Category).
   - **Bid:** `id`, `amount`, `createdAt`, `auctionId` (FK Auction), `bidderId` (FK User).
3. **Estrategia para las Reglas de Negocio #12 y #13 (Estado dinámico sin Cron Jobs):**
   - Para garantizar que el estado sea exacto en cualquier momento sin procesos externos ni tareas programadas, implementar una función evaluadora en tiempo de consulta:
     - Si `isCancelled === true` $\rightarrow$ **Cancelada** (`CANCELLED`).
     - Si `closesAt > ahora` $\rightarrow$ **Activa** (`ACTIVE`).
     - Si `closesAt <= ahora` y `bids.length > 0` $\rightarrow$ **Cerrada** (`CLOSED` — ganador = autor de la oferta más alta).
     - Si `closesAt <= ahora` y `bids.length === 0` $\rightarrow$ **Desierta** (`DESERTED`).
4. **Migraciones y Seed:**
   - Ejecutar las migraciones hacia Supabase.
   - Programar el script de *seed* que inserte:
     - El usuario **Administrador** (única vía de creación de este rol).
     - Usuarios estándar de prueba (vendedores y postores).
     - Categorías iniciales (Cartas, Relojes, Vinilos, Figuras, etc.).
     - Subastas de ejemplo en los **4 estados** (activas con cierre futuro, cerradas con fecha pasada y ofertas, desiertas con fecha pasada sin ofertas, y canceladas).

---

## Fase 3: Autenticación, Seguridad y Proxy

1. **Utilidades Criptográficas y JWT:**
   - Implementar el hasheo de contraseñas y de *refresh tokens* (con `bcryptjs` o `argon2`).
   - Configurar la firma y verificación de `access_token` y `refresh_token` con `jose` (compatible con el runtime de Next.js `proxy.ts`).
2. **Route Handlers de Autenticación (`app/api/auth/...`):**
   - `POST /api/auth/register`: Valida datos, hashea contraseña y crea usuario con rol `USER`.
   - `POST /api/auth/login`: Verifica credenciales, genera ambos tokens, guarda el hash del *refresh token* en la BD y los envía exclusivamente en cookies `httpOnly`, `secure` y `sameSite`.
   - `POST /api/auth/refresh`: Lee la cookie del *refresh token*, verifica su validez y compara su hash con el almacenado en la BD; si coincide, emite un nuevo `access_token` en cookie.
   - `POST /api/auth/logout`: Elimina el `refreshTokenHash` en la BD para revocar la sesión y limpia las cookies.
3. **Protección de Rutas (`proxy.ts` y Backend):**
   - Configurar `proxy.ts` (convención de Next.js 16) para interceptar peticiones a rutas privadas (`/dashboard`, `/publish`) y de administrador (`/admin`), redirigiendo a `/login` si no hay sesión o bloqueando el acceso a `/admin` si el rol no es `ADMIN`.
   - Crear un helper de autorización (`requireAuth`, `requireAdmin`) para que **todos los Route Handlers** validen la sesión y el rol por su cuenta, sin depender únicamente del proxy.

---

## Fase 4: Backend — Route Handlers y Reglas de Negocio

Todos los endpoints deben validar la entrada (ej. con `zod`) y responder con un formato de error consistente y códigos HTTP exactos (`400`, `401`, `403`, `404`, `409`).

1. **Categorías (`app/api/categories/...`):**
   - `GET`: Público, lista todas las categorías.
   - `POST`, `PUT`, `DELETE`: Solo `ADMIN`.
   - **Regla #17:** En `DELETE`, verificar si existen subastas asociadas a la categoría; si existen, devolver `409 Conflict`.
2. **Subastas (`app/api/auctions/...`):**
   - `GET`: Lista subastas con filtros por categoría y por estado calculado en tiempo real.
   - `GET /[id]`: Detalle de la subasta e historial de ofertas.
     - **Regla #18:** Enmascarar el nombre/correo de los postores en el historial público (ej. mostrar un alias parcial como `ju***` o `Juan P.`).
   - `POST`: Crear subasta (usuario autenticado). Validar en backend:
     - **Regla #1:** `initialPrice > 0` y `minIncrement > 0`.
     - **Regla #2:** `closesAt` debe estar entre **1 hora y 7 días** a partir del momento de creación.
     - **Regla #3:** `categoryId` debe corresponder a una categoría existente (`404` o `400` si no existe).
     - **Regla #4:** El vendedor puede tener máximo **5 subastas activas** (`!isCancelled` y `closesAt > ahora`) al mismo tiempo (`409 Conflict` si ya tiene 5).
   - `PUT /[id]`: Editar subasta. Validar:
     - **Regla #19:** El usuario autenticado debe ser el vendedor dueño de la subasta (`403 Forbidden` si es otro usuario).
     - **Regla #5:** Solo se puede editar mientras esté **activa** y **no tenga ofertas** (`409 Conflict` si ya tiene ofertas o cerró).
   - `PATCH /[id]/cancel` (o `DELETE`): Cancelar subasta por el vendedor. Validar:
     - **Regla #19:** Solo el dueño puede cancelarla.
     - **Regla #14 y #16:** Solo se puede cancelar si está activa y **no tiene ofertas**; cambia su estado a cancelada sin eliminar el registro de la BD.
3. **Ofertas (`app/api/auctions/[id]/bids` y `app/api/bids/me`):**
   - `POST`: Crear oferta dentro de una **transacción de base de datos** (previene condiciones de carrera):
     - **Regla #7:** Verificar que la subasta esté **activa** (`!isCancelled` y `closesAt > ahora`).
     - **Regla #6:** Verificar que `bidderId !== sellerId` (`403` o `400`, no puede ofertar en su propia subasta).
     - **Regla #9:** Verificar que el usuario no sea ya el autor de la oferta más alta actual (`409 Conflict`).
     - **Regla #8:** Si es la primera oferta, `amount >= initialPrice`. Si ya hay ofertas, `amount >= maxBid + minIncrement`.
     - **Regla #11 (Anti-sniping):** Si `closesAt - ahora <= 5 minutos`, actualizar `closesAt = closesAt + 5 minutos` dentro de la misma transacción.
     - **Regla #10:** No exponer endpoints de edición ni eliminación de ofertas.
   - `GET /api/bids/me`:
     - **Regla #20:** Devuelve exclusivamente el listado completo de ofertas realizadas por el usuario autenticado.
4. **Moderación (`app/api/admin/auctions/[id]/cancel`):**
   - `PATCH` / `POST`: Exclusivo para rol `ADMIN`.
   - **Regla #15 y #16:** Permite cancelar cualquier subasta activa (incluso si ya tiene ofertas), exigiendo un campo `reason` (motivo obligatorio) que queda registrado en la BD sin eliminar la subasta.

---

## Fase 5: Frontend, Estrategias de Renderizado y UX

| Página / Vista | Ruta / Route Group | Estrategia | Detalles de Implementación |
| :--- | :--- | :--- | :--- |
| **Home** | `app/(public)/page.tsx` | **SSG** | Página estática de presentación de BidHub con llamados a la acción hacia el catálogo y registro. |
| **Catálogo** | `app/(public)/auctions/page.tsx` | **SSR** | Renderizado dinámico en servidor con filtros por categoría y estado. Uso obligatorio de `next/image`. |
| **Detalle** | `app/(public)/auctions/[id]/page.tsx` | **SSR** | Información del artículo, imagen optimizada con `next/image`, cuenta regresiva, formulario de oferta e historial público con alias parciales. |
| **Login / Registro** | `app/(auth)/login`, `register` | **CSR / SSR** | Diseño centrado y simple, validación de formularios y redirección tras login. |
| **Dashboard** | `app/(private)/dashboard/page.tsx` | **CSR** | Componentes cliente (`"use client"`) que consultan "Mis subastas" (con opción de editar/cancelar si no tienen ofertas) y "Mis ofertas", incluyendo interceptor de `fetch` para renovar el `access_token` automáticamente. |
| **Publicar / Editar** | `app/(private)/publish/page.tsx` | **CSR / SSR** | Formulario controlado que valida precio inicial, incremento mínimo, categoría y rango de fecha (1h a 7 días). |
| **Panel Admin** | `app/(admin)/admin/page.tsx` | **CSR / SSR** | Layout administrativo para crear/editar/eliminar categorías y moderar (cancelar con motivo) subastas activas. |

- **Hidratación limpia (Requisito #10):** Crear el componente `<AuctionCountdown closesAt={...} />` renderizando un placeholder estable en el primer pase y calculando el tiempo restante dentro de un `useEffect` en el cliente para evitar errores de *hydration mismatch*.
- **Internacionalización (Requisito #9):** Implementar soporte bilingüe (`es` / `en`) con diccionarios JSON y un selector de idioma visible en el Navbar que persista la preferencia del usuario.

---

## Fase 6: Contenerización, Despliegue y Documentación (README)

1. **Dockerización:**
   - Configurar `output: 'standalone'` en `next.config.ts`.
   - Escribir un `Dockerfile` multi-etapa que instale dependencias, genere el cliente del ORM, construya la aplicación (`npm run build`) y exponga el servidor de producción.
   - *(Punto extra)* Añadir un archivo `docker-compose.yml` listo para levantar el contenedor.
2. **Despliegue en Vercel:**
   - Conectar el repositorio a **Vercel**, configurar las variables de entorno apuntando a la instancia de **Supabase** y verificar que `next/image` tenga configurados los `remotePatterns` necesarios para las imágenes de las subastas.
3. **Puntos Extra (Opcionales pero recomendados):**
   - **Pruebas:** Añadir tests automatizados (con Vitest o Jest) para al menos una regla de negocio (ej. cálculo de oferta mínima y extensión de 5 minutos).
   - **CI:** Crear `.github/workflows/ci.yml` que ejecute linter, `tsc --noEmit` y las pruebas en cada push.
   - **Rate Limiting e Idempotencia:** Limitar intentos en `/api/auth/login` y `/api/auctions/[id]/bids`, y validar una cabecera `Idempotency-Key` al crear ofertas.
4. **Redacción del `README.md` (Entregable evaluado):**
   - Documentar paso a paso y en orden estricto los 9 puntos exigidos:
     1. Descripción breve del proyecto.
     2. Requisitos previos (Node.js, gestor de paquetes, Docker, cuenta de Supabase).
     3. Tabla detallada de variables de entorno (`.env.example`), explicando cómo obtener el `DATABASE_URL` en Supabase y cómo generar los secretos JWT (ej. `openssl rand -base64 32`).
     4. Comandos exactos en orden para ejecución en desarrollo (clonar, instalar, crear `.env`, correr migraciones, correr seed, iniciar servidor).
     5. Credenciales del usuario Administrador creado por el seed.
     6. Comandos para construir y ejecutar el contenedor con Docker pasando las variables de entorno.
     7. Tabla con todos los scripts del `package.json`.
     8. Árbol de la estructura de carpetas explicada brevemente.
     9. URL pública de la aplicación desplegada en Vercel.

---

## Cronograma Sugerido de Ejecución

- **Bloque 1 (20% del tiempo):** Fase 1 y Fase 2 (Setup, Base de datos en Supabase, Esquema ORM, Migraciones y Seed con los 4 estados).
- **Bloque 2 (30% del tiempo):** Fase 3 y Fase 4 (Autenticación con cookies/refresh, `proxy.ts` y todos los Route Handlers con sus 20 reglas de negocio).
- **Bloque 3 (35% del tiempo):** Fase 5 (Layouts por route group, páginas con SSG/SSR/CSR, reloj regresivo sin error de hidratación, `next/image` e i18n ES/EN).
- **Bloque 4 (15% del tiempo):** Fase 6 (Dockerfile, puntos extra rápidos como test unitario y CI, despliegue en Vercel y redacción verificada del README).