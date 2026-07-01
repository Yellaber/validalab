import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import {
  ConflictoException,
  NoAutenticadoException,
  RecursoNoEncontradoException,
} from '../../common/errors/dominio.exception';
import {
  crearRespuestaPaginada,
  RespuestaPaginada,
} from '../../common/pagination/respuesta-paginada';
import { PaginacionQuery } from '../../common/pagination/paginacion.dto';
import { ServicioDeHashing } from '../sesion/hashing.service';
import { ServicioDeTokens } from '../sesion/token.service';
import { Usuario } from './usuario.entity';
import {
  aUsuarioDto,
  TokenRespuesta,
  UsuarioRespuesta,
} from './usuario-respuesta';
import { EstadoUsuario, Rol } from './usuario.types';
import {
  ActualizarPerfilDto,
  LoginDto,
  RefrescarTokenDto,
  RegistroUsuarioDto,
} from './usuarios.dto';

/** Código de PostgreSQL para violación de restricción única. */
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
    private readonly hashing: ServicioDeHashing,
    private readonly tokens: ServicioDeTokens,
  ) {}

  /**
   * Registra una cuenta nueva (rol `validador`, estado `activo`). Normaliza el
   * email, hashea la contraseña y garantiza unicidad del email. Email duplicado
   * → `ConflictoException` (incluida la carrera, vía la restricción única).
   */
  async registrar(datos: RegistroUsuarioDto): Promise<UsuarioRespuesta> {
    const email = this.normalizarEmail(datos.email);

    if (await this.usuarios.findOne({ where: { email } })) {
      throw new ConflictoException('Ya existe una cuenta con ese email.');
    }

    const usuario = this.usuarios.create({
      email,
      nombre: datos.nombre,
      passwordHash: await this.hashing.hash(datos.password),
      rol: 'validador',
      estado: 'activo',
    });

    try {
      const guardado = await this.usuarios.save(usuario);
      return aUsuarioDto(guardado);
    } catch (error) {
      if (this.esViolacionUnica(error)) {
        throw new ConflictoException('Ya existe una cuenta con ese email.');
      }
      throw error;
    }
  }

  /**
   * Autentica por email + contraseña y emite los tokens de sesión. Credenciales
   * inválidas → `NoAutenticadoException` SIN distinguir si falló el email o la
   * contraseña. Una cuenta `suspendido` tampoco autentica (mismo error).
   */
  async login(datos: LoginDto): Promise<TokenRespuesta> {
    const email = this.normalizarEmail(datos.email);
    const usuario = await this.usuarios.findOne({ where: { email } });

    const credencialesOk =
      usuario !== null &&
      (await this.hashing.verificar(datos.password, usuario.passwordHash));

    if (!credencialesOk || usuario.estado === 'suspendido') {
      throw new NoAutenticadoException('Credenciales inválidas.');
    }

    return this.construirTokenRespuesta(usuario);
  }

  /**
   * Rota el refreshToken presentado y emite tokens nuevos. Token inválido,
   * expirado o revocado → `NoAutenticadoException` (vía el servicio de tokens).
   * Una cuenta `suspendido` no puede renovar.
   */
  async refrescar(datos: RefrescarTokenDto): Promise<TokenRespuesta> {
    const { usuarioId, refreshToken } = await this.tokens.rotarRefreshToken(
      datos.refreshToken,
    );
    const usuario = await this.usuarios.findOne({ where: { id: usuarioId } });

    if (!usuario || usuario.estado === 'suspendido') {
      throw new NoAutenticadoException('Refresh token inválido o expirado.');
    }

    const { accessToken, expiraEn } = this.tokens.firmarAccessToken(usuario);
    return {
      accessToken,
      refreshToken,
      tokenTipo: 'Bearer',
      expiraEn,
      usuario: aUsuarioDto(usuario),
    };
  }

  /** Cierra sesión revocando el refreshToken presentado (idempotente). */
  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revocarRefreshToken(refreshToken);
  }

  /** Devuelve el perfil del usuario autenticado (resuelto por su `owner_id`). */
  async obtenerPerfil(ownerId: string): Promise<UsuarioRespuesta> {
    return aUsuarioDto(await this.buscarPropio(ownerId));
  }

  /**
   * Actualiza el perfil propio. Solo cambia `nombre`: `rol` y `estado` no se
   * tocan (el DTO no los admite, así que ni siquiera llegan aquí).
   */
  async actualizarPerfil(
    ownerId: string,
    datos: ActualizarPerfilDto,
  ): Promise<UsuarioRespuesta> {
    const usuario = await this.buscarPropio(ownerId);
    usuario.nombre = datos.nombre;
    return aUsuarioDto(await this.usuarios.save(usuario));
  }

  // --- Administración (rol `administrador`) ---
  // A diferencia del resto del backend, estas operaciones NO se filtran por
  // `owner_id`: un administrador gestiona las cuentas de todos los usuarios. El
  // aislamiento por tenant lo sustituye aquí el RBAC (`@Roles('administrador')`).

  /** Lista todas las cuentas, paginadas y ordenadas por antigüedad (recientes primero). */
  async listar(
    query: PaginacionQuery,
  ): Promise<RespuestaPaginada<UsuarioRespuesta>> {
    const [usuarios, total] = await this.usuarios.findAndCount({
      order: { fechaCreacion: 'DESC' },
      skip: (query.pagina - 1) * query.porPagina,
      take: query.porPagina,
    });
    return crearRespuestaPaginada(usuarios.map(aUsuarioDto), total, query);
  }

  /** Devuelve una cuenta cualquiera por su `id`. Inexistente → `RECURSO_NO_ENCONTRADO`. */
  async obtenerPorId(id: string): Promise<UsuarioRespuesta> {
    return aUsuarioDto(await this.buscarPorId(id));
  }

  /** Cambia el rol de una cuenta. Inexistente → `RECURSO_NO_ENCONTRADO`. */
  async cambiarRol(id: string, rol: Rol): Promise<UsuarioRespuesta> {
    const usuario = await this.buscarPorId(id);
    usuario.rol = rol;
    return aUsuarioDto(await this.usuarios.save(usuario));
  }

  /** Suspende o reactiva una cuenta. Inexistente → `RECURSO_NO_ENCONTRADO`. */
  async cambiarEstado(
    id: string,
    estado: EstadoUsuario,
  ): Promise<UsuarioRespuesta> {
    const usuario = await this.buscarPorId(id);
    usuario.estado = estado;
    return aUsuarioDto(await this.usuarios.save(usuario));
  }

  /** Carga una cuenta por `id` (sin restricción de propietario), o falla 404. */
  private async buscarPorId(id: string): Promise<Usuario> {
    const usuario = await this.usuarios.findOne({ where: { id } });
    if (!usuario) {
      throw new RecursoNoEncontradoException('La cuenta solicitada no existe.');
    }
    return usuario;
  }

  /** Carga la cuenta propia por `owner_id` (derivado del token), o falla. */
  private async buscarPropio(ownerId: string): Promise<Usuario> {
    const usuario = await this.usuarios.findOne({ where: { id: ownerId } });
    if (!usuario) {
      throw new NoAutenticadoException('La cuenta ya no existe.');
    }
    return usuario;
  }

  private async construirTokenRespuesta(
    usuario: Usuario,
  ): Promise<TokenRespuesta> {
    const { accessToken, expiraEn } = this.tokens.firmarAccessToken(usuario);
    const refreshToken = await this.tokens.emitirRefreshToken(usuario.id);
    return {
      accessToken,
      refreshToken,
      tokenTipo: 'Bearer',
      expiraEn,
      usuario: aUsuarioDto(usuario),
    };
  }

  private normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private esViolacionUnica(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
    );
  }
}
