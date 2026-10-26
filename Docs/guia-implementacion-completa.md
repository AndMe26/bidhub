# Guía de implementación completa de BidHub

Este documento define el orden correcto para completar el proyecto BidHub hasta dejarlo funcional, estable y listo para entrega. Está pensado para seguir de forma secuencial sin saltarse capas ni producir errores de compilación o reglas de negocio.

## Principio base

Antes de tocar la UI, el proyecto debe cumplir estas tres condiciones:

1. Compilar sin errores.
2. Tener el estado de la subasta calculado correctamente en backend.
3. Tener el backend de autenticación, subastas y ofertas funcionando con las reglas del negocio.

Solo después de eso se construye la capa visual y la parte de despliegue.

---

## Fase 0: base técnica y corrección de compilación

### Objetivo

Dejar el proyecto limpio y compilando antes de implementar nuevas funcionalidades.

### Tareas

1. Corregir la importación rota en `services/auction-service.ts`.
2. Crear o completar el archivo `services/auction-status.ts` con la lógica central de estados.
3. Revisar y corregir tipos TypeScript para evitar `any` y errores de importación.
4. Confirmar que `npm run build` pase sin errores.

### Entregable de la fase

- Proyecto compilando.
- Lógica de estado de subasta disponible y reutilizable.
- Base técnica estable para seguir con backend.

### Criterio de salida

- `npm run build` exit code 0.

---

## Fase 1: lógica central del negocio en backend

### Objetivo

Definir las funciones reutilizables que validan la lógica del negocio de subastas.

### Módulos a crear o completar

- `services/auction-status.ts`
- `services/auction-service.ts`
- `lib/http.ts` (si hace falta reforzar formateo de errores)
- `lib/mask.ts` para enmascarado de nombres y correos

### Funcionalidades a cubrir

- `getAuctionStatus(auction, bidsCount)`
- `statusWhere(status, now)`
- `assertValidCloseDate(closesAt, now)`
- `assertCategoryExists(categoryId)`
- `assertSellerBelowLimit(sellerId, now)`
- `getOwnedAuction(id, userId)`
- `assertEditable(auction, action)`
- `toAuctionDto(auction)`

### Reglas que deben quedar aseguradas

- Estado dinámico real sin cronjobs.
- Subasta activa sólo si no está cancelada y el cierre no pasó.
- Subasta cerrada si tiene ofertas y ya pasó el cierre.
- Subasta desierta si pasó el cierre y no tiene ofertas.
- Subasta cancelada si `isCancelled === true`.

### Entregable de la fase

- Un servicio consistente para validación y cálculo de estado.
- Funciones de negocio reutilizadas por todos los route handlers.

---

## Fase 2: autenticación completa y segura

### Objetivo

Completar la autenticación con cookies, refresh token y autorización por rol.

### Tareas

1. Completar `POST /api/auth/logout`.
2. Completar `POST /api/auth/refresh`.
3. Validar `refreshTokenHash` almacenado en BD.
4. Revoque la sesión al hacer logout.
5. Asegurar que los tokens viajen solo por cookies `httpOnly`, `secure`, `sameSite`.
6. Agregar `requireAuth()` y `requireAdmin()` bien aplicados.

### Reglas a cumplir

- Usuario no autenticado -> `401`.
- Usuario sin permisos -> `403`.
- Administrador solo acceso a rutas admin.
- Refresh token se compara con hash almacenado, nunca en texto claro.

### Entregable de la fase

- Login, logout y refresh funcionando.
- Protección por sesión y rol.

### Criterio de salida

- Usuario puede iniciar sesión y seguir navegando sin reingresar credenciales.
- Admin puede acceder al panel pero usuario normal no.

---

## Fase 3: categorías y administración básica

### Objetivo

Montar la primera parte del panel administrativo y la estructura de categorías.

