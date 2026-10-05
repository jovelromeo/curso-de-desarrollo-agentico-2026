# Tasks

## 1. Esquema, semilla y funciones de permisos en `db.js`

- [ ] 1.1 Crear las tablas `permissions` (name UNIQUE), `role_permissions` (PK rol+permiso) y `user_permissions` (PK usuario+permiso, `effect` con CHECK `grant`/`deny`) dentro de `db.init()`, y sembrar los seis permisos más la línea base A (`ReadOnly`: `users:read`; `Admin`: `users:read`, `users:write`, `permissions:read`, `roles:read`) con `ON CONFLICT DO NOTHING`. Verificación: `docker compose up -d db` y `db.init()` corren dos veces sin error y las tablas quedan con las filas sembradas.
- [ ] 1.2 Implementar `db.getEffectivePermissions(userId)`: devuelve el catálogo completo ordenado si el rol es `SuperAdmin`, y si no, `(línea base U concesiones) - denegaciones` ordenado alfabéticamente. Verificación: agregar al smoke test los casos sin override, con `grant` y con `deny`, y `npm run test:smoke` pasa.
- [ ] 1.3 Implementar `db.listPermissions()`, `db.listRolesWithPermissions()`, `db.setRolePermissions(roleName, names)` y `db.setUserPermissions(userId, overrides)`, con borrado+inserción transaccional en los dos setters. Verificación: el smoke test reemplaza la línea base de `ReadOnly` y los overrides de un usuario y vuelve a leerlos; `npm run test:smoke` pasa.

## 2. Paridad del doble de tests en `test/fake-db.js`

- [ ] 2.1 Agregar a `FakeDb` el catálogo, `getEffectivePermissions`, `listPermissions`, `listRolesWithPermissions`, `setRolePermissions` y `setUserPermissions`, replicando el bypass de `SuperAdmin` y el orden alfabético. Verificación: `npm test` sigue pasando con los tests existentes.

## 3. Middleware de autorización y rutas existentes

- [ ] 3.1 Implementar en `server.js` el factory `requirePermission(name)` que responde `403` si `db.getEffectivePermissions(req.user.id)` no incluye el permiso. Verificación: test que llama un endpoint protegido con token de usuario sin el permiso y espera `403`.
- [ ] 3.2 Proteger `GET /users` con `users:read`. Verificación: tests que esperan `401` sin token, `403` para un `ReadOnly` con `users:read` denegado por override, y `200` para el `SuperAdmin` y para `ReadOnly`.
- [ ] 3.3 Enriquecer `GET /me` con `permissions` (conjunto efectivo ordenado). Verificación: test que registra un `ReadOnly` con y sin override y compara la lista; `npm test` pasa.

## 4. Endpoints de gestión

- [ ] 4.1 Agregar `GET /permissions` (`permissions:read`) y `GET /roles` (`roles:read`) con sus comentarios `@openapi`. Verificación: tests `200` con permiso, `403` sin permiso.
- [ ] 4.2 Agregar `PUT /roles/:name/permissions` (`roles:write`) que reemplaza la línea base, responde `400` con un permiso inexistente, `404` con un rol inexistente, `403` sin permiso, y `200` inerte para `SuperAdmin`. Verificación: tests para cada código y relectura del estado con `GET /roles`.
- [ ] 4.3 Agregar `PUT /users/:id/role` (`users:write`) con la guarda anti-escalada: `Admin` no puede asignar `SuperAdmin` (`403`), roles no privilegiados sí, rol inexistente `400`, usuario inexistente `404`. Incluir `@openapi`. Verificación: tests de los cuatro casos.
- [ ] 4.4 Agregar `GET /users/:id/permissions` (`permissions:read`) devolviendo `{ effective, overrides }` y `PUT /users/:id/permissions` (`permissions:write`) que reemplaza los overrides, con `400` ante permiso o efecto inválido. Incluir `@openapi`. Verificación: tests de reemplazo, lectura y validación.

## 5. Integración end-to-end

- [ ] 5.1 Extender `test/smoke.integration.js` con un recorrido `SuperAdmin` -> `Admin` -> `ReadOnly`: el `Admin` asigna roles no privilegiados, un override `deny` sobre `users:read` corta el acceso, y el `SuperAdmin` no puede ser denegado. Verificación: `npm run test:smoke` pasa contra Postgres.
- [ ] 5.2 Verificar que `/openapi.json` incluye las seis rutas nuevas y que `npm test` completo pasa. Verificación: `npm test` y `curl http://localhost:3000/openapi.json` listan `/permissions`, `/roles`, `/roles/{name}/permissions`, `/users/{id}/role`, `/users/{id}/permissions`.