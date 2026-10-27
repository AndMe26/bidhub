# BidHub — Plataforma Fullstack de Subastas de Colección

BidHub es una aplicación web fullstack desarrollada con **Next.js 16 (App Router)**, **TypeScript estricto** y **PostgreSQL** alojado en **Supabase**. Está diseñada para que los coleccionistas puedan registrarse, publicar subastas de artículos raros (cartas, relojes, vinilos, figuras) y ofertar en tiempo real con reglas de negocio garantizadas en el backend.

---

## 1. Descripción del Proyecto

- **Catálogo y Detalle:** Exploración con filtros por categoría y estado dinámico en tiempo real (`ACTIVE`, `CLOSED`, `DESERTED`, `CANCELLED`) sin cron jobs ni procesos externos.
- **Pujas Atómicas & Anti-sniping:** Transacciones de base de datos que garantizan consistencia y prorrogan el cierre en +5 minutos si se recibe una oferta cuando faltan $\le$ 5 minutos para finalizar.
- **Seguridad Perimetral & Privacidad:** Autenticación basada en cookies seguras `httpOnly` (`access_token` y `refresh_token`), revocación por hash en base de datos, enmascaramiento público de postores (Regla #18) y protección de rutas con `proxy.ts`.
- **Internacionalización (i18n):** Selector dinámico multilingüe (Español / Inglés).

---

## 2. Requisitos Previos

- **Node.js:** Versión `>= 20.x` (probado en v24).
- **npm:** Versión `>= 10.x`.
- **Docker:** (Opcional) Para ejecutar en contenedor.
- **Cuenta de Supabase:** Para aprovisionar la base de datos PostgreSQL.

---

## 3. Variables de Entorno

Copia el archivo de ejemplo para configurar tu entorno:

```bash
cp .env.example .env
```

| Variable | Descripción | Ejemplo / Cómo obtenerla |
| :--- | :--- | :--- |
| `DATABASE_URL` | Cadena de conexión con connection pooling (Transaction Mode / PgBouncer) | Supabase Dashboard $\rightarrow$ Project Settings $\rightarrow$ Database $\rightarrow$ Connection Pooling (`port 6543`) |
| `DIRECT_URL` | Cadena de conexión directa (Session Mode) para migraciones | Supabase Dashboard $\rightarrow$ Project Settings $\rightarrow$ Database $\rightarrow$ Direct Connection (`port 5432`) |
| `JWT_ACCESS_SECRET` | Clave secreta para firmar el token de acceso (min. 32 chars) | Generar con: `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET`| Clave secreta para firmar el token de refresco (min. 32 chars)| Generar con: `openssl rand -base64 32` |
| `ACCESS_TOKEN_EXPIRES_IN` | Tiempo de vida del access token | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN`| Tiempo de vida del refresh token | `7d` |

---

## 4. Comandos para Ejecución en Desarrollo

Sigue este orden estricto para iniciar el proyecto localmente:

1. **Instalar dependencias:**
   ```bash
   npm install
   ```
2. **Generar el cliente de Prisma:**
   ```bash
   npx prisma generate
   ```
3. **Ejecutar migraciones en la base de datos:**
   ```bash
   npx prisma migrate deploy
   # o en desarrollo local:
   npx prisma migrate dev
   ```
4. **Cargar los datos semilla (Seed con los 4 estados):**
   ```bash
   npm run db:seed
   ```
5. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 5. Credenciales del Usuario Administrador

El script de *seed* crea el rol administrativo inicial:

- **Correo electrónico:** `admin@bidhub.com`
- **Contraseña:** `Admin123!`
- **Rol:** `ADMIN` (acceso exclusivo a `/admin` para gestionar categorías y moderar subastas).

*Usuarios estándar de prueba creados por el seed:*
- `ana@bidhub.com` / `User12345`
- `carlos@bidhub.com` / `User12345`
- `lucia@bidhub.com` / `User12345`
- `mateo@bidhub.com` / `User12345`

---

## 6. Ejecución con Docker

Construir y ejecutar la imagen contenerizada multi-etapa:

```bash
# Construir la imagen
docker build -t bidhub:latest .

# Ejecutar el contenedor pasando las variables de entorno
docker run -p 3000:3000 --env-file .env bidhub:latest
```

El servidor quedará expuesto en [http://localhost:3000](http://localhost:3000).

---

## 7. Scripts de `package.json`

| Script | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo con Turbopack |
| `npm run build` | Compila la aplicación para producción en modo `standalone` |
| `npm run start` | Inicia el servidor de producción construido |
| `npm test` | Ejecuta las pruebas automatizadas de reglas de negocio (#11 y #12) |
| `npm run lint` | Ejecuta ESLint para validar la calidad del código |
| `npm run db:seed` | Ejecuta el script de semilla `prisma/seed.ts` |

---

## 8. Estructura del Proyecto

```text
bidhub/
├── app/
│   ├── (public)/          # Rutas públicas (Home, Catálogo, Detalle)
│   ├── (auth)/            # Rutas de autenticación (Login, Registro)
│   ├── (private)/         # Rutas autenticadas (Dashboard, Publicar)
│   ├── (admin)/           # Panel administrativo (Categorías, Moderación)
│   ├── api/               # Route Handlers de Backend
│   │   ├── auth/          # Login, Register, Refresh, Logout, Me
│   │   ├── auctions/      # CRUD, filtros en tiempo real, cancelación
│   │   ├── bids/          # Ofertas atómicas y consulta de ofertas propias
│   │   ├── categories/    # Listado, creación, edición y eliminación (Regla #17)
│   │   └── admin/         # Moderación con motivo obligatorio (Reglas #15 y #16)
│   ├── globals.css        # Sistema de diseño, temas y utilidades glassmorphism
│   └── layout.tsx         # Root Layout con proveedor i18n
├── components/
│   ├── auctions/          # Countdown sin hydration mismatch
│   ├── layout/            # Navbar dinámico con selector ES/EN y Footer
│   └── i18n-provider.tsx  # Contexto multilingüe con persistencia
├── generated/prisma/      # Cliente Prisma generado
├── lib/                   # Utilidades: Prisma, JWT (jose), cookies, hashing y HTTP
├── messages/              # Diccionarios de traducción (es.json, en.json)
├── prisma/
│   ├── schema.prisma      # Esquema de base de datos relacional
│   └── seed.ts            # Semilla con usuarios, categorías y subastas en 4 estados
├── services/
│   ├── auction-status.ts  # Cálculo dinámico de estados sin cron jobs (Reglas #12 y #13)
│   └── auction-service.ts # Reglas de negocio puras y validaciones
├── Dockerfile             # Multi-etapa para producción
├── proxy.ts               # Protección perimetral de rutas privadas y admin
└── tsconfig.json          # TypeScript en modo estricto
```

---

## 9. Despliegue en Producción

- **URL de la aplicación en Vercel:** [https://bidhub-ksomhye5m-n-5937.vercel.app](https://bidhub-ksomhye5m-n-5937.vercel.app)
- **Base de Datos:** PostgreSQL en Supabase.
- **Frontend y Backend:** Next.js 16 desplegado en Vercel con integración continua y variables de entorno configuradas (`DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).