### Endpoints a implementar

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/[id]`
- `DELETE /api/categories/[id]`

### Reglas a cubrir

- Público puede listar categorías.
- Solo admin puede crear/editar/eliminar.
- Eliminar categoría con subastas asociadas debe devolver `409 Conflict`.
- `slug` debe ser único y limpio.

### Entregable de la fase

- Gestión de categorías completa para admin.

---

## Fase 4: subastas y reglas del negocio

### Objetivo

Implementar la parte más importante del backend: creación, edición, listado y cancelación de subastas.

### Endpoints a implementar

- `GET /api/auctions`
- `GET /api/auctions/[id]`
- `POST /api/auctions`
- `PUT /api/auctions/[id]`
- `PATCH /api/auctions/[id]/cancel`
- `GET /api/auctions/mine`

### Reglas a cumplir

#### Publicación

1. `initialPrice > 0`.
2. `minIncrement > 0`.
3. `closesAt` debe estar entre 1 hora y 7 días desde ahora.
4. `categoryId` debe existir.
5. Un vendedor no puede tener más de 5 subastas activas.

#### Edición

6. Solo el dueño puede editar.
7. Solo puede editar si está activa y no tiene ofertas.

#### Cancelación

8. El vendedor solo puede cancelar si no tiene ofertas.
9. La subasta no se elimina, solo se marca como cancelada.
10. La cancelación guarda motivo si aplica.

### Entregable de la fase

- CRUD funcional de subastas con validaciones.
- Estado y permisos correctos.

---

## Fase 5: ofertas y protección de negocio

### Objetivo

Llenar la lógica del flujo de puja y evitar condiciones de carrera.

### Endpoints a implementar

- `POST /api/auctions/[id]/bids`
- `GET /api/auctions/[id]/bids`
- `GET /api/bids/me`

### Reglas a cumplir

1. No puede ofertar en su propia subasta.
2. Solo se puede pujar si la subasta está activa.
3. La primera oferta debe ser `>= initialPrice`.
4. Las siguientes deben ser `>= oferta más alta + minIncrement`.
5. Si ya tiene la oferta más alta, no puede volver a ofertar.
6. No se permiten editar ni borrar ofertas.
7. Si faltan 5 minutos o menos para cerrar, la subasta se extiende +5 minutos.
8. Debe ejecutarse dentro de transacción para evitar condiciones de carrera.

### Recomendación técnica

Usar transacciones de Prisma para validar y crear la oferta como una sola operación atómica.

### Entregable de la fase

- Sistema de pujas funcional con validación de negocio real.
- Ofertas visibles en detalle y listadas para el usuario autenticado.

---

## Fase 6: moderación admin y comportamiento del historial

### Objetivo

Completar la parte administrativa y la privacidad del sistema.

### Endpoints a implementar

- `PATCH /api/admin/auctions/[id]/cancel`

### Reglas a cumplir

- El admin puede cancelar subastas activas aunque tengan ofertas.
- Debe enviarse un `reason` obligatorio.
- La subasta se conserva y se marca como cancelada.
- El historial público debe enmascarar nombre/correo de los postores.

### Entregable de la fase

- Moderación funcional sin romper la integridad de los datos.
- Historial público seguro y anonimizador.

---

## Fase 7: frontend y layouts por route group

### Objetivo

Transformar la app en una experiencia usable para usuarios y administradores.

### Rutas a construir

- `app/(public)/page.tsx` -> Home
- `app/(public)/auctions/page.tsx` -> Catálogo
- `app/(public)/auctions/[id]/page.tsx` -> Detalle
- `app/(auth)/login/page.tsx` -> Login
- `app/(auth)/register/page.tsx` -> Registro
- `app/(private)/dashboard/page.tsx` -> Dashboard
- `app/(private)/publish/page.tsx` -> Publicar
- `app/(admin)/admin/page.tsx` -> Panel admin

### Layouts requeridos

- `app/(public)` layout con navbar y footer.
- `app/(auth)` layout centrado.
- `app/(private)` layout con menú de usuario.
- `app/(admin)` layout de administración.

### Requisitos clave

- `next/image` para imágenes de subastas.
- contador regresivo con placeholder estable para evitar hydration mismatch.
- selector visible de idioma ES/EN.
- diseño claro y consistente.

### Entregable de la fase

- Aplicación navegable y coherente visualmente.
- Páginas funcionales con integración backend.

---

## Fase 8: seguridad y refinamiento de producción

### Objetivo

Asegurar que la app cumple la base de seguridad y comportamiento real de producción.

### Tareas

- `proxy.ts` para rutas privadas y admin.
- `requireAuth` y `requireAdmin` repetidos en handlers.
- Validación de datos con `zod` consistente.
- Cookies correctas de sesión.
- Control de errores uniforme con códigos HTTP 400/401/403/404/409.
- Protección frente a manipulaciones del ID en URL.

### Entregable de la fase

- App con acceso controlado y reglas de negocio aplicadas tanto en UI como en backend.

---

## Fase 9: despliegue, documentación y QA final

### Objetivo

Dejar el proyecto listo para ejecución y entrega.

### Tareas

1. Crear `.env.example` con todas las variables.
2. Crear `Dockerfile` para despliegue.
3. Configurar `next.config.ts` para `output: 'standalone'`.
4. Redactar `README.md` completo con:
   - descripción del proyecto
   - requisitos previos
   - variables de entorno
   - comandos de ejecución
   - credenciales del admin
   - Docker
   - scripts del `package.json`
   - estructura del proyecto
   - URL de despliegue
5. Verificar despliegue en Supabase + Vercel.
6. Ejecutar pruebas/fase de validación final.

### Criterio de salida

- Cualquier persona puede seguir el README y ejecutar el proyecto completo.
- La app se despliega sin errores funcionales.

---

## Orden recomendado de ejecución real

Este es el orden que evita retrasos y errores:

1. Fase 0: compilación
2. Fase 1: lógica central del negocio
3. Fase 2: autenticación y autorización
4. Fase 3: categorías
5. Fase 4: subastas
6. Fase 5: ofertas
7. Fase 6: moderación e historial
8. Fase 7: frontend
9. Fase 8: seguridad y refinamiento
10. Fase 9: documentación y despliegue

---

## Milestones importantes

### Milestone 1: base estable

- `npm run build` pase
- estado calculado correctamente

### Milestone 2: backend funcional

- auth + subastas + ofertas + admin operativos

### Milestone 3: app usable

- rutas, layouts, formularios, contador y catálogo funcionando

### Milestone 4: entrega final

- README claro, Docker, despliegue, validación final

---

## Recomendación final

No conviene empezar por lo visual. El proyecto debe completarse en este orden porque cada fase depende de la anterior:

- primero la lógica de negocio,
- luego la seguridad,
- luego la experiencia del usuario,
- y por último la entrega y despliegue.

Esto evita crear una UI que dependa de APIs incompletas o reglas que no estén realmente garantizadas en backend.
