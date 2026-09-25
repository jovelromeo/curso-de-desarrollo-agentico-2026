# Delegación de una tarea a un agente en un sandbox de contenedores (docker)
> Tener instalado y corriendo Docker.
> Los agentes son efímeros: se crean para una tarea y se descartan. Por eso la imagen se construye una vez y cada ejecución se lanza con `docker run`, montando el espacio de trabajo en ese momento (sin `docker compose`).

1. Construir la imagen del sandbox definida en [Practica4/Dockerfile](./Practica4/Dockerfile). Incluye OpenCode v2 (`@opencode/cli` 2.0.16), git, ripgrep y curl, y su `ENTRYPOINT` es `opencode`.
    ```pwsh
    docker build -t cursodesarrolloagentico2026-agent:latest .\docs\Practica4
    ```
2. Crear un espacio de trabajo aislado con `git worktree` para que el agente no toque tu rama actual.
    ```pwsh
    git worktree add ..\worktree.practica4 -b practica4
    ```
3. Delegar la tarea al agente en el sandbox, montando el worktree en `/workspace` en el momento de la ejecución.
    > `--auto` auto-aprueba los permisos que no estén explícitamente denegados, ideal para un contenedor efímero.
    > Dentro del contenedor **no hay git**: el `.git` de un worktree es un archivo que apunta a una ruta del host, así que git falla y el agente trabaja solamente sobre los archivos. El diff se revisa en tu máquina (paso 4).

    ```pwsh
    $workspace = (Resolve-Path ..\worktree.practica4).Path
    ```
    - Modo no interactivo (ideal para delegar y revisar después):
        ```pwsh
        docker run --rm --init `
          -v "${workspace}:/workspace" -w /workspace `
          -e OPENAI_COMPATIBLE_API_KEY=<api-key-para-base-url-en-opencode-jsonc> `
          --read-only --tmpfs /tmp --tmpfs /root `
          --cap-drop ALL --security-opt no-new-privileges:true `
          --memory 2g --cpus 2 --pids-limit 256 `
          cursodesarrolloagentico2026-agent:latest `
          run --auto "Trabajo autónomo. Tarea para proyecto en docs\Practica4\practica4-api. OBJETIVO: <completar>"
        ```
    - Modo interactivo (TUI dentro del contenedor):
        ```pwsh
        docker run --rm -it --init `
          -v "${workspace}:/workspace" -w /workspace `
          -e OPENAI_COMPATIBLE_API_KEY=<api-key-para-base-url-en-opencode-jsonc> `
          --read-only --tmpfs /tmp --tmpfs /root `
          --cap-drop ALL --security-opt no-new-privileges:true `
          --memory 2g --cpus 2 --pids-limit 256 `
          cursodesarrolloagentico2026-agent:latest --auto
        ```
    > Si montás el repo directamente con `-v "${PWD}:/workspace"`, git sí funciona adentro (ese `.git` es una carpeta de verdad): el agente podría ver el diff y commitear, y la imagen le bloquea igual el `push`.
4. Revisar el resultado antes de integrarlo.
    ```pwsh
    git -C ..\worktree.practica4 diff    # lo que hizo el agente, todavía sin commitear
    ```
    Commiteá en el worktree y volvé a tu rama para integrarlo:
    ```pwsh
    git -C ..\worktree.practica4 add -A
    git -C ..\worktree.practica4 commit -m "trabajo del agente"
    git merge practica4
    ```

> Si en el futuro necesitás que el agente use git adentro, alcanza con montar el repo completo en vez del worktree (nota del paso 3): ahí git funciona con el mismo `docker run`, sin flags extra. La imagen igualmente no permite `push` a ningún lado (`protocol.allow=never`).


> El sandbox necesita salida a internet para llegar al proveedor del LLM. Para un aislamiento total de red (`--network none`) es necesario usar un modelo local dentro del contenedor.

## Anexo: desglose de la línea `docker run`

Comando de referencia (modo no interactivo, paso 3):

```pwsh
docker run --rm --init `
  -v "${workspace}:/workspace" -w /workspace `
  -e OPENAI_COMPATIBLE_API_KEY=<api-key-para-base-url-en-opencode-jsonc> `
  --read-only --tmpfs /tmp --tmpfs /root `
  --cap-drop ALL --security-opt no-new-privileges:true `
  --memory 2g --cpus 2 --pids-limit 256 `
  cursodesarrolloagentico2026-agent:latest `
  run --auto "Trabajo autónomo. Tarea para proyecto en docs\Practica4\practica4-api. OBJETIVO: <completar>"
```

