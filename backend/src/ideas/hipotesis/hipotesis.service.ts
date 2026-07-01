import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecursoNoEncontradoException } from '../../common/errors/dominio.exception';
import { Hipotesis } from './hipotesis.entity';
import { aHipotesisDto, HipotesisRespuesta } from './hipotesis-respuesta';
import { ActualizarHipotesisDto, CrearHipotesisDto } from './hipotesis.dto';
import { IdeasService } from '../idea/ideas.service';

@Injectable()
export class HipotesisService {
  constructor(
    @InjectRepository(Hipotesis)
    private readonly hipotesis: Repository<Hipotesis>,
    private readonly ideas: IdeasService,
  ) {}

  /**
   * Crea una hipótesis sobre una idea propia, en estado `pendiente`. La
   * propiedad se verifica primero contra la idea (ajena → 403, inexistente →
   * 404); el `ideaId` proviene del path, nunca del cuerpo.
   */
  async crear(
    ownerId: string,
    ideaId: string,
    datos: CrearHipotesisDto,
  ): Promise<HipotesisRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const hipotesis = this.hipotesis.create({
      ideaId,
      tipo: datos.tipo,
      enunciado: datos.enunciado,
      estado: 'pendiente',
    });
    return aHipotesisDto(await this.hipotesis.save(hipotesis));
  }

  /**
   * Lista las hipótesis de una idea propia (sin paginar), ordenadas por
   * antigüedad (recientes primero). Idea ajena → 403; inexistente → 404.
   */
  async listar(ownerId: string, ideaId: string): Promise<HipotesisRespuesta[]> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const hipotesis = await this.hipotesis.find({
      where: { ideaId },
      order: { fechaCreacion: 'DESC' },
    });
    return hipotesis.map(aHipotesisDto);
  }

  /**
   * Edita `tipo`/`enunciado` y/o marca el `estado` de una hipótesis propia. Solo
   * toca los campos presentes en el cuerpo; nunca cambia `ideaId`. Idea ajena →
   * 403; idea o hipótesis inexistente → 404.
   */
  async actualizar(
    ownerId: string,
    ideaId: string,
    idHipotesis: string,
    datos: ActualizarHipotesisDto,
  ): Promise<HipotesisRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const hipotesis = await this.buscarEnIdea(ideaId, idHipotesis);
    if (datos.tipo !== undefined) hipotesis.tipo = datos.tipo;
    if (datos.enunciado !== undefined) hipotesis.enunciado = datos.enunciado;
    if (datos.estado !== undefined) hipotesis.estado = datos.estado;
    return aHipotesisDto(await this.hipotesis.save(hipotesis));
  }

  /**
   * Elimina una hipótesis propia registrada por error. Idea ajena → 403; idea o
   * hipótesis inexistente → 404.
   */
  async eliminar(
    ownerId: string,
    ideaId: string,
    idHipotesis: string,
  ): Promise<void> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const hipotesis = await this.buscarEnIdea(ideaId, idHipotesis);
    await this.hipotesis.remove(hipotesis);
  }

  /**
   * Carga una hipótesis exigiendo que pertenezca a la idea indicada (ya
   * verificada como propia). Inexistente o de otra idea → `RecursoNoEncontrado`
   * (404), sin revelar existencia cruzada entre ideas.
   */
  private async buscarEnIdea(
    ideaId: string,
    idHipotesis: string,
  ): Promise<Hipotesis> {
    const hipotesis = await this.hipotesis.findOne({
      where: { id: idHipotesis, ideaId },
    });
    if (!hipotesis) {
      throw new RecursoNoEncontradoException(
        'La hipótesis solicitada no existe en esta idea.',
      );
    }
    return hipotesis;
  }
}
