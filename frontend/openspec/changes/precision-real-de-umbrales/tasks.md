## 1. Preparación

- [ ] 1.1 Consultar la skill `angular-developer` antes de tocar código Angular (signals, `computed`, testing zoneless)
- [ ] 1.2 Releer `src/app/features/ideas/umbrales/unidad-kpi.ts` y el método `vistaDe` de `umbrales.ts`, y localizar en `unidad-kpi.spec.ts` y `umbrales.spec.ts` los tests que hoy afirman el redondeo de presentación

## 2. Presentación fiel (`unidad-kpi.ts`)

- [ ] 2.1 Quitar el redondeo a `decimales` de `aPresentacion`: que solo convierta de transporte a presentación (×100 en `porcentaje`, identidad en el resto)
- [ ] 2.2 Añadir el saneamiento de ruido IEEE-754 a 10 decimales en `aPresentacion`, con un nombre que deje claro que no es redondeo de presentación (p. ej. una constante `DECIMALES_SANEAMIENTO`)
- [ ] 2.3 Añadir el helper que garantiza notación decimal (detecta la notación exponencial de `String()` y la reescribe con `toFixed` recortando ceros finales) y usarlo en `textoDe`
- [ ] 2.4 Verificar que `aTransporte` sigue redondeando a `decimalesTransporte` — es el único punto donde el redondeo debe sobrevivir

## 3. Validación solo sobre lo editado (`umbrales.ts`)

- [ ] 3.1 En `vistaDe`, calcular `goCambiado`/`killCambiado` **antes** de validar y aplicar `motivoFueraDeRango` únicamente a los campos editados
- [ ] 3.2 Mantener la comparación `umbralKill ≤ umbralGo` siempre, evaluándola sobre el valor efectivo de cada campo (el tecleado si cambió, el vigente si no)
- [ ] 3.3 Comprobar que `puedeGuardar` sigue siendo correcto: una fila con un valor vigente impresentable para su unidad debe poder guardarse si el usuario corrige el otro campo
- [ ] 3.4 Confirmar que `guardar()` no cambia: el reenvío intacto de los campos no editados ya está resuelto y no debe tocarse

## 4. Tests

- [ ] 4.1 Actualizar en `unidad-kpi.spec.ts` los casos de `aPresentacion`/`textoDe` que esperaban el valor redondeado, para que esperen el valor íntegro
- [ ] 4.2 Añadir tests de `aPresentacion`/`textoDe` para: valor más preciso que la unidad (`0.3333` → `33.33`), ruido de coma flotante (`0.30000000000000004` → `30`) y magnitud pequeña sin notación exponencial
- [ ] 4.3 Sustituir el test del invariante «todo valor que llega del contrato pasa su propia validación» por el invariante reformulado: **un valor vigente nunca bloquea su fila**
- [ ] 4.4 Añadir en `umbrales.spec.ts` el escenario de fila con valor vigente muy preciso: la fila no muestra error, el otro campo se edita y guarda, y el campo intacto viaja con su valor original
- [ ] 4.5 Añadir el test que fija que teclear más decimales de los admitidos se sigue rechazando (la asimetría de D6 es deliberada, no un descuido)
- [ ] 4.6 Añadir el test que fija que dos valores almacenados distintos ya no producen el mismo texto, de modo que editar de uno a otro no se confunda con «sin cambios»
- [ ] 4.7 Verificar que los tests nuevos de presentación fiel fallan contra el código anterior (p. ej. con `git stash` del fuente), para que no pasen por casualidad

## 5. Cierre

- [ ] 5.1 Ejecutar `npm test -- --no-watch` y dejar la suite completa en verde
- [ ] 5.2 Ejecutar `npm run build` y confirmar que compila sin errores ni avisos de presupuesto
- [ ] 5.3 Pasar Prettier sobre los archivos tocados (`npx prettier --check`)
- [ ] 5.4 Revisar el diff contra la spec del change: cada requisito modificado tiene su implementación y cada escenario su test
- [ ] 5.5 Ejecutar `/opsx:verify` antes de archivar el change
