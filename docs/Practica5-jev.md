# Práctica 5: Jev 1.13, modelo de decisiones (System One)

> Pre-requisitos: un navegador moderno y una **API key de OpenRouter** (se crea en https://openrouter.ai/settings/keys). No hace falta backend ni Node: el playground es un único archivo HTML.

Esta primera parte cubre los **fundamentos**. La práctica guiada (ejercicios con consignas) se agrega más adelante sobre la misma base.

## 1. Qué es Jev (y qué no es)

Jev es un modelo **System One** de [TypeSafe](https://typesafe.ai): no genera texto, **toma decisiones estructuradas**. Se le envía un `state` (texto, objeto o arreglo) junto con una o más **preguntas tipadas**, y devuelve respuestas tipadas con **probabilidades calibradas**. No hay prosa ni traza de razonamiento que parsear.

- **Modelo (obligatorio, fijo):** `typesafe/jev-1.13`. No se usa `typesafe/jev-router`.
- **Contexto:** 32.000 tokens. **Entrada:** $0.042 por millón de tokens. **Salida: gratis.**
- **Proveedor:** TypeSafe, enrutado por OpenRouter.
- Sirve para **routing, clasificación, ranking, verificación** y otros puntos de decisión donde importa una respuesta predecible y tipada.

### Las tres primitivas

| Primitiva | Pregunta | Respuesta |
| --- | --- | --- |
| `noul` | Sí / no | `noul`: P(sí) entre 0 y 1 |
| `choice` | Elegir una opción de un conjunto | `choice`, `confidence` y `probabilities{}` por opción |
| `score` | Posición en una escala ordenada | `score` (índice ponderado), `confidence`, `probabilities{}` y `legend{}` |

> Las preguntas de un mismo request se responden **en paralelo** y no se ven entre sí. Poné en un solo request todas las preguntas independientes sobre el mismo `state`.

## 2. La Decisions API

Jev se llama por HTTP plano (hay CORS abierto, por eso el playground funciona desde el navegador):

```pwsh
curl https://openrouter.ai/api/alpha/decisions `
  -H "Authorization: Bearer $env:OPENROUTER_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{
    "model": "typesafe/jev-1.13",
    "state": { "ticket": "My checkout page shows a blank screen after I click Pay." },
    "questions": {
      "is_bug": {
        "type": "noul",
        "instructions": "Is the customer reporting a software defect?",
        "criteria": { "true": "Broken or unexpected behavior.", "false": "Question or feature request." }
      },
      "team": {
        "type": "choice",
        "instructions": "Which team should own this ticket?",
        "criteria": {
          "payments": "Checkout, billing, or payment issues.",
          "frontend": "Rendering, layout, or browser compatibility.",
          "account": "Login, permissions, or profile."
        }
      },
      "urgency": {
        "type": "score",
        "instructions": "How urgent is this ticket?",
        "criteria": ["Can wait for the next release", "Should be fixed this week", "Blocking revenue right now"]
      }
    }
  }'
```

Respuesta (recortada):

```json
{
  "model": "typesafe/jev-1.13-20260917",
  "answers": {
    "is_bug": { "type": "noul", "noul": 0.96 },
    "team": { "type": "choice", "choice": "payments", "confidence": 0.67, "probabilities": { "payments": 0.78, "frontend": 0.22, "account": 0 } },
    "urgency": { "type": "score", "score": 1.99, "confidence": 0.99, "probabilities": { "0": 0, "1": 0, "2": 1 }, "legend": { "0": "...", "1": "...", "2": "..." } }
  },
  "usage": { "input_tokens": 476, "output_tokens": 70, "cost": 0.000019992 }
}
```

Cómo leerlo:

- `noul` es P(sí). Cerca de `0.5` significa que está repartido, no "medio bug".
- `choice.probabilities` compara las alternativas; `confidence` resume qué tan concentrada está la distribución.
- `score` es la posición ponderada en tu escala (índice `0` = primer criterio).
- `usage.cost` es lo que costó la llamada en USD. La salida no se cobra.

## 3. Seguridad de la API key

> **Advertencia:** OpenRouter recomienda **no exponer la API key en código de frontend**. Este playground es una excepción de práctica local: vos ingresás tu propia key, que se guarda **solo en memoria** (variable JS, se pierde al recargar) y se envía directo a OpenRouter. No se escribe en `localStorage`, `sessionStorage` ni cookies, y no se loguea.
>
> Para cualquier uso real, el navegador **no** debe hablar con el proveedor: poné un backend/proxy que guarde la key y exponga tu propia ruta. Nunca commitees ni publiques una key.

## 4. Cómo abrir el playground

Archivo: [`Practica5/jev-playground.html`](./Practica5/jev-playground.html)

1. Abrilo directamente en el navegador (doble clic). El fetch cross-origin a OpenRouter funciona por CORS.
2. Si tu navegador bloquea `fetch` desde `file://`, serví la carpeta con un servidor estático, por ejemplo:
   ```pwsh
   bunx serve .\docs\Practica5
   ```
   (o `python -m http.server 8080 -d .\docs\Practica5`) y entrá a `http://localhost:8080/jev-playground.html`.
3. Pegá tu API key en el campo de arriba y presioná **Guardar en memoria**. El modelo es fijo: `typesafe/jev-1.13`.

El encabezado muestra un medidor de uso: llamadas, tokens de entrada, costo acumulado y proyección de costo cada 1000 llamadas.

## 5. El simulador: 🏁 auto-drive con Jev de copiloto

La página tiene una única sección expandible. Es un **simulador de conducción autónoma**: en cada tick se genera telemetría real del auto, se envía a Jev como `state`, y Jev devuelve las órdenes de conducción. El auto recorre un circuito procedural (vista top-down en `<canvas>`) **de forma autónoma** y completa vueltas.

### Arquitectura: Jev decide, un lazo local garantiza

Jev es el **copiloto de alto nivel**: elige dirección, volante, freno y acelerador. La pista está pensada para exigirlo: rectas largas para acelerar y curvas cerradas (55–75 m) que **obligan a frenar**. Para que una decisión imprecisa no arruine la vuelta, la simulación mezcla la orden de Jev con un controlador *pure-pursuit* (lazo local) de forma **proporcional al error**: Jev manda mientras el auto está cerca de la trazada, y el lazo local entra solo cuando se desvía.

- `δ_jev` = dirección (`left`/`right`) × `steering_percent` × `25°` (volante máximo).
- `δ_pp` = volante que apunta a un punto de la línea central a `Ld ≈ 0.4·v + 4 m` adelante (6–12 m).
- Peso de corrección `w = max(|error_lateral| / 4.5 m, |error_rumbo| / 16°)`, acotado a `[0, 1]`.
- Volante final: `δ = δ_jev·(1 − w) + δ_pp·w`, limitado por la **tasa de giro** (18°/tick) y por el volante máximo.
- **Red de seguridad:** si `w > 0.9` (muy desviado) el lazo local aplica al menos 40% de freno para recuperar.

Además, la física **castiga el exceso de velocidad**: el agarre lateral es finito (`μ`), así que si el auto entra muy rápido a una curva **subvira** (gira menos de lo pedido) y se va de ancho. Por eso `speed_limit` es la clave de la decisión: es la velocidad máxima segura **ahora**, considerando las curvas por delante y la distancia de frenado. Si Jev no frena a tiempo, el auto se sale. Validado: un Jev sensato completa vueltas a ~95 km/h con frenadas; un Jev pasivo (siempre "recto", sin frenar) se sale.

### Entradas (state) — telemetría real de la simulación

| Campo | Descripción | Emoji |
| --- | --- | --- |
| `speed` | velocidad actual (km/h) | 💨 |
| `speed_limit` | velocidad máxima segura **ahora** (km/h), según curvas y distancia de frenado | 🚦 |
| `steering_angle` | ángulo de volante actual (grados, ±25°) | 🎯 |
| `lateral_error` | distancia a la línea central (m; **+ = a la derecha**) | ↔️ |
| `heading_error` | desvío de rumbo respecto de la pista (grados; **+ = apunta a la izquierda**) | 🧭 |
| `track_ahead` | curvas por delante a 15/45/80/120/170 m: `{ d, curvature, dir }` | 🛣️ |
| `grip` | superficie: `dry` / `wet` / `gravel` (limita la velocidad máxima) | 🌤️ |
| `visibility` | `good` / `low` | 🌫️ |
| `tire_wear` | desgaste de neumáticos (%, sube con velocidad y salidas) | 🛞 |
| `next_report_ms` | ms hasta el próximo reporte (**fijo en 500 ms** = `dt`) | ⏱️ |

> **Signos de los errores (importante para Jev):** `lateral_error > 0` = el auto está a la derecha de la línea → hay que girar a la **izquierda**. `heading_error > 0` = el auto apunta a la izquierda de la pista → hay que girar a la **derecha**. Estas convenciones están escritas en las `instructions` de la pregunta.

### Salidas de Jev (questions)

| Salida | Primitiva | Emoji |
| --- | --- | --- |
| `steering_direction` | `choice` → `left` / `straight` / `right` (+ `confidence`, `probabilities`) | ⬅️⬆️➡️ |
| `steering_percent` | `score` 5 niveles → `% = score × 25` | 🎯 |
| `brakes_percent` | `score` 5 niveles | 🛑 |
| `acceleration_percent` | `score` 5 niveles (acelerador) | ⚡ |
| `alert` | `choice` → `none` / `watch` / `act` | ⚠️ |

> **Cómo se obtiene un porcentaje:** Jev no devuelve números libres. El `score` es una posición ponderada sobre una escala ordenada; con `criteria = ["0%","25%","50%","75%","100%"]`, el índice (`0`–`4`) se multiplica por 25 y da el porcentaje.

### Cómo jugar

1. Cargá la API key (queda solo en memoria).
2. **▶️ Iniciar** para que Jev maneje solo, o **⏭️ Paso** para un tick manual.
3. **🎲 Nuevo circuito** genera otra pista; **🔄 Reiniciar** vuelve el auto al inicio (y sortea superficie/visibilidad).
4. Mirá el panel de **📡 Telemetría** (state real), **🧠 Decisión** (dirección + barras de %) y **🧾 Historial**. El auto se pone 🚧 rojo cuando sale de pista, y aparece **🛡️** cuando el lazo local está corrigiendo.

### Detalles de implementación

- **Pista:** circuito cerrado generado como **rectángulo redondeado** (~150–185 × 100–130 m, curvas de 55–75 m de radio, ~950–1150 m de longitud): dos rectas largas para acelerar y cuatro curvas que obligan a frenar. La curvatura se calcula por muestra y `track_ahead` sale de la pista real.
- **Física:** modelo de bicicleta real sobre el estado `(x, y, θ, v, δ)` con `L = 2.5 m`, `δ_max = 25°` y `dt` fijo de 0.5 s. La posición y el rumbo se integran de verdad; hay **subviraje por límite de agarre** (si `v²·κ` supera `μ·g`, el auto gira menos y se va de ancho) y roce extra fuera de pista. La detección de "fuera de pista" es `|lateral_error| > 9 m` (semiancho).
- **Entorno:** `grip`, `visibility` y `tire_wear` cambian en el tiempo; `grip` fija el agarre y la velocidad máxima (~97/72/54 km/h en seco/mojado/gravilla) y el desgaste reduce el agarre.
- **Ritmo:** se mantiene **1 request en vuelo** (el loop espera la respuesta antes del próximo tick), así no se disparan llamadas ni se llega a `429`.
- **Métricas:** vueltas completadas (por distancia recorrida), tiempo fuera de pista e incidentes, error lateral promedio/máximo.

## 6. Enlaces de referencia

- Modelo: https://openrouter.ai/typesafe/jev-1.13
- Guía de Jev: https://openrouter.ai/docs/guides/community/jev
- Tutorial: https://openrouter.ai/docs/guides/community/jev-tutorial
- Cookbook de clasificación: https://openrouter.ai/docs/cookbook/evaluate-and-optimize/jev-classification
- Referencia de la Decisions API: https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request
- Primitivas y confianza (TypeSafe): https://docs.typesafe.ai/primitives · https://docs.typesafe.ai/confidence
