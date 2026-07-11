import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConflictoException,
  RecursoNoEncontradoException,
} from '../../common/errors/dominio.exception';
import {
  crearRespuestaPaginada,
  RespuestaPaginada,
} from '../../common/pagination/respuesta-paginada';
import { AgenteService } from '../../agente/scoring/agente.service';
import { ContactosService } from '../../contactos/contactos.service';
import { IdeasService } from '../../ideas/idea/ideas.service';
import { GuionesService } from '../guion/guiones.service';
import { Entrevista } from './entrevista.entity';
import { aEntrevistaDto, EntrevistaRespuesta } from './entrevista-respuesta';
import { Cita } from './entrevista.types';
import {
  ActualizarEntrevistaDto,
  AjustarScoreDto,
  CrearCitaRequest,
  CrearEntrevistaDto,
  ListarEntrevistasQuery,
} from './entrevistas.dto';

/** Estados del embudo desde los que no se puede volver a entrevistar. */
const CONTACTO_NO_ENTREVISTABLE = ['entrevistado', 'descartado'];

@Injectable()
export class EntrevistasService {
  constructor(
    @InjectRepository(Entrevista)
    private readonly entrevistas: Repository<Entrevista>,
    private readonly ideas: IdeasService,
    private readonly contactos: ContactosService,
    private readonly guiones: GuionesService,
    private readonly agente: AgenteService,
  ) {}

  /**
   * Dispara el scoring del agente en segundo plano (fire-and-forget). No se hace
   * `await`: la latencia del LLM no debe bloquear la respuesta HTTP. El propio
   * `AgenteService` captura sus errores y deja la entrevista `fallida`; el
   * `.catch` es una red de seguridad para que nada escape al flujo del request.
   */
  private dispararScoring(ownerId: string, entrevista: Entrevista): void {
    void this.agente
      .solicitarScoring(ownerId, entrevista)
      .catch(() => undefined);
  }

  /**
   * Registra una entrevista de una idea propia. Valida el vínculo (contacto de
   * la idea + guión propio → 422 ENTREVISTA_SIN_VINCULO), rechaza un contacto ya
   * `entrevistado`/`descartado` (409), crea con `estadoScoring` `pendiente` y
   * mueve el contacto a `entrevistado`. Idea ajena → 403; inexistente → 404.
   */
  async crear(
    ownerId: string,
    ideaId: string,
    datos: CrearEntrevistaDto,
  ): Promise<EntrevistaRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const contacto = await this.contactos.asegurarVinculoConIdea(
      ideaId,
      datos.contactoId,
    );
    await this.guiones.asegurarVinculo(ownerId, datos.guionId);
    if (CONTACTO_NO_ENTREVISTABLE.includes(contacto.estado)) {
      throw new ConflictoException(
        `El contacto está en estado '${contacto.estado}' y no puede entrevistarse.`,
      );
    }

