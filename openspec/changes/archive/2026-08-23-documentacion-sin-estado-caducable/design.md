## Context

Seis archivos de documentación, ninguna línea de código. Lo que hace este change menos trivial de lo que parece es que la corrección obvia —reescribir el texto con los datos de hoy— es precisamente la que garantiza repetir el trabajo.

Tres hechos delimitan el diseño:

1. **Los `CLAUDE.md` se cargan en cada sesión asistida.** Su coste de estar mal no es que alguien lea algo desactualizado: es que el trabajo parte de premisas falsas.
2. **El repositorio ya tiene una fuente de verdad del alcance implementado**: `openspec/specs/` lista las capacidades vigentes y se actualiza en cada archivado. Duplicar esa información en prosa crea una segunda fuente que solo puede divergir.
3. **Existe una capacidad previa**, `guias-claude-md-paquetes`, que gobierna cómo se redactan las guías de paquete (español, skills de Angular, delegación de convenciones). Sus tres requisitos siguen siendo ciertos y no se tocan.

## Goals / Non-Goals

**Goals:**
- Que los `CLAUDE.md` dejen de inducir a error en cada sesión.
- Eliminar la causa estructural del desfase, no solo sus síntomas actuales.
- Corregir las referencias verificablemente falsas (archivos y rutas que no existen).
- Dar a los README de paquete un contenido propio sin crear duplicación.

**Non-Goals:**
- Cambiar código, contrato o comportamiento.
- Convertir los `CLAUDE.md` en un inventario de lo construido.
- Documentar el `CHANGELOG.md`, cuyo propósito **es** registrar instantáneos.
- Reescribir las secciones que siguen siendo exactas.

## Decisions

### D1 — Se elimina el estado, no se actualiza
La alternativa evaluada era reescribir las secciones de estado con los datos de hoy: «E0–E8 completas, 12 módulos, 16 migraciones, 39 suites». Es más informativo de un vistazo y se descarta porque **vuelve a ser falso con el siguiente change**. La frase «solo el `AppController` por defecto hasta ahora» fue cierta el día que se escribió; el problema no es que estuviera mal redactada, es que afirmaba algo que el tiempo invalida.

Un documento que no afirma un instantáneo no puede quedar obsoleto. Las secciones de estado se eliminan y, donde aporta, se sustituyen por un puntero a dónde vive la respuesta viva: `openspec/specs/` para capacidades y el código para el detalle.

El criterio operativo para distinguir qué se queda y qué se va: **¿esta frase seguirá siendo cierta después del próximo change?** «Cada consulta filtra por `owner_id`» sí — es una regla. «Aún no hay capa HTTP» no — es un instantáneo. Las reglas se quedan aunque describan el presente; los inventarios se van aunque hoy sean exactos.

### D2 — Los invariantes se quedan aunque suenen a estado
Hay afirmaciones que parecen estado y son invariantes vigentes: el modo laxo de TypeScript del backend, que el frontend no tiene ESLint ni framework e2e, que no hay workspace manager en la raíz. Se conservan porque describen **decisiones activas del proyecto** —cosas que quien trabaje ahí necesita saber para no asumir lo contrario—, no hitos de avance.

La distinción no siempre es nítida y por eso el criterio de D1 se escribe explícitamente en la capacidad: quien mantenga estos archivos necesita la regla, no solo el resultado de aplicarla hoy.

### D3 — Los README de paquete no duplican el raíz
Cada README de paquete queda en lo mínimo con valor propio: qué es ese paquete, sus comandos reales y punteros al README raíz (dominio, contrato, flujo de ramas) y a su `CLAUDE.md` (arquitectura y convenciones).

La alternativa —READMEs autónomos y completos, legibles sin abrir el raíz— tiene un argumento real: si algún día los paquetes se separan en repositorios distintos, ya estarían listos. Se descarta porque paga hoy un coste cierto (tres documentos que mantener sincronizados) por un beneficio hipotético, y porque la duplicación es la causa raíz de la clase de problema que este change resuelve. Si esa separación llega, escribir los README entonces será trabajo menor comparado con haberlos mantenido divergiendo durante meses.

Borrarlos también se consideró: cero duplicación y cero mantenimiento, pero GitHub dejaría de mostrar nada al navegar a esas carpetas, que es una regresión de experiencia por un ahorro mínimo.

### D4 — Capacidad nueva en vez de modificar la existente
`guias-claude-md-paquetes` gobierna **cómo** se redactan las guías de paquete: idioma, referencia a las skills de Angular, delegación de las convenciones de estilo. Ninguno de sus tres requisitos cambia.

Lo que este change introduce es **qué puede afirmar** la documentación, y aplica por igual a los `CLAUDE.md` y a los README —incluido el raíz, que aquella capacidad no cubre—. Meterlo dentro de una capacidad cuyo nombre habla de «guías CLAUDE.md de paquete» lo dejaría fuera de sitio para la mitad de los archivos que gobierna.

Quedan como capacidades complementarias y sin solape: una dice cómo se escriben las guías de paquete, la otra qué puede afirmar la documentación del repositorio.

### D5 — Las referencias citadas deben existir
Los errores encontrados (`src/app.controller.spec.ts` como ejemplo de un archivo inexistente, `test/jest-e2e.json` con la extensión equivocada) comparten naturaleza: son rutas y comandos concretos que la documentación ofrece y que ya no resuelven.

Se corrigen, y la capacidad recoge la exigencia de forma verificable: todo comando o ruta citado debe existir. Es el tipo de requisito que se puede comprobar mecánicamente si algún día se quiere automatizar.

## Risks / Trade-offs

- **Se pierde el resumen de «qué hay hecho» de un vistazo** → es el precio deliberado de D1. Lo mitiga que `openspec/specs/` lo responde mejor y siempre al día, y que el `README.md` raíz conserva el roadmap por épicas, que es estable porque viene del SRS.
- **El criterio «invariante vs. estado» admite zona gris** → mitigado por D2 y por escribir el criterio en la capacidad, no solo aplicarlo.
- **Los README de paquete quedan escuetos** → intencionado. Un README corto y cierto vale más que uno extenso que diverge; y quien necesite más tiene los dos punteros a un clic.
- **Este change no impide que alguien vuelva a añadir una sección de estado** → cierto: la capacidad lo prohíbe, pero nada lo verifica automáticamente. Convertirlo en una comprobación de CI sería posible y queda fuera de alcance; hoy el valor está en dejar escrito el porqué.

## Migration Plan

No aplica: solo documentación, sin efecto en código, contrato ni despliegue.

## Open Questions

Ninguna. El enfoque (eliminar el estado en vez de actualizarlo) y la forma de los README de paquete (cortos, sin duplicar) los decidió el usuario; el resto queda resuelto arriba.
