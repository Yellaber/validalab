import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConflictoException,
  RecursoNoEncontradoException,
  ValidacionFallidaException,
} from '../common/errors/dominio.exception';
import {
  crearRespuestaPaginada,
  RespuestaPaginada,
} from '../common/pagination/respuesta-paginada';
import { IdeasService } from '../ideas/idea/ideas.service';
import { Contacto } from './contacto.entity';
import { aContactoDto, ContactoRespuesta } from './contacto-respuesta';
import { EstadoOutreach } from './contacto.types';
import { esTransicionValida } from './embudo';
import {
  ActualizarContactoDto,
  CrearContactoDto,
  ListarContactosQuery,
} from './contactos.dto';

@Injectable()
export class ContactosService {
  constructor(
    @InjectRepository(Contacto)
    private readonly contactos: Repository<Contacto>,
    private readonly ideas: IdeasService,
  ) {}

  /**
   * Crea un contacto sobre una idea propia, en `por_contactar`. Aplica defaults
   * de `canal`/`origen` y valida `referidoPorId` (misma idea). Idea ajena → 403;
   * inexistente → 404; referido inválido → 422.
   */
  async crear(
    ownerId: string,
    ideaId: string,
    datos: CrearContactoDto,
  ): Promise<ContactoRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    await this.validarReferido(ideaId, datos.referidoPorId ?? null);
    const contacto = this.contactos.create({
      ideaId,
      nombre: datos.nombre,
      perfil: datos.perfil,
      enlace: datos.enlace,
      canal: datos.canal ?? 'otro',
      origen: datos.origen ?? 'busqueda_directa',
      referidoPorId: datos.referidoPorId ?? null,
      estado: 'por_contactar',
    });
    return aContactoDto(await this.contactos.save(contacto));
  }

  /**
   * Lista los contactos de una idea propia, paginados (recientes primero) y con
   * filtro opcional por `estado`. Idea ajena → 403; inexistente → 404.
   */
  async listar(
    ownerId: string,
    ideaId: string,
    query: ListarContactosQuery,
  ): Promise<RespuestaPaginada<ContactoRespuesta>> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const where = query.estado ? { ideaId, estado: query.estado } : { ideaId };
    const [contactos, total] = await this.contactos.findAndCount({
      where,
      order: { fechaCreacion: 'DESC' },
      skip: (query.pagina - 1) * query.porPagina,
      take: query.porPagina,
    });
    return crearRespuestaPaginada(contactos.map(aContactoDto), total, query);
  }

  /** Devuelve un contacto propio. Idea ajena → 403; contacto inexistente → 404. */
  async obtener(
    ownerId: string,
    ideaId: string,
    idContacto: string,
  ): Promise<ContactoRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    return aContactoDto(await this.buscarEnIdea(ideaId, idContacto));
  }

  /**
   * Edita el contenido de un contacto propio. Solo toca campos presentes; nunca
   * `estado` ni fechas de toque (el DTO no los admite). Valida `referidoPorId`
   * (misma idea, sin auto-referencia). Idea ajena → 403; inexistente → 404;
   * referido inválido → 422.
   */
  async actualizar(
    ownerId: string,
    ideaId: string,
    idContacto: string,
    datos: ActualizarContactoDto,
  ): Promise<ContactoRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const contacto = await this.buscarEnIdea(ideaId, idContacto);
    if (datos.referidoPorId !== undefined) {
      await this.validarReferido(ideaId, datos.referidoPorId, idContacto);
      contacto.referidoPorId = datos.referidoPorId;
    }
    if (datos.nombre !== undefined) contacto.nombre = datos.nombre;
    if (datos.perfil !== undefined) contacto.perfil = datos.perfil;
    if (datos.enlace !== undefined) contacto.enlace = datos.enlace;
    if (datos.canal !== undefined) contacto.canal = datos.canal;
    if (datos.origen !== undefined) contacto.origen = datos.origen;
    if (datos.notas !== undefined) contacto.notas = datos.notas;
    return aContactoDto(await this.contactos.save(contacto));
  }

  /** Elimina un contacto propio. Idea ajena → 403; inexistente → 404. */
  async eliminar(
    ownerId: string,
    ideaId: string,
    idContacto: string,
  ): Promise<void> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const contacto = await this.buscarEnIdea(ideaId, idContacto);
    await this.contactos.remove(contacto);
  }

  /**
   * Mueve un contacto propio al `estado` destino del embudo. Transición no
   * permitida (salto, terminal o `entrevistado`, reservado a E4) → 409. Idea
   * ajena → 403; contacto inexistente → 404.
   */
  async transicionar(
    ownerId: string,
    ideaId: string,
    idContacto: string,
    estado: EstadoOutreach,
  ): Promise<ContactoRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const contacto = await this.buscarEnIdea(ideaId, idContacto);
    if (!esTransicionValida(contacto.estado, estado)) {
      throw new ConflictoException(
        `Transición no permitida de '${contacto.estado}' a '${estado}'.`,
      );
    }
    contacto.estado = estado;
    return aContactoDto(await this.contactos.save(contacto));
  }

  /**
   * Registra un toque de outreach: fija `primerToqueEn` o, si ya existe,
   * `segundoToqueEn`. Un tercer toque → 409. `fecha` opcional (por defecto,
   * ahora). Idea ajena → 403; contacto inexistente → 404.
   */
  async registrarToque(
    ownerId: string,
    ideaId: string,
    idContacto: string,
    fecha?: string,
  ): Promise<ContactoRespuesta> {
    await this.ideas.asegurarPropia(ownerId, ideaId);
    const contacto = await this.buscarEnIdea(ideaId, idContacto);
    const cuando = fecha ? new Date(fecha) : new Date();
    if (contacto.primerToqueEn === null) {
      contacto.primerToqueEn = cuando;
    } else if (contacto.segundoToqueEn === null) {
      contacto.segundoToqueEn = cuando;
    } else {
      throw new ConflictoException(
        'El contacto ya tiene los dos toques permitidos.',
      );
    }
    return aContactoDto(await this.contactos.save(contacto));
  }

  /**
   * Carga un contacto exigiendo que pertenezca a la idea (ya verificada como
   * propia). Inexistente o de otra idea → 404.
   */
  private async buscarEnIdea(
    ideaId: string,
    idContacto: string,
  ): Promise<Contacto> {
    const contacto = await this.contactos.findOne({
      where: { id: idContacto, ideaId },
    });
    if (!contacto) {
      throw new RecursoNoEncontradoException(
        'El contacto solicitado no existe en esta idea.',
      );
    }
    return contacto;
  }

  /**
   * Valida el `referidoPorId`: si viene (no `null`) debe ser otro contacto de la
   * misma idea (nunca el propio contacto). Inválido → `VALIDACION_FALLIDA` (422).
   */
  private async validarReferido(
    ideaId: string,
    referidoPorId: string | null,
    idContactoActual?: string,
  ): Promise<void> {
    if (referidoPorId === null) return;
    if (referidoPorId === idContactoActual) {
      throw new ValidacionFallidaException(
        'Un contacto no puede referirse a sí mismo.',
        [
          {
            campo: 'referidoPorId',
            problema: 'No puede ser el propio contacto.',
          },
        ],
      );
    }
    const referente = await this.contactos.findOne({
      where: { id: referidoPorId, ideaId },
    });
    if (!referente) {
      throw new ValidacionFallidaException(
        'El referidoPorId no corresponde a un contacto de esta idea.',
        [
          {
            campo: 'referidoPorId',
            problema: 'Debe ser un contacto de la misma idea.',
          },
        ],
      );
    }
  }
}
