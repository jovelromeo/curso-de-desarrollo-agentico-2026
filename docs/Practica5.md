# Práctica 5: OpenSpec — de la idea al cambio, sobre el playground standalone

> Pre-requisitos: Node 20+ (en este repo ya está vía `mise`), OpenCode, y ganas de escribir un spec antes del código. La idea de la práctica se apoya en el **playground standalone de Jev** (`docs/Practica5/jev-playground.html`): un único archivo HTML, sin backend ni Node, que ya maneja solo con Jev. El detalle de Jev está en [`Practica5-jev.md`](./Practica5-jev.md).

## 1. Qué es OpenSpec (y por qué antes de programar)

OpenSpec es un sistema **spec-driven**: primero se describe *qué* cambia y *cómo se verifica*, después se implementa. El trabajo vive en un **change** (una carpeta bajo `openspec/changes/<nombre>/`) que se completa con una cadena de artefactos:

```
proposal → specs → design → tasks
```

| Artefacto | Responde |
| --- | --- |
| `proposal` | Por qué y qué cambia (intención, alcance, fuera de alcance). |
| `specs` | Requisitos con escenarios `WHEN/THEN` (la parte verificable). |
| `design` | Decisiones técnicas y alternativas (opcional si el cambio es chico). |
| `tasks` | Checklist de implementación con su verificación. |

El CLI es `openspec`. Al inicializar, además, se instalan comandos de OpenCode (`/opsx-propose`, `/opsx-apply`, `/opsx-archive`, …) que automatizan cada paso del ciclo: **proponer → revisar → implementar → archivar**.

## 2. Instalar OpenSpec

```pwsh
npm install -g @fission-ai/openspec
openspec --version
```

Debería imprimir `1.14.0` o superior.

## 3. Inicializar el proyecto de la práctica

La práctica trabaja **sobre el playground standalone**. Lo tomamos como proyecto y lo inicializamos ahí mismo:

```pwsh
openspec init --tools opencode --language spanish .\docs\Practica5
```

Eso crea `docs\Practica5\openspec\` (los specs) y `docs\Practica5\.opencode\` (los comandos `/opsx-*`). Confirmá que el root quedó bien:

```pwsh
openspec list --json
```

Si `root` no es `null`, el proyecto ya usa OpenSpec.

> `openspec init` sin `--tools` es interactivo y pregunta qué herramientas configurar. Acá lo hacemos no interactivo para OpenCode y con artefactos en español.

## 4. La primera práctica: perfiles de conducción

**La idea.** Hoy el copiloto de Jev maneja con un único criterio. Queremos que el usuario elija un **perfil de conducción** y que ese perfil module las decisiones que se le piden a Jev:

| Perfil | Comportamiento esperado |
| --- | --- |
| `cautious` 🐢 | Frena antes y mantiene un margen de velocidad más conservador. |
| `balanced` 🏁 | Punto medio (default). |
| `aggressive` 🔥 | Aprovecha más el límite de velocidad y frena más tarde. |

Restricciones: sigue siendo **un solo archivo HTML**, sin backend; el modelo de Jev no cambia (`typesafe/jev-1.13`); el perfil se elige en la UI y se refleja en las `instructions`/`criteria` que se envían a Jev.

**Consigna.** Creá el change y escribí sus artefactos. No copies una solución: el ejercicio es redactar el spec y recién después tocar el HTML.

```pwsh
openspec new change perfiles-de-conduccion
```

Seguí el orden de artefactos con el agente (o a mano). El comando que te dice qué escribir y qué falta es:

```pwsh
openspec status --change perfiles-de-conduccion --json
openspec instructions proposal --change perfiles-de-conduccion --json
```

Puntos que el `spec` **debe** cubrir como escenarios verificables (ajustá los que quieras):

- El perfil por defecto es `balanced`.
- Al cambiar de perfil, el **request a Jev** cambia: el perfil se incluye en el `state` y/o en las `instructions` de las preguntas de freno/acelerador.
- La UI muestra el perfil activo en el panel de decisión/telemetría.
- Sin API key o sin perfil, el playground sigue funcionando como antes (no rompe el caso base).
- El perfil vive solo en memoria: recargar vuelve a `balanced`.

> Regla de oro del spec-driven: si un requisito no tiene un escenario que se pueda **observar**, todavía no está listo. "Frena mejor" no es verificable; "el request incluye `profile: cautious` en el state" sí.

Validá el change antes de implementar:

```pwsh
openspec validate perfiles-de-conduccion --strict
```

## 5. Implementar

Con el spec aprobado, el agente implementa las `tasks` del change:

```pwsh
openspec instructions apply --change perfiles-de-conduccion --json
```

En OpenCode, el atajo es el comando `/opsx-apply` (trabaja sobre el change seleccionado). Implementá **solo lo que el spec pide**; si aparece algo nuevo, se agrega al spec, no se cuela en el código.

**Verificación** (abrí el HTML en el navegador, cargá tu key y usá ⏭️ Paso):

1. El selector de perfil aparece y arranca en `balanced`.
2. Al cambiarlo, el panel de decisión muestra el perfil y el request enviado a Jev lo incluye.
3. Con `cautious` las `instructions` de freno son más conservadoras que con `aggressive`.
4. Recargar vuelve a `balanced` y todo lo demás sigue igual.

## 6. Archivar

Cuando las `tasks` están completas y verificadas, el change se archiva y sus requisitos pasan a los specs principales del proyecto:

```pwsh
openspec archive perfiles-de-conduccion
```

En OpenCode: `/opsx-archive`. Después, `openspec list --specs` muestra la capacidad `perfiles-de-conduccion` como parte del proyecto.

## 7. Enlaces de referencia

- OpenSpec: https://github.com/Fission-AI/OpenSpec
- Documentación de la práctica base (Jev): [`Practica5-jev.md`](./Practica5-jev.md)
- Playground standalone: [`Practica5/jev-playground.html`](./Practica5/jev-playground.html)