    const entrevista = this.entrevistas.create({
      ideaId,
      contactoId: datos.contactoId,
      guionId: datos.guionId,
      respuestas: datos.respuestas,
      citas: this.citasConIds(datos.citas),
      estadoScoring: 'pendiente',
      score: null,
      ajuste: null,
    });
    const guardada = await this.entrevistas.save(entrevista);
    await this.contactos.marcarEntrevistado(contacto);
    this.dispararScoring(ownerId, guardada);
    return aEntrevistaDto(guardada);
  }

  /**
   * Lista las entrevistas de una idea propia, paginadas (recientes primero), con
   * filtros opcionales por `contactoId` y `estadoScoring`. Idea ajena → 403;
   * inexistente → 404.
   */
  async listar(
    ownerId: string,
    ideaId: string,
    query: ListarEntrevistasQuery,
  ): Promise<RespuestaPaginada<EntrevistaRespuesta>> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const where = {
      ideaId,
      ...(query.contactoId ? { contactoId: query.contactoId } : {}),
      ...(query.estadoScoring ? { estadoScoring: query.estadoScoring } : {}),
    };
    const [entrevistas, total] = await this.entrevistas.findAndCount({
      where,
      order: { fechaCreacion: 'DESC' },
      skip: (query.pagina - 1) * query.porPagina,
      take: query.porPagina,
    });
    return crearRespuestaPaginada(
      entrevistas.map(aEntrevistaDto),
      total,
      query,
    );
  }

  /** Devuelve una entrevista propia. Idea ajena → 403; inexistente → 404. */
  async obtener(
    ownerId: string,
    ideaId: string,
    idEntrevista: string,
  ): Promise<EntrevistaRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    return aEntrevistaDto(await this.buscarEnIdea(ideaId, idEntrevista));
  }

  /**
   * Edita `respuestas` y/o `citas`. Cambiar `respuestas` reinicia el
   * `estadoScoring` a `pendiente` e invalida el `score` (en el chunk C esto
   * re-disparará el agente); cambiar solo `citas` no afecta el scoring. Nunca
   * cambia `ideaId`/`contactoId`/`guionId`. Idea ajena → 403; inexistente → 404.
   */
  async actualizar(
    ownerId: string,
    ideaId: string,
    idEntrevista: string,
    datos: ActualizarEntrevistaDto,
  ): Promise<EntrevistaRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const entrevista = await this.buscarEnIdea(ideaId, idEntrevista);
    const respuestasCambiaron = datos.respuestas !== undefined;
    if (datos.respuestas !== undefined) {
      entrevista.respuestas = datos.respuestas;
      entrevista.estadoScoring = 'pendiente';
      entrevista.score = null;
    }
    if (datos.citas !== undefined) {
      entrevista.citas = this.citasConIds(datos.citas);
    }
    const guardada = await this.entrevistas.save(entrevista);
    // Cambiar las respuestas re-dispara el scoring; editar solo citas no.
    if (respuestasCambiaron) {
      this.dispararScoring(ownerId, guardada);
    }
    return aEntrevistaDto(guardada);
  }

  /** Elimina una entrevista propia. Idea ajena → 403; inexistente → 404. */
  async eliminar(
    ownerId: string,
    ideaId: string,
    idEntrevista: string,
  ): Promise<void> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const entrevista = await this.buscarEnIdea(ideaId, idEntrevista);
    await this.entrevistas.remove(entrevista);
  }

  /**
   * Registra el ajuste humano del score conservando el bloque `score` del agente
   * intacto. Idea ajena → 403; inexistente → 404.
   */
  async ajustarScore(
    ownerId: string,
    ideaId: string,
    idEntrevista: string,
    datos: AjustarScoreDto,
  ): Promise<EntrevistaRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const entrevista = await this.buscarEnIdea(ideaId, idEntrevista);
    entrevista.ajuste = {
      scoreAjustado: datos.scoreAjustado,
      nota: datos.nota,
      fechaAjuste: new Date().toISOString(),
    };
    return aEntrevistaDto(await this.entrevistas.save(entrevista));
  }

  /** Genera el `id` de cada cita de entrada (o arreglo vacío si no hay). */
  private citasConIds(citas?: CrearCitaRequest[]): Cita[] {
    return (citas ?? []).map((c) => ({
      id: randomUUID(),
      texto: c.texto,
      contexto: c.contexto,
    }));
  }

  /**
   * Carga una entrevista exigiendo que pertenezca a la idea (ya verificada como
   * propia). Inexistente o de otra idea → 404.
   */
  private async buscarEnIdea(
    ideaId: string,
    idEntrevista: string,
  ): Promise<Entrevista> {
    const entrevista = await this.entrevistas.findOne({
      where: { id: idEntrevista, ideaId },
    });
    if (!entrevista) {
      throw new RecursoNoEncontradoException(
        'La entrevista solicitada no existe en esta idea.',
      );
    }
    return entrevista;
  }
}
