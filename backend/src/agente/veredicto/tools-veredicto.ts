import { tool } from '@langchain/core/tools';
import { StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { HipotesisService } from '../../ideas/hipotesis/hipotesis.service';
import { UmbralesService } from '../../ideas/umbral/umbrales.service';
import { TableroIdea } from '../../kpis/tablero/kpis-respuesta';

/** Colaboradores de dominio que respaldan las tools del veredicto. */
export interface DepsToolsVeredicto {
  hipotesis: HipotesisService;
  umbrales: UmbralesService;
}

/** Contexto de la emisión, con el snapshot CONGELADO sobre el que se razona. */
export interface ContextoVeredicto {
  ownerId: string;
  ideaId: string;
  snapshot: TableroIdea;
}

/**
 * Construye, POR EMISIÓN, las tools del veredicto (RF-AG-04): `calcularKPIs`
 * (devuelve el snapshot CONGELADO, no recalcula, para que el razonamiento y lo
 * persistido sean consistentes), `consultarHipotesis` y `consultarUmbrales`.
 * Todas operan acotadas al owner e idea del veredicto.
 */
export function crearToolsVeredicto(
  deps: DepsToolsVeredicto,
  contexto: ContextoVeredicto,
): StructuredToolInterface[] {
  const calcularKPIs = tool(
    () => Promise.resolve(JSON.stringify(contexto.snapshot)),
    {
      name: 'calcularKPIs',
      description:
        'Devuelve el tablero de KPIs congelado (valores, umbrales y zona) sobre el que se emite el veredicto.',
      schema: z.object({}),
    },
  );

  const consultarHipotesis = tool(
    async () =>
      JSON.stringify(
        await deps.hipotesis.listar(contexto.ownerId, contexto.ideaId),
      ),
    {
      name: 'consultarHipotesis',
      description:
        'Devuelve las hipótesis (problema/mercado/pago) de la idea, con su estado.',
      schema: z.object({}),
    },
  );

  const consultarUmbrales = tool(
    async () =>
      JSON.stringify(
        await deps.umbrales.listar(contexto.ownerId, contexto.ideaId),
      ),
    {
      name: 'consultarUmbrales',
      description:
        'Devuelve los umbrales kill/go por KPI de la idea; son el criterio que orienta la decisión.',
      schema: z.object({}),
    },
  );

  return [calcularKPIs, consultarHipotesis, consultarUmbrales];
}
