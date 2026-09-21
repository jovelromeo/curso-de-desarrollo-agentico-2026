# ArgentinaDatos API — Endpoint Catalog

Base URL: `https://api.argentinadatos.com` · All routes are `GET` → JSON · No auth · No query strings.

Path params are shown as `{name}`. Values and ranges come from the OpenAPI schema.

## Estado

| Path | Params | Returns |
|------|--------|---------|
| `/v1/estado` | — | `Estado { estado, aleatorio }` |

## Eventos

| Path | Params | Returns |
|------|--------|---------|
| `/v1/feriados/{año}` | año: int 2016–2026 | `Feriado[] { fecha, tipo, nombre }` |
| `/v1/feriados-bancarios/{año}` | año: int 2011–2026 | `FeriadoBancario[] { fecha, nombre }` |
| `/v1/eventos/presidenciales` | — | `EventoPresidencial[] { fecha, tipo, evento }` |

## Cotizaciones históricas (dólar)

| Path | Params | Returns |
|------|--------|---------|
| `/v1/cotizaciones/dolares` | — | `Cotizacion[]` (all casas) |
| `/v1/cotizaciones/dolares/{casa}` | casa: enum (below) | `Cotizacion[]` |
| `/v1/cotizaciones/dolares/{casa}/{fecha}` | fecha: `YYYY/MM/DD` | `Cotizacion` (single object) |

`casa` enum: `oficial`, `blue`, `bolsa`, `contadoconliqui`, `cripto`, `mayorista`, `solidario`, `turista`.
`Cotizacion { moneda, casa, fecha, compra, venta }`.

## Finanzas — Índices

| Path | Returns |
|------|---------|
| `/v1/finanzas/indices/inflacion` | `IndiceInflacion[] { fecha, valor }` (mensual) |
| `/v1/finanzas/indices/inflacionInteranual` | `IndiceInflacion[] { fecha, valor }` |
| `/v1/finanzas/indices/uva` | `IndiceUVA[] { fecha, valor }` |
| `/v1/finanzas/indices/riesgo-pais` | `RiesgoPais[] { fecha, valor }` |
| `/v1/finanzas/indices/riesgo-pais/ultimo` | `RiesgoPais` (single) |

## Política — Índices

| Path | Returns |
|------|---------|
| `/v1/politica/indices/confianza-gobierno` | `IndiceConfianzaGobierno[] { fecha, valor, variacion }` |
| `/v1/politica/indices/confianza-gobierno/ultimo` | `IndiceConfianzaGobierno` (single) |

## Finanzas — Tasas

| Path | Returns |
|------|---------|
| `/v1/finanzas/tasas/plazoFijo` | `TasaPlazoFijo[] { entidad, logo, tnaClientes, tnaNoClientes, enlace, tasas[], condiciones, condicionesCorto }` |
| `/v1/finanzas/tasas/plazoFijoUvaPagoPeriodico` | `ProveedorPlazoFijoUvaPagoPeriodico[] { id, entidad, logo, tasas[] }` |
| `/v1/finanzas/tasas/plazoFijoPrecancelable` | `ProveedorPlazoFijoPrecancelable[]` |
| `/v1/finanzas/tasas/depositos30Dias` | `TasaInteres[] { fecha, valor }` |
| `/v1/finanzas/criptopesos` | `Criptopeso[] { token, entidad, tna }` |
| `/v1/finanzas/cuentas-remuneradas-usd` | `CuentaRemuneradaUsd[] { entidad, tasa, tope }` |

`TramoPlazoFijo { montoMinimo, montoMaximo, plazoMinDias, plazoMaxDias, tna }` (nested in `TasaPlazoFijo.tasas`).

## Finanzas — Letras / Remesas / Cobros / Brokers / Créditos

