# Proposal

## Why

Hoy la API solo autentica: cualquier usuario con token válido puede llamar a `/users` y `/me`, y el rol se muestra pero nunca se usa para autorizar. `Admin` existe en la semilla y no se puede asignar a nadie. No hay forma de expresar qué puede hacer un rol ni de dar o quitar capacidades a un usuario puntual.

## What Changes

- **BREAKING**: `GET /users` deja de estar disponible para todo usuario autenticado y pasa a exigir el permiso `users:read`. Todos los tests actuales siguen pasando porque operan con el `SuperAdmin` de arranque.
- Nuevo catálogo de permisos con seis entradas `resource:action`: `users:read`, `users:write`, `roles:read`, `roles:write`, `permissions:read`, `permissions:write`.
- Nuevas tablas `permissions`, `role_permissions` y `user_permissions`, creadas de forma idempotente en `db.init()` y sembradas junto con las ya existentes.
- Permisos por rol (línea base) y por usuario (override directo con `effect` `grant` o `deny`). La denegación gana sobre la concesión del rol.
- `SuperAdmin` mantiene bypass implícito: omite la verificación sin necesitar filas en `role_permissions`.
- Nuevos endpoints de gestión: `GET /permissions`, `GET /roles`, `PUT /roles/:name/permissions`, `PUT /users/:id/role`, `GET /users/:id/permissions`, `PUT /users/:id/permissions`.
- `PUT /users/:id/role` no puede otorgar el rol `SuperAdmin` salvo que quien llama sea `SuperAdmin`.
- `GET /me` pasa a devolver también la lista de permisos efectivos del usuario autenticado.

Fuera de alcance: hashing de passwords, ciclo de vida de tokens, refresco o revocación de sesiones.

## Capabilities

### New Capabilities
- `access-control`: catálogo de permisos, asignación por rol y por usuario, cálculo del conjunto efectivo, y autorización de endpoints por permiso.

### Modified Capabilities
<!-- Sin capacidades existentes: el proyecto no tenía specs todavía. -->

## Impact

- `db.js`: tres tablas nuevas, semilla de `permissions` y `role_permissions`, y funciones para listar/editar permisos, rol y overrides, más el cálculo del conjunto efectivo.
- `server.js`: middleware `requirePermission`, guardas en las rutas nuevas y existentes, y enriquecimiento de `/me`.
- `test/fake-db.js` y `test/server.test.js`: el fake implementa las funciones nuevas; se agregan tests de enforcement, overrides y anti-escalada.
- `test/smoke.integration.js` y los comentarios `@openapi` de las rutas.
- API pública: `/users` cambia de autenticación simple a autorización por permiso; se agregan seis rutas.