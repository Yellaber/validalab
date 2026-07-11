## 1. Esquema de paginación reutilizable

- [x] 1.1 Añadir `paginacionSchema` y el helper `esquemaPaginado(item)` en `common/pagination`
- [x] 1.2 Reescribir los 7 `*Paginadas` (entrevistas, guiones, ideas, contactos, alertas, veredictos, usuarios) con `esquemaPaginado(<item>)`; ajustar imports
- [x] 1.3 `npm test` + `build` verdes; verificar que `/docs-json` no cambia de forma para las colecciones

## 2. Cálculo de costo y aclaración únicos

- [x] 2.1 Añadir la función pura `costoDe(precio, tokensEntrada, tokensSalida)` en `precios/precio.util.ts` y una constante compartida `ACLARACION_COSTO`
- [x] 2.2 `CostoService` consume `costoDe` (por ejecución) y `ACLARACION_COSTO`; eliminar la fórmula/texto locales
- [x] 2.3 `ReevaluacionService` consume `costoDe` (tokens agregados) y `ACLARACION_COSTO`; eliminar los locales
- [x] 2.4 `npm test` verde (los specs de costo/reevaluación siguen pasando sin cambiar asserts)

## 3. Limpieza local

- [x] 3.1 `CostoService.costoUsuario`: calcular `proveedorDe(ejecuciones)` una sola vez
- [x] 3.2 `AgenteService`: extraer `estaAlDia(entrevista, hash)` y usarlo en `solicitarScoring` y `reevaluar`

## 4. Verificación

- [x] 4.1 `openspec validate --strict`; `npm test` (236) verde sin reescribir asserts; `eslint` en modo check limpio; `build` OK
- [x] 4.2 Confirmar que ningún contrato/endpoint/respuesta cambió (comportamiento idéntico)
