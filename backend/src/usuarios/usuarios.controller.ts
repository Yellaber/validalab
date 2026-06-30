import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { Publico } from '../auth/publico.decorator';
import { OwnerId } from '../auth/usuario-actual.decorator';
import { TokenRespuesta, UsuarioRespuesta } from './usuario-respuesta';
import { UsuariosService } from './usuarios.service';
import {
  ActualizarPerfilDto,
  LoginDto,
  RefrescarTokenDto,
  RegistroUsuarioDto,
} from './usuarios.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  /** Alta de una cuenta nueva. Endpoint público. */
  @Publico()
  @Post('registro')
  registrar(@Body() dto: RegistroUsuarioDto): Promise<UsuarioRespuesta> {
    return this.usuarios.registrar(dto);
  }

  /** Inicio de sesión: devuelve los tokens. Endpoint público. */
  @Publico()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<TokenRespuesta> {
    return this.usuarios.login(dto);
  }

  /** Renueva los tokens rotando el refreshToken. Endpoint público. */
  @Publico()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refrescar(@Body() dto: RefrescarTokenDto): Promise<TokenRespuesta> {
    return this.usuarios.refrescar(dto);
  }

  /** Cierra sesión invalidando el refreshToken. Requiere estar autenticado. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() dto: RefrescarTokenDto): Promise<void> {
    return this.usuarios.logout(dto.refreshToken);
  }

  /** Consulta el perfil propio, resuelto desde el token (sin `id`). */
  @Get('yo')
  obtenerPerfil(@OwnerId() ownerId: string): Promise<UsuarioRespuesta> {
    return this.usuarios.obtenerPerfil(ownerId);
  }

  /** Actualiza el perfil propio (solo `nombre`). */
  @Patch('yo')
  actualizarPerfil(
    @OwnerId() ownerId: string,
    @Body() dto: ActualizarPerfilDto,
  ): Promise<UsuarioRespuesta> {
    return this.usuarios.actualizarPerfil(ownerId, dto);
  }
}
