# Design

## Context

Ver `proposal.md` - Why. El proyecto usa Express 5 + `pg` con un pool directo, sin ORM ni herramienta de migraciones. `db.init()` crea las tablas con `CREATE TABLE IF NOT EXISTS` y siembra con `ON CONFLICT DO NOTHING`, así que es idempotente y se ejecuta en cada arranque (`index.js`) y en el smoke test. `server.js` concentra las rutas y ya tiene un middleware `auth` que resuelve el usuario desde el token y lo deja en `req.user`. Los tests corren con un `FakeDb` inyectado (`createApp(db)`), por lo que toda función nueva de `db.js` necesita su equivalente en el fake.

## Goals / Non-Goals

**Goals:**

- Extender el bootstrap idempotente existente sin introducir migraciones.
- Un único punto de verificación de permisos reutilizable por todas las rutas.
- Mantener paridad estricta entre `db.js` y `FakeDb` para que los tests sigan siendo rápidos y sin Postgres.

**Non-Goals:**

- Hashing de contraseñas, rotación o revocación de tokens.
- Permisos con alcance sobre recursos (ownership), auditoría o jerarquía de roles.
- Un ORM o una librería de autorización.

## Decisions

### Modelo de datos: tres tablas

```
permissions (id serial PK, name text UNIQUE NOT NULL)
role_permissions (role_id int FK roles, permission_id int FK permissions, PK(role_id, permission_id))
user_permissions (user_id int FK users, permission_id int FK permissions,
                  effect text CHECK (effect IN ('grant','deny')),
                  PK(user_id, permission_id))
```

`PK(user_id, permission_id)` en `user_permissions` garantiza a lo sumo un override por permiso y usuario, tal como pide la spec. Se elige una columna `effect` en vez de dos tablas (`user_grants`/`user_denies`) porque el reemplazo total con `PUT` necesita borrar por usuario de todos modos y una sola tabla simplifica el diff. Alternativa descartada: un `role_id` opcional en una única tabla de asignaciones; mezclaría dos conceptos con precedencia distinta en la misma estructura.

### Conjunto efectivo como consulta a la base

`db.getEffectivePermissions(userId)` resuelve el usuario, su rol y calcula todo en una sola consulta. Si el rol es `SuperAdmin`, devuelve el catálogo completo sin leer overrides (bypass implícito). Si no, combina línea base, concesiones y denegaciones, y devuelve los nombres ordenados alfabéticamente para que las respuestas y los tests sean deterministas. Alternativa descartada: calcular el merge en JS a partir de varias consultas; más viajes a la base y lógica duplicada con el fake.

### Middleware `requirePermission(name)`

Un factory que se apoya en `req.user` (ya resuelto por `auth`) y consulta `db.getEffectivePermissions`. Responde `403` si falta el permiso. El bypass de `SuperAdmin` vive dentro de `getEffectivePermissions`, no en el middleware, para que `/me` y los tests de permisos vean el mismo conjunto que la autorización. Alternativa descartada: short-circuit de `SuperAdmin` en el middleware; dejaría `/me` reportando un conjunto distinto del que realmente autoriza.

### Escrituras "set/replace" con transacción

`PUT /roles/:name/permissions` y `PUT /users/:id/permissions` borran las filas del objetivo e insertan las nuevas dentro de una transacción (`pool.connect()` + `BEGIN/COMMIT/ROLLBACK`). El cuerpo se valida contra el catálogo antes de escribir; un nombre o efecto inválido responde `400` sin tocar la base. Alternativa descartada: endpoints incrementales por ítem; más superficie y estados intermedios.

### Guarda anti-escalada en la asignación de rol

`PUT /users/:id/role` verifica: rol destino existe (`404`/`400`), el rol del que llama es `SuperAdmin` o el rol destino no es `SuperAdmin` (si no, `403`). No se prohíbe cambiar el rol propio entre roles no privilegiados. Alternativa descartada: exigir `permissions:write` para asignar rol; dejaba a `users:write` sin efecto útil.

### Paridad con `FakeDb`

`FakeDb` replica `getEffectivePermissions`, los setters de línea base y overrides, y el bypass, operando sobre arreglos en memoria con los mismos nombres de permisos. Los tests existentes siguen pasando porque el bootstrap (`ana`) es `SuperAdmin`.

## Risks / Trade-offs

- **Cambio de contrato en `/users`** (ahora `users:read`) -> Es la única ruptura; se documenta en la propuesta y la semilla A mantiene a `ReadOnly` con acceso, por lo que el comportamiento observable no cambia para los roles sembrados.
- **Cobertura débil del camino no-SuperAdmin** (los tests actuales siempre usan al bootstrap) -> Agregar tests que registren un segundo usuario y ejerzan `403`/`200` por permiso.
- **Cálculo de permisos por request** -> Es una consulta por llamada autorizada; aceptable para el tamaño del proyecto y evita cache inválida al editar overrides.
- **`PUT /roles/SuperAdmin/permissions` es inerte** (el bypass lo ignora) -> Documentarlo y decidir el comportamiento (`no-op` aceptado vs `403`) en Open Questions.
- **Repositorio KISS** -> Se evita cualquier dependencia nueva; la autorización son dos funciones y un middleware.

## Migration Plan

`db.init()` agrega las tres tablas y la semilla de `permissions`/`role_permissions` con `ON CONFLICT DO NOTHING`. No hay migración de datos previos: los usuarios existentes conservan su `role_id` y heredan la línea base del rol. Rollback: `DROP TABLE user_permissions, role_permissions, permissions` y quitar las guardas; las tablas `roles`/`users` no se modifican.

## Resolved Micro-decisions

- `GET /users/:id/permissions` responde `{ "effective": [...], "overrides": [{ "permission": ..., "effect": ... }] }`.
- `PUT /roles/SuperAdmin/permissions` se acepta y responde `200`, pero es inerte: el bypass ignora `role_permissions` para ese rol.
- La lista `permissions` de `GET /me` y del conjunto efectivo se ordena alfabéticamente.