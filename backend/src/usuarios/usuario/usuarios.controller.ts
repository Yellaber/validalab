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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
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
import { Publico } from '../../auth/decorators/publico.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { OwnerId } from '../../auth/decorators/usuario-actual.decorator';
import { ErrorRespuestaDto } from '../../common/errors/error-respuesta.dto';
import { PaginacionQueryDto } from '../../common/pagination/paginacion.dto';
import { RespuestaPaginada } from '../../common/pagination/respuesta-paginada';
import {
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
  RefrescarTokenDto,
  RegistroUsuarioDto,
} from './usuarios.dto';

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

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

  /** Inicio de sesión: devuelve los tokens. Endpoint público. */
  @Publico()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticarse y obtener tokens',
    description: 'Endpoint público. Devuelve `accessToken` y `refreshToken`.',
  })
  @ApiOkResponse({
    description: 'Autenticación correcta.',
    type: TokenRespuestaDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales inválidas.',
    type: ErrorRespuestaDto,
  })
  login(@Body() dto: LoginDto): Promise<TokenRespuesta> {
    return this.usuarios.login(dto);
  }

  /** Renueva los tokens rotando el refreshToken. Endpoint público. */
  @Publico()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar el token de acceso',
    description:
      'Endpoint público (el `accessToken` puede haber expirado). Intercambia un `refreshToken` válido por un `TokenRespuesta` nuevo.',
  })
  @ApiOkResponse({ description: 'Token renovado.', type: TokenRespuestaDto })
  @ApiUnauthorizedResponse({
    description: 'El `refreshToken` es inválido o expiró.',
    type: ErrorRespuestaDto,
  })
  refrescar(@Body() dto: RefrescarTokenDto): Promise<TokenRespuesta> {
    return this.usuarios.refrescar(dto);
  }

  /** Cierra sesión invalidando el refreshToken. Requiere estar autenticado. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Cerrar sesión',
    description:
      'Invalida el `refreshToken` de la sesión. Requiere estar autenticado.',
  })
  @ApiNoContentResponse({
    description: 'Sesión cerrada; el `refreshToken` deja de ser válido.',
  })
  @ApiUnauthorizedResponse({
    description: 'Falta un token de acceso válido.',
    type: ErrorRespuestaDto,
  })
  logout(@Body() dto: RefrescarTokenDto): Promise<void> {
    return this.usuarios.logout(dto.refreshToken);
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
