# Spec Delta

## Purpose

Define el control de acceso de la API: un catálogo de permisos, su asignación por rol y por usuario, el cálculo del conjunto efectivo y la autorización de endpoints en función de ese conjunto.

## ADDED Requirements

### Requirement: Catálogo de permisos

El sistema SHALL mantener un catálogo de permisos con nombre único en formato `resource:action`. El catálogo sembrado SHALL contener exactamente `users:read`, `users:write`, `roles:read`, `roles:write`, `permissions:read` y `permissions:write`.

#### Scenario: Semilla del catálogo

- **WHEN** se inicializa la base de datos
- **THEN** el catálogo contiene los seis permisos sembrados

#### Scenario: Nombre duplicado

- **WHEN** se intenta insertar un permiso con un nombre ya existente
- **THEN** la operación falla y el catálogo queda sin cambios

### Requirement: Permisos por rol

El sistema SHALL asociar permisos a roles como línea base. La semilla SHALL asignar `users:read` a `ReadOnly`, y `users:read`, `users:write`, `permissions:read` y `roles:read` a `Admin`. El rol `SuperAdmin` NO SHALL requerir filas en la línea base.

#### Scenario: Línea base de ReadOnly

- **WHEN** se inicializa la base de datos
- **THEN** la línea base de `ReadOnly` es exactamente `users:read`

#### Scenario: Línea base de Admin

- **WHEN** se inicializa la base de datos
- **THEN** la línea base de `Admin` es `users:read`, `users:write`, `permissions:read` y `roles:read`

### Requirement: Permisos por usuario

El sistema SHALL permitir overrides directos por usuario con efecto `grant` o `deny`. Cada usuario SHALL tener a lo sumo un override por permiso.

#### Scenario: Concesión directa

- **WHEN** un permiso se concede directamente a un usuario cuyo rol no lo tiene
- **THEN** ese usuario obtiene el permiso

#### Scenario: Denegación directa

- **WHEN** un permiso se deniega directamente a un usuario cuyo rol lo tiene
- **THEN** ese usuario no tiene el permiso

### Requirement: Cálculo del conjunto efectivo

El sistema SHALL calcular los permisos efectivos de un usuario como la línea base de su rol más las concesiones directas menos las denegaciones directas. Una denegación directa SHALL prevalecer sobre una concesión del rol.

#### Scenario: Sin overrides

- **WHEN** un usuario no tiene overrides directos
- **THEN** su conjunto efectivo es exactamente la línea base de su rol

#### Scenario: Concesión sobre la línea base

- **WHEN** un usuario `ReadOnly` recibe una concesión directa de `users:write`
- **THEN** su conjunto efectivo incluye `users:read` y `users:write`

#### Scenario: Denegación sobre la línea base

- **WHEN** un usuario `Admin` recibe una denegación directa de `users:read`
- **THEN** su conjunto efectivo no incluye `users:read` pero sí el resto de la línea base

### Requirement: Bypass de SuperAdmin

Un usuario con rol `SuperAdmin` SHALL considerarse autorizado para todo permiso, sin evaluar su línea base ni sus overrides. Ninguna denegación directa SHALL reducir sus permisos.

#### Scenario: Acceso total

- **WHEN** un `SuperAdmin` invoca un endpoint protegido por cualquier permiso del catálogo
- **THEN** se autoriza

#### Scenario: Denegación ignorada

- **WHEN** un `SuperAdmin` tiene una denegación directa de un permiso
- **THEN** sigue autorizado para ese permiso

### Requirement: Autorización de endpoints por permiso

Cada endpoint protegido SHALL exigir un permiso específico. Una solicitud sin token válido SHALL responder `401`. Una solicitud autenticada sin el permiso exigido SHALL responder `403`. Los endpoints públicos (`/`, `/register`, `/login`, `/openapi.json` y la documentación) SHALL permanecer accesibles sin autenticación.

#### Scenario: Sin token

- **WHEN** se llama `GET /users` sin token
- **THEN** responde `401`

