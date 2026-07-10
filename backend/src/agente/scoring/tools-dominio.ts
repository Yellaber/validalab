import { tool } from '@langchain/core/tools';
import { StructuredToolInterface } from '@langchain/core/tools';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Entrevista } from '../../entrevistas/entrevista/entrevista.entity';
import { HipotesisService } from '../../ideas/hipotesis/hipotesis.service';
import { UmbralesService } from '../../ideas/umbral/umbrales.service';

/** Colaboradores de dominio que respaldan las tools del agente. */
export interface DepsToolsDominio {
  hipotesis: HipotesisService;
  umbrales: UmbralesService;
  entrevistas: Repository<Entrevista>;
}

/**
 * Contexto de la ejecución, derivado de la entrevista puntuada. El agente NUNCA
 * provee `ownerId`/`ideaId`: se cierran aquí (igual que en HTTP se derivan del
 * token, no del cuerpo), de modo que ninguna tool pueda alcanzar datos ajenos.
 */
export interface ContextoScoring {
  ownerId: string;
  ideaId: string;
  entrevistaId: string;
}

/**
 * Construye, POR EJECUCIÓN, las tools de dominio del agente (RF-AG-04/05):
 * `consultarHipotesis`, `consultarUmbrales`, `consultarEntrevistas`. Los
 * argumentos se validan con Zod; un argumento inválido lo devuelve LangChain al
 * agente para autocorrección sin romper el flujo. Todas operan acotadas al owner
 * e idea de la entrevista.
 */
export function crearToolsDominio(
  deps: DepsToolsDominio,
  contexto: ContextoScoring,
): StructuredToolInterface[] {
  const consultarHipotesis = tool(
    async () => {
      const hipotesis = await deps.hipotesis.listar(
        contexto.ownerId,
        contexto.ideaId,
      );
      return JSON.stringify(hipotesis);
    },
    {
      name: 'consultarHipotesis',
      description:
        'Devuelve las hipótesis (problema/mercado/pago) de la idea de esta entrevista, con su estado.',
      schema: z.object({}),
    },
  );

  const consultarUmbrales = tool(
    async () => {
      const umbrales = await deps.umbrales.listar(
        contexto.ownerId,
        contexto.ideaId,
      );
      return JSON.stringify(umbrales);
    },
    {
      name: 'consultarUmbrales',
      description:
        'Devuelve los umbrales kill/go por KPI de la idea; son el criterio que orienta la validación.',
      schema: z.object({}),
    },
  );

  const consultarEntrevistas = tool(
    async ({ limite }: { limite: number }) => {
      const filas = await deps.entrevistas.find({
        where: { ideaId: contexto.ideaId },
        order: { fechaCreacion: 'DESC' },
        take: limite,
      });
      const otras = filas
        .filter((e) => e.id !== contexto.entrevistaId)
        .map((e) => ({
          id: e.id,
          estadoScoring: e.estadoScoring,
          score: e.score?.score ?? null,
          respuestas: e.respuestas.map((r) => r.texto),
        }));
      return JSON.stringify(otras);
    },
    {
      name: 'consultarEntrevistas',
      description:
        'Devuelve otras entrevistas de la misma idea (para comparar señales), con su score si lo tienen.',
      schema: z.object({
        limite: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(5)
          .describe('Máximo de entrevistas a traer (1–20).'),
      }),
    },
  );

  return [consultarHipotesis, consultarUmbrales, consultarEntrevistas];
}