| Path | Returns |
|------|---------|
| `/v1/finanzas/letras` | `LetraCapitalizable[] { ticker, fechaEmision, fechaVencimiento, tem, vpv }` |
| `/v1/finanzas/remesas` | `Remesas { fechaActualizacion, remesas: Remesa[] }` |
| `/v1/finanzas/cobros/comisiones` | `ComisionesCobro { fechaActualizacion, comisiones: ComisionCobro[] }` |
| `/v1/finanzas/brokers/comisiones` | `ComisionesBrokers { fechaActualizacion, comisiones: ComisionBroker[], erroresExtraccion[] }` |
| `/v1/finanzas/creditos/hipotecariosUva` | `HipotecarioUvaTna[] { entidad, nombreComercial, tna, metadata }` |
| `/v1/finanzas/creditos/prestamosPersonales` | `PrestamoPersonal[]` |
| `/v1/finanzas/creditos/prestamosPersonalesBcra` | `PrestamoPersonalBcra[]` |

- `ComisionCobro`: `canal` enum `pos|qr|link|checkout|online|otro`; `medioPago` enum `debito|credito|credito_cuotas|qr_cuenta|prepaga|amex|otro`; `acreditacionTipo` enum `inmediata|anticipada|estandar|desconocida`.
- `ComisionBroker`: `producto` enum `acciones|cedears|bonos|obligaciones_negociables|letras|cauciones|opciones|futuros|fci|cheques|licitaciones|alquiler_titulos`; `operacion` enum `colocadora|tomadora|compra|venta|ambas`; `moneda` `ARS|USD`; `tasaBase` `mensual|anual|tna|null`. Prefer `tasaAnualEquivalente` when `tasaBase` is monthly/annual; respect `tasaEsTope`.

## Finanzas — FCI (valores por fecha)

All six routes share the same shape and accept `{fecha}` = `YYYY/MM/DD` **or** the literals `ultimo` / `penultimo`.

| Path | Returns |
|------|---------|
| `/v1/finanzas/fci/mercadoDinero/{fecha}` | `FondoComunInversion[]` |
| `/v1/finanzas/fci/rentaVariable/{fecha}` | `FondoComunInversion[]` |
| `/v1/finanzas/fci/rentaFija/{fecha}` | `FondoComunInversion[]` |
| `/v1/finanzas/fci/rentaMixta/{fecha}` | `FondoComunInversion[]` |
| `/v1/finanzas/fci/retornoTotal/{fecha}` | `FondoComunInversion[]` |
| `/v1/finanzas/fci/otros/{fecha}` | `FondoComunInversionOtro[]` |
| `/v1/finanzas/fci/variables/{fecha}` | `FondoComunInversionVariable[]` |

`FondoComunInversion { fondo, tipo, fecha, vcp, ccp, patrimonio, horizonte }`; `horizonte` enum `corto|medio|largo`.

## Finanzas — FCI Detalles

| Path | Params | Returns |
|------|--------|---------|
| `/v1/finanzas/fci/fondos` | — | `FondosDetalles { fechaActualizacion, fondos: FondoDetalle[] }` |
| `/v1/finanzas/fci/fondos/{nombre}` | nombre: slug (`mercado-fondo-clase-a`) | `FondoDetalle` |
| `/v1/finanzas/fci/fondos/{nombre}/historico` | nombre: slug | `FondoHistorico { fondoId, claseId, nombre, fechaActualizacion, historico[] }` |

## Finanzas — Rendimientos

| Path | Params | Returns |
|------|--------|---------|
| `/v1/finanzas/rendimientos` | — | `EntidadRendimiento[] { entidad, rendimientos[] }` |
| `/v1/finanzas/rendimientos/{entidad}` | entidad: enum (below) | `Rendimiento[] { moneda, apy, fecha }` |

`entidad` enum: `nexo`, `fiwind`, `letsbit`, `belo`, `lemoncash`, `ripio`, `satoshitango`, `lucamoney`, `decrypto`, `vesseo`, `astropay`, `lunefi`.

## Finanzas — REM (Relevamiento de Expectativas de Mercado)

| Path | Params | Returns |
|------|--------|---------|
| `/v1/finanzas/rem` | — | `string[]` (relative endpoints, e.g. `/finanzas/rem/2026/03`) |
| `/v1/finanzas/rem/ultimo` | — | `RemExpectativa[]` |
| `/v1/finanzas/rem/{año}/{mes}` | año: int ≥2016; mes: string `^(0[1-9]|1[0-2])$` | `RemExpectativa[]` |

`mes` is a zero-padded string: `"03"`, not `3`. `RemExpectativa.sample` enum `todos|top_10`.

## Historia

