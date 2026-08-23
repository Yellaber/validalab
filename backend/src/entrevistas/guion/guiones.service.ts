import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccesoDenegadoException,
  EntrevistaSinVinculoException,
  RecursoNoEncontradoException,
} from '../../common/errors/dominio.exception';
import {
  crearRespuestaPaginada,
  RespuestaPaginada,
} from '../../common/pagination/respuesta-paginada';
import { PaginacionQuery } from '../../common/pagination/paginacion.dto';
import { Guion } from './guion.entity';
import { aGuionDto, GuionRespuesta } from './guion-respuesta';
import { Pregunta } from './guion.types';
import {
  ActualizarGuionDto,
  CrearGuionDto,
  PreguntaRequest,
} from './guiones.dto';

@Injectable()
export class GuionesService {
  constructor(
    @InjectRepository(Guion)
    private readonly guiones: Repository<Guion>,
  ) {}

  /** Crea un guión propio; genera el `id` de cada pregunta. */
  async crear(ownerId: string, datos: CrearGuionDto): Promise<GuionRespuesta> {
    const guion = this.guiones.create({
      ownerId,
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      preguntas: this.conIds(datos.preguntas),
    });
    return aGuionDto(await this.guiones.save(guion));
  }

  /** Lista los guiones propios, paginados (recientes primero). */
  async listar(
    ownerId: string,
    query: PaginacionQuery,
  ): Promise<RespuestaPaginada<GuionRespuesta>> {
    const [guiones, total] = await this.guiones.findAndCount({
      where: { ownerId },
      order: { fechaCreacion: 'DESC' },
      skip: (query.pagina - 1) * query.porPagina,
      take: query.porPagina,
    });
    return crearRespuestaPaginada(guiones.map(aGuionDto), total, query);
  }

  /** Devuelve un guión propio. Ajeno → 403; inexistente → 404. */
  async obtener(ownerId: string, id: string): Promise<GuionRespuesta> {
    return aGuionDto(await this.buscarPropio(ownerId, id));
  }

  /**
   * Edita un guión propio. Asigna los campos presentes; si viene `preguntas`,
   * reemplaza el conjunto ordenado completo (con ids nuevos). Ajeno → 403;
   * inexistente → 404.
   */
  async actualizar(
    ownerId: string,
    id: string,
    datos: ActualizarGuionDto,
  ): Promise<GuionRespuesta> {
    const guion = await this.buscarPropio(ownerId, id);
    if (datos.nombre !== undefined) guion.nombre = datos.nombre;
    if (datos.descripcion !== undefined) guion.descripcion = datos.descripcion;
    if (datos.preguntas !== undefined) {
      guion.preguntas = this.conIds(datos.preguntas);
    }
    return aGuionDto(await this.guiones.save(guion));
  }

  /** Elimina un guión propio. Ajeno → 403; inexistente → 404. */
  async eliminar(ownerId: string, id: string): Promise<void> {
    const guion = await this.buscarPropio(ownerId, id);
    await this.guiones.remove(guion);
  }

  /**
   * Verifica, para el vínculo de una entrevista (RNF-14), que el guión exista y
   * sea del usuario. Si no, `EntrevistaSinVinculoException` (422). Consumido por
   * el sub-dominio `entrevista/`.
   */
  async asegurarVinculo(ownerId: string, guionId: string): Promise<void> {
    const guion = await this.guiones.findOne({ where: { id: guionId } });
    if (!guion || guion.ownerId !== ownerId) {
      throw new EntrevistaSinVinculoException(
        'El guión no existe o no es del usuario.',
      );
    }
  }

  /** Transforma las preguntas de entrada en value-objects con `id` generado. */
  private conIds(preguntas: PreguntaRequest[]): Pregunta[] {
    return preguntas.map((p) => ({
      id: randomUUID(),
      orden: p.orden,
      texto: p.texto,
    }));
  }

  /**
   * Carga un guión por `id` y verifica la propiedad. Inexistente →
   * `RecursoNoEncontradoException` (404); de otro `owner_id` →
   * `AccesoDenegadoException` (403).
   */
  private async buscarPropio(ownerId: string, id: string): Promise<Guion> {
    const guion = await this.guiones.findOne({ where: { id } });
    if (!guion) {
      throw new RecursoNoEncontradoException('El guión solicitado no existe.');
    }
    if (guion.ownerId !== ownerId) {
      throw new AccesoDenegadoException('No tienes acceso a este guión.');
    }
    return guion;
  }
}
