import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccesoDenegadoException,
  ConflictoException,
  RecursoNoEncontradoException,
} from '../../common/errors/dominio.exception';
import {
  crearRespuestaPaginada,
  RespuestaPaginada,
} from '../../common/pagination/respuesta-paginada';
import { Idea } from './idea.entity';
import { aIdeaDto, IdeaRespuesta } from './idea-respuesta';
import { ActualizarIdeaDto, CrearIdeaDto, ListarIdeasQuery } from './ideas.dto';

@Injectable()
export class IdeasService {
  constructor(
    @InjectRepository(Idea)
    private readonly ideas: Repository<Idea>,
  ) {}

  /**
   * Crea una idea en estado `borrador` asociada al usuario autenticado. El
   * `ownerId` proviene del token (nunca del cuerpo); el DTO no admite `estado`.
   */
  async crear(ownerId: string, datos: CrearIdeaDto): Promise<IdeaRespuesta> {
    const idea = this.ideas.create({
      ownerId,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      problema: datos.problema,
      segmentoBeachhead: datos.segmentoBeachhead,
      estado: 'borrador',
    });
    return aIdeaDto(await this.ideas.save(idea));
  }

  /**
   * Lista las ideas propias, paginadas y ordenadas por antigüedad (recientes
   * primero). Filtra SIEMPRE por `owner_id`; con `estado`, restringe además a
   * ese estado. Nunca devuelve ideas de otro usuario.
   */
  async listar(
    ownerId: string,
    query: ListarIdeasQuery,
  ): Promise<RespuestaPaginada<IdeaRespuesta>> {
    const where = query.estado
      ? { ownerId, estado: query.estado }
      : { ownerId };
    const [ideas, total] = await this.ideas.findAndCount({
      where,
      order: { fechaCreacion: 'DESC' },
      skip: (query.pagina - 1) * query.porPagina,
      take: query.porPagina,
    });
    return crearRespuestaPaginada(ideas.map(aIdeaDto), total, query);
  }

  /** Devuelve una idea propia por `id`. Ajena → 403; inexistente → 404. */
  async obtener(ownerId: string, id: string): Promise<IdeaRespuesta> {
    return aIdeaDto(await this.asegurarPropia(ownerId, id));
  }

  /**
   * Edita el contenido de una idea propia. Solo toca los campos presentes en el
   * cuerpo (semántica PATCH); nunca cambia `estado` ni `ownerId` (el DTO no los
   * admite). Ajena → 403; inexistente → 404.
   */
  async actualizar(
    ownerId: string,
    id: string,
    datos: ActualizarIdeaDto,
  ): Promise<IdeaRespuesta> {
    const idea = await this.asegurarPropia(ownerId, id);
    if (datos.titulo !== undefined) idea.titulo = datos.titulo;
    if (datos.descripcion !== undefined) idea.descripcion = datos.descripcion;
    if (datos.problema !== undefined) idea.problema = datos.problema;
    if (datos.segmentoBeachhead !== undefined) {
      idea.segmentoBeachhead = datos.segmentoBeachhead;
    }
    return aIdeaDto(await this.ideas.save(idea));
  }

  /**
   * Marca una idea propia como `archivada` sin borrar su información ni su
   * evidencia. Ajena → 403; inexistente → 404.
   */
  async archivar(ownerId: string, id: string): Promise<IdeaRespuesta> {
    const idea = await this.asegurarPropia(ownerId, id);
    idea.estado = 'archivada';
    return aIdeaDto(await this.ideas.save(idea));
  }

  /**
   * Reabre una idea propia `archivada`, devolviéndola a `borrador` conservando
   * su evidencia. Si no estaba `archivada` → 409 CONFLICTO. Ajena → 403;
   * inexistente → 404.
   */
  async desarchivar(ownerId: string, id: string): Promise<IdeaRespuesta> {
    const idea = await this.asegurarPropia(ownerId, id);
    if (idea.estado !== 'archivada') {
      throw new ConflictoException('La idea no está archivada.');
    }
    idea.estado = 'borrador';
    return aIdeaDto(await this.ideas.save(idea));
  }

  /**
   * Carga una idea por `id` y verifica la propiedad. Inexistente →
   * `RecursoNoEncontradoException` (404); existente pero de otro `owner_id` →
   * `AccesoDenegadoException` (403), sin revelar sus datos. Es la convención de
   * aislamiento multi-tenant documentada en `@OwnerId()`. Público para que los
   * recursos anidados (p. ej. hipótesis) hereden la barrera de propiedad.
   */
  async asegurarPropia(ownerId: string, id: string): Promise<Idea> {
    const idea = await this.ideas.findOne({ where: { id } });
    if (!idea) {
      throw new RecursoNoEncontradoException('La idea solicitada no existe.');
    }
    if (idea.ownerId !== ownerId) {
      throw new AccesoDenegadoException('No tienes acceso a esta idea.');
    }
    return idea;
  }
}