#### Scenario: Autenticado sin permiso

- **WHEN** un usuario sin `users:read` llama `GET /users`
- **THEN** responde `403`

#### Scenario: Autenticado con permiso

- **WHEN** un usuario con `users:read` llama `GET /users`
- **THEN** responde `200`

#### Scenario: Endpoint público

- **WHEN** se llama `POST /login` sin token
- **THEN** la solicitud se procesa sin exigir autenticación

### Requirement: Endpoints de gestión de permisos y roles

El sistema SHALL exponer `GET /permissions` protegido por `permissions:read`, `GET /roles` protegido por `roles:read`, y `PUT /roles/:name/permissions` protegido por `roles:write`. El `PUT` SHALL reemplazar el conjunto completo de la línea base del rol por el enviado.

#### Scenario: Reemplazo de línea base

- **WHEN** un `SuperAdmin` hace `PUT /roles/ReadOnly/permissions` con un arreglo de nombres
- **THEN** la línea base de `ReadOnly` pasa a ser exactamente ese arreglo

#### Scenario: Permiso inexistente en el cuerpo

- **WHEN** el cuerpo del `PUT` incluye un nombre que no está en el catálogo
- **THEN** responde `400`

#### Scenario: Rol inexistente

- **WHEN** se invoca `PUT /roles/:name/permissions` con un rol que no existe
- **THEN** responde `404`

#### Scenario: Sin permiso de gestión

- **WHEN** un usuario sin `roles:write` invoca `PUT /roles/:name/permissions`
- **THEN** responde `403`

### Requirement: Asignación de rol a usuario

El sistema SHALL exponer `PUT /users/:id/role` protegido por `users:write`. Un llamante que no sea `SuperAdmin` NO SHALL poder asignar el rol `SuperAdmin`. Un rol inexistente en el cuerpo SHALL responder `400` y un usuario inexistente SHALL responder `404`.

#### Scenario: SuperAdmin asigna cualquier rol

- **WHEN** un `SuperAdmin` asigna un rol válido a un usuario
- **THEN** el rol del usuario se actualiza

#### Scenario: No escalar a SuperAdmin

- **WHEN** un `Admin` intenta asignar `SuperAdmin` a un usuario
- **THEN** responde `403` y el rol del usuario no cambia

#### Scenario: Admin asigna rol no privilegiado

- **WHEN** un `Admin` asigna `Admin` o `ReadOnly` a un usuario
- **THEN** la asignación se permite

### Requirement: Gestión de overrides por usuario

El sistema SHALL exponer `GET /users/:id/permissions` protegido por `permissions:read` y `PUT /users/:id/permissions` protegido por `permissions:write`. El `PUT` SHALL reemplazar el conjunto completo de overrides del usuario. La respuesta del `GET` SHALL distinguir el conjunto efectivo de los overrides directos.

#### Scenario: Reemplazo de overrides

- **WHEN** un `SuperAdmin` hace `PUT /users/:id/permissions` con una lista de overrides
- **THEN** los overrides del usuario pasan a ser exactamente esa lista

#### Scenario: Override inválido

- **WHEN** el cuerpo referencia un permiso inexistente o un efecto distinto de `grant`/`deny`
- **THEN** responde `400`

#### Scenario: Lectura del conjunto efectivo

- **WHEN** un usuario con `permissions:read` hace `GET /users/:id/permissions`
- **THEN** la respuesta incluye el conjunto efectivo y los overrides directos por separado

### Requirement: Autoinspresión de permisos

`GET /me` SHALL devolver, además de `id`, `username` y `role`, el conjunto de permisos efectivos del usuario autenticado.

#### Scenario: Usuario común

- **WHEN** un usuario autenticado llama `GET /me`
- **THEN** la respuesta incluye `permissions` con su conjunto efectivo

#### Scenario: SuperAdmin

- **WHEN** un `SuperAdmin` llama `GET /me`
- **THEN** `permissions` refleja el catálogo completo