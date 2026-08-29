import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Publico } from '../../auth/decorators/publico.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { OwnerId } from '../../auth/decorators/usuario-actual.decorator';
import { NoAutenticadoException } from '../../common/errors/dominio.exception';
import { ErrorRespuestaDto } from '../../common/errors/error-respuesta.dto';
import { PaginacionQueryDto } from '../../common/pagination/paginacion.dto';
import { RespuestaPaginada } from '../../common/pagination/respuesta-paginada';
import { AppConfigService } from '../../config/app-config.service';
import {
  NOMBRE_COOKIE_REFRESH,
  opcionesCookieRefresh,
  opcionesLimpiezaCookieRefresh,
} from '../sesion/cookie-sesion';
import {
  SesionEmitida,
  TokenRespuesta,
  TokenRespuestaDto,
  UsuarioRespuesta,
  UsuarioRespuestaDto,
  UsuariosPaginadosDto,
} from './usuario-respuesta';
import { UsuariosService } from './usuarios.service';
import {
  ActualizarPerfilDto,
  CambiarEstadoDto,
  CambiarRolDto,
  IdUsuarioParamDto,
  LoginDto,
  RegistroUsuarioDto,
} from './usuarios.dto';

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly config: AppConfigService,
  ) {}

  /** Escribe la cookie `HttpOnly` del refresh token y devuelve el cuerpo de sesión. */
  private emitirCookie(res: Response, sesion: SesionEmitida): TokenRespuesta {
    res.cookie(
      NOMBRE_COOKIE_REFRESH,
      sesion.refreshToken,
      opcionesCookieRefresh({
        secure: this.config.cookie.secure,
        sameSite: this.config.cookie.sameSite,
        maxAgeMs: this.config.session.refreshTtlMs,
      }),
    );
    return sesion.cuerpo;
  }

  /** Lee el refresh token de la cookie; ausente → `401` (para refresh). */
  private leerCookieRefresh(req: Request): string {
    const token = this.leerCookieOpcional(req);
    if (!token) {
      throw new NoAutenticadoException('Falta la cookie de refresh.');
    }
    return token;
  }

  /** Lee el refresh token de la cookie si está presente (para logout idempotente). */
  private leerCookieOpcional(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[NOMBRE_COOKIE_REFRESH];
  }

  /** Alta de una cuenta nueva. Endpoint público. */
  @Publico()
  @Post('registro')
  @ApiOperation({
    summary: 'Registrar una cuenta nueva',
    description:
      'Endpoint público. Crea la cuenta con rol `validador` y estado `activo` por defecto.',
  })
  @ApiCreatedResponse({
    description: 'Cuenta creada.',
    type: UsuarioRespuestaDto,
  })
  @ApiConflictResponse({
    description: 'El email ya está registrado.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'La validación de la solicitud falló.',
    type: ErrorRespuestaDto,
  })
  registrar(@Body() dto: RegistroUsuarioDto): Promise<UsuarioRespuesta> {
    return this.usuarios.registrar(dto);
  }

  /** Inicio de sesión: devuelve el accessToken y emite la cookie de refresh. Endpoint público. */
  @Publico()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticarse y obtener la sesión',
    description:
      'Endpoint público. Devuelve el `accessToken` en el cuerpo y el `refreshToken` en una cookie `HttpOnly`.',
  })
  @ApiOkResponse({
    description: 'Autenticación correcta (con `Set-Cookie` del refresh token).',
    type: TokenRespuestaDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales inválidas.',
    type: ErrorRespuestaDto,
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenRespuesta> {
    return this.emitirCookie(res, await this.usuarios.login(dto));
  }

  /** Renueva la sesión rotando el refreshToken de la cookie. Basado en cookie. */
  @Publico()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refreshCookie')
  @ApiOperation({
    summary: 'Renovar el token de acceso',
    description:
      'Lee el `refreshToken` de la cookie, lo rota y devuelve un `TokenRespuesta` nuevo con la cookie rotada. No recibe cuerpo. Cookie ausente o inválida → `401`.',
  })
  @ApiOkResponse({ description: 'Token renovado.', type: TokenRespuestaDto })
  @ApiUnauthorizedResponse({
    description: 'Falta la cookie de refresh o es inválida/expirada.',
    type: ErrorRespuestaDto,
  })
  async refrescar(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenRespuesta> {
    const refreshToken = this.leerCookieRefresh(req);
    return this.emitirCookie(res, await this.usuarios.refrescar(refreshToken));
  }

  /** Cierra sesión invalidando el refreshToken de la cookie y limpiándola. Basado en cookie. */
  @Publico()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('refreshCookie')
  @ApiOperation({
    summary: 'Cerrar sesión',
    description:
      'Lee el `refreshToken` de la cookie, lo invalida y limpia la cookie. No exige `accessToken` válido. Idempotente.',
  })
  @ApiNoContentResponse({
    description: 'Sesión cerrada; el `refreshToken` deja de ser válido.',
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshToken = this.leerCookieOpcional(req);
    if (refreshToken) {
      await this.usuarios.logout(refreshToken);
    }
    res.clearCookie(
      NOMBRE_COOKIE_REFRESH,
      opcionesLimpiezaCookieRefresh({
        secure: this.config.cookie.secure,
        sameSite: this.config.cookie.sameSite,
      }),
    );
  }

  /** Consulta el perfil propio, resuelto desde el token (sin `id`). */
  @Get('yo')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Consultar el perfil propio',
    description: 'Resuelve el usuario a partir del token; no recibe `id`.',
  })
  @ApiOkResponse({
    description: 'Perfil del usuario autenticado.',
    type: UsuarioRespuestaDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token de acceso válido.',
    type: ErrorRespuestaDto,
  })
  obtenerPerfil(@OwnerId() ownerId: string): Promise<UsuarioRespuesta> {
    return this.usuarios.obtenerPerfil(ownerId);
  }

  /** Actualiza el perfil propio (solo `nombre`). */
  @Patch('yo')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Actualizar el perfil propio',
    description:
      'Solo permite cambiar datos del propio perfil (p. ej. `nombre`); no el `rol` ni el `estado`.',
  })
  @ApiOkResponse({
    description: 'Perfil actualizado.',
    type: UsuarioRespuestaDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token de acceso válido.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'La validación de la solicitud falló.',
    type: ErrorRespuestaDto,
  })
  actualizarPerfil(
    @OwnerId() ownerId: string,
    @Body() dto: ActualizarPerfilDto,
  ): Promise<UsuarioRespuesta> {
    return this.usuarios.actualizarPerfil(ownerId, dto);
  }

  // --- Administración de cuentas (solo rol `administrador`) ---

  /** Lista todas las cuentas, paginadas. Solo administrador. */
  @Get()
  @Roles('administrador')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Listar cuentas (solo administrador)',
    description:
      'Requiere rol `administrador` (RBAC). Un `validador` recibe `403 ACCESO_DENEGADO`.',
  })
  @ApiOkResponse({
    description: 'Página de cuentas.',
    type: UsuariosPaginadosDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token de acceso válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'El rol no tiene privilegios de administración.',
    type: ErrorRespuestaDto,
  })
  listar(
    @Query() query: PaginacionQueryDto,
  ): Promise<RespuestaPaginada<UsuarioRespuesta>> {
    return this.usuarios.listar(query);
  }

  /** Consulta una cuenta por `id`. Solo administrador. */
  @Get(':id')
  @Roles('administrador')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Consultar una cuenta (solo administrador)',
    description:
      'Requiere rol `administrador` (RBAC). Un `validador` recibe `403 ACCESO_DENEGADO`.',
  })
  @ApiOkResponse({
    description: 'Cuenta solicitada.',
    type: UsuarioRespuestaDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token de acceso válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'El rol no tiene privilegios de administración.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'La cuenta no existe.',
    type: ErrorRespuestaDto,
  })
  obtener(@Param() { id }: IdUsuarioParamDto): Promise<UsuarioRespuesta> {
    return this.usuarios.obtenerPorId(id);
  }

  /** Cambia el rol de una cuenta. Solo administrador. */
  @Patch(':id/rol')
  @Roles('administrador')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Cambiar el rol de una cuenta (solo administrador)',
    description:
      'Requiere rol `administrador` (RBAC). Un `validador` recibe `403 ACCESO_DENEGADO`.',
  })
  @ApiOkResponse({ description: 'Rol actualizado.', type: UsuarioRespuestaDto })
  @ApiUnauthorizedResponse({
    description: 'Falta un token de acceso válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'El rol no tiene privilegios de administración.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'La cuenta no existe.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'La validación de la solicitud falló.',
    type: ErrorRespuestaDto,
  })
  cambiarRol(
    @Param() { id }: IdUsuarioParamDto,
    @Body() dto: CambiarRolDto,
  ): Promise<UsuarioRespuesta> {
    return this.usuarios.cambiarRol(id, dto.rol);
  }

  /** Suspende o reactiva una cuenta. Solo administrador. */
  @Patch(':id/estado')
  @Roles('administrador')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Cambiar el estado de una cuenta (solo administrador)',
    description:
      'Requiere rol `administrador` (RBAC). Permite suspender/activar una cuenta. Un `validador` recibe `403 ACCESO_DENEGADO`.',
  })
  @ApiOkResponse({
    description: 'Estado actualizado.',
    type: UsuarioRespuestaDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token de acceso válido.',
    type: ErrorRespuestaDto,
  })
  @ApiForbiddenResponse({
    description: 'El rol no tiene privilegios de administración.',
    type: ErrorRespuestaDto,
  })
  @ApiNotFoundResponse({
    description: 'La cuenta no existe.',
    type: ErrorRespuestaDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'La validación de la solicitud falló.',
    type: ErrorRespuestaDto,
  })
  cambiarEstado(
    @Param() { id }: IdUsuarioParamDto,
    @Body() dto: CambiarEstadoDto,
  ): Promise<UsuarioRespuesta> {
    return this.usuarios.cambiarEstado(id, dto.estado);
  }
}