| Path | Returns |
|------|---------|
| `/v1/presidentes` | `Presidente[] { nombre, inicio, fin, partido, periodoPresidencial, vicepresidente, imagen, partidoImagen }` |

## Congreso — Senado

| Path | Params | Returns |
|------|--------|---------|
| `/v1/senado/senadores` | — | `Senador[]` |
| `/v1/senado/senadores/{id}/viajes` | id: string (`"546"`) | `SenadorViajes { senadorId, nacionales[], internacionales[] }` |
| `/v1/senado/senadores/{id}/comisiones` | id: string | `{ id, nombre, cargo }[]` |
| `/v1/senado/comisiones` | — | `ComisionSenado[]` |
| `/v1/senado/comisiones/{id}` | id: string (`"50"`) | `ComisionSenado` |
| `/v1/senado/presidencia` | — | `PresidenciaSenado` |
| `/v1/senado/viajes` | — | `ViajesSenado { fuente, actualizado, documentos[], nacionales[], internacionales[] }` |
| `/v1/senado/viajes/nacionales` | — | `ViajeNacional[]` |
| `/v1/senado/viajes/nacionales/{año}` | año: int 2018–2026 | `ViajeNacional[]` |
| `/v1/senado/viajes/nacionales/{año}/{mes}` | año 2018–2026; mes 1–12 | `ViajeNacional[]` |
| `/v1/senado/viajes/internacionales` | — | `ViajeInternacional[]` |
| `/v1/senado/viajes/internacionales/{año}` | año: int 2012–2026 | `ViajeInternacional[]` |
| `/v1/senado/actas` | — | `ActaSenado[]` |
| `/v1/senado/actas/{año}` | año: int 2016–2026 | `ActaSenado[]` |

## Congreso — Diputados

| Path | Params | Returns |
|------|--------|---------|
| `/v1/diputados/diputados` | — | `Diputado[]` |
| `/v1/diputados/diputados/{id}/misiones` | id: string (`HCDN3178`) | `DiputadoMisiones` |
| `/v1/diputados/diputados/{id}/viajes` | id: string | `DiputadoViajes` |
| `/v1/diputados/diputados/{id}/comisiones` | id: string | `{ id, nombre, cargo }[]` |
| `/v1/diputados/periodos` | — | `PeriodosDiputados { fuente, actualizado, periodos[] }` |
| `/v1/diputados/periodos/lista` | — | `PeriodoParlamentarioDiputados[]` |
| `/v1/diputados/misiones` | — | `MisionesDiputados { fuente, actualizado, recursos[], misiones[] }` |
| `/v1/diputados/misiones/lista` | — | `MisionOficialDiputado[]` |
| `/v1/diputados/misiones/{año}` | año: int (`2024`) | `MisionOficialDiputado[]` |
| `/v1/diputados/viajes` | — | `ViajesDiputados { fuente, actualizado, recursos[], nacionales[] }` |
| `/v1/diputados/viajes/nacionales` | — | `ViajeNacionalDiputado[]` |
| `/v1/diputados/viajes/conteo-12m` | — | `ViajesConteo12mDiputados` |
| `/v1/diputados/comisiones` | — | `ComisionDiputados[]` |
| `/v1/diputados/comisiones/{id}` | id: string | `ComisionDiputados` |
| `/v1/diputados/actas` | — | `ActaDiputados[]` |
| `/v1/diputados/actas/{año}` | año: int 2016–2026 | `ActaDiputados[]` |

## curl Recipes

```bash
# Simple GET, pretty JSON
curl.exe -s "https://api.argentinadatos.com/v1/estado" | ConvertFrom-Json | ConvertTo-Json -Depth 6

# Show HTTP status
curl.exe -f -sS -w "`nHTTP %{http_code}`n" "https://api.argentinadatos.com/v1/feriados/2026"

# Filter an array result in PowerShell
curl.exe -s "https://api.argentinadatos.com/v1/finanzas/rendimientos" |
  ConvertFrom-Json | ForEach-Object { $_.entidad }

# Dollar quote for a date (slashes in the path)
curl.exe -s "https://api.argentinadatos.com/v1/cotizaciones/dolares/blue/2024/01/01"

# Latest value (single object, not array)
curl.exe -s "https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo"
```