**`docker run`** — Crea y arranca un contenedor *nuevo* a partir de una imagen. Es distinto de `docker start` (reusar uno existente): acá siempre es efímero, tal como dice la nota inicial.

**`--rm`** — Borra el contenedor automáticamente cuando el proceso termina. Sin esto, cada ejecución dejaría un contenedor apagado acumulado (`docker ps -a`). Como el agente es desechable, no querés basura.

**`--init`** — Corre un init mínimo (tini) como PID 1 dentro del contenedor. Se encarga de reapear procesos huérfanos (zombies) y de reenviar señales (Ctrl+C, SIGTERM) al proceso real. Importante cuando el agente lanza subprocesos (git, ripgrep, node).

**`-v "${workspace}:/workspace"`** — *Bind mount*: monta la carpeta del host (el worktree resuelto con `Resolve-Path`) dentro del contenedor en `/workspace`. Es el único puente para el código: todo lo que el agente escriba queda en el host, pero el resto de tu disco no es visible.

**`-w /workspace`** — `--workdir`: fija el directorio de trabajo dentro del contenedor. El agente arranca parado en `/workspace`.

**`-e OPENAI_COMPATIBLE_API_KEY=<api-key-para-base-url-en-opencode-jsonc>`** — `--env`: inyecta una variable de entorno en el contenedor, tomando el valor de la variable de tu sesión de PowerShell. Así el agente tiene credencial para el LLM sin hardcodearla (el proveedor `litellm` definido en `opencode.jsonc` la lee de ese nombre).

**`--read-only`** — Monta el filesystem raíz del contenedor como solo lectura. El agente no puede modificar la imagen, ni `/usr`, ni `/etc`; solo puede escribir en volúmenes/tmpfs montados explícitamente.

**`--tmpfs /tmp`** — Monta `/tmp` como tmpfs (RAM). Es la excepción escribible que necesita la mayoría de herramientas para archivos temporales.

**`--tmpfs /root`** — Igual pero para `/root`. OpenCode necesita escribir su config/estado ahí; sin esto, con `--read-only` fallaría al arrancar. Al ser tmpfs, se descarta al apagar el contenedor.

**`--cap-drop ALL`** — Quita *todas* las capacidades de Linux (capabilities) al proceso. Un contenedor root por defecto tiene ~14 capacidades (`CAP_NET_ADMIN`, `CAP_SYS_ADMIN`, etc.); esto las elimina todas. Es el aislamiento más fuerte a nivel de privilegios.

**`--security-opt no-new-privileges:true`** — Impide que el proceso gane privilegios extra vía binarios setuid/setgid o capabilities. Bloquea escaladas de privilegio incluso si algo dentro es explotado.

**`--memory 2g`** — Límite duro de RAM: si el contenedor supera 2 GB, el kernel mata el proceso (OOM). Evita que un agente descontrolado se coma los 16 GB de la máquina.

**`--cpus 2`** — Límite de CPU (equivale a 2 cores). Evita que acapare todo el CPU del host.

**`--pids-limit 256`** — Máximo de procesos/threads dentro del contenedor. Frena *fork bombs* (un proceso que se replica infinitamente).

**`cursodesarrolloagentico2026-agent:latest`** — La imagen a ejecutar (construida en el paso 1). Todo lo anterior son flags de `docker`; lo que viene después ya son argumentos para el contenedor.

**`run --auto "Trabajo autónomo..."`** — Argumentos que se pasan al `ENTRYPOINT` de la imagen, que es `opencode`. O sea, el comando real dentro del contenedor es `opencode run --auto "..."`:
- `run` → subcomando de OpenCode para ejecutar una tarea en modo no interactivo y salir.
- `--auto` → auto-aprueba los permisos no denegados explícitamente (por eso es seguro solo en un contenedor efímero).
- `"..."` → el prompt con la tarea.

> La variante interactiva (paso 3, modo TUI) es idéntica salvo `-it` (TTY + stdin para la TUI) y que no lleva el prompt, solo `--auto`.