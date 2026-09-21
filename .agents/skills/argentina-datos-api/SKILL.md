---
name: argentina-datos-api
description: Use when a task needs live Argentine public data (feriados, cotizaciones del dólar, inflación, UVA, riesgo país, tasas, FCI, remesas, presidentes, senadores, diputados) from api.argentinadatos.com, or when calling that API with curl.
---

# ArgentinaDatos API (curl)

## Overview
Reference for the public, unofficial **ArgentinaDatos** API (`https://api.argentinadatos.com`). Every endpoint is `GET`, returns JSON, needs no auth, and takes parameters only as path segments — never query strings.

Full endpoint catalog: [reference/endpoints.md](reference/endpoints.md)

## When to Use
Use when fetching Argentine data from `api.argentinadatos.com`: holidays, dollar quotes, inflation/UVA/riesgo país, bank rates, FCI funds, remittances, broker/POS fees, presidents, Senate and Chamber of Deputies. Do NOT use for other hosts or for endpoints absent from the docs.

## Core Pattern
```bash
curl.exe -s "https://api.argentinadatos.com/v1/<path>"
```
- In PowerShell 7 call `curl.exe` (not `curl`) to avoid any `Invoke-WebRequest` alias.
- Fail loudly: `curl.exe -f -sS -w "`nHTTP %{http_code}`n" "<url>"`.
- Pretty-print without `jq`: `curl.exe -s "<url>" | ConvertFrom-Json | ConvertTo-Json -Depth 6`.
- Arrays can be large. Parse with `ConvertFrom-Json` and filter/select in PowerShell instead of dumping raw output.

## Conventions and Gotchas
- **Dates** in paths use `YYYY/MM/DD` with slashes (cotizaciones and all FCI). Example `2024/01/01`.
- **FCI endpoints** accept the literals `ultimo` and `penultimo` instead of a date.
- `{año}` / `{mes}` are placeholder *values*, not the literal word. For REM, `{mes}` is a zero-padded **string** `"01"`–`"12"`.
- `/ultimo` (riesgo-pais, confianza-gobierno, REM) returns a single object, not an array.
- Rates (`tna`, `tea`, `apy`, `arancel`) are **decimals**: `0.23` = 23%, unless the field says "en porcentaje".
- Paths are case-sensitive and have no trailing slash (`plazoFijo`, `rentaVariable`, `inflacionInteranual`, `hipotecariosUva`).

## Quick Reference

| Area | Example endpoint |
|------|------------------|
| Estado | `/v1/estado` |
| Feriados | `/v1/feriados/2026` |
| Dólar | `/v1/cotizaciones/dolares/blue` |
| Inflación | `/v1/finanzas/indices/inflacion` |
| Riesgo país | `/v1/finanzas/indices/riesgo-pais/ultimo` |
| Tasas | `/v1/finanzas/tasas/plazoFijo` |
| FCI | `/v1/finanzas/fci/mercadoDinero/ultimo` |
| REM | `/v1/finanzas/rem/ultimo` |
| Presidentes | `/v1/presidentes` |
| Senado | `/v1/senado/senadores` |
| Diputados | `/v1/diputados/diputados` |

## Common Mistakes
- Calling `curl` instead of `curl.exe` in PowerShell (alias to `Invoke-WebRequest` in some shells).
- Sending `2024-01-01` instead of `2024/01/01` to cotizaciones/FCI.
- Treating `/ultimo` responses as arrays.
- Reading `tna`/`tea` as percentages when they are decimals (`0.015` = 1.5%).
- Inventing query params (`?anio=2026`); this API uses path segments only.
