import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ServicioDeHashing } from './sesion/hashing.service';
import { ServicioDeTokens } from './sesion/token.service';
import { Sesion } from './sesion/sesion.entity';
import { Usuario } from './usuario/usuario.entity';
import { UsuariosController } from './usuario/usuarios.controller';
import { UsuariosService } from './usuario/usuarios.service';

/**
 * Módulo de dominio `usuarios`: registro, autenticación de sesión y perfil
 * propio. Reutiliza la fundación — importa `AuthModule` para el `JwtService`
 * (firma del accessToken) y depende del `AppConfigService` global.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Sesion]), AuthModule],
  controllers: [UsuariosController],
  providers: [UsuariosService, ServicioDeHashing, ServicioDeTokens],
})
export class UsuariosModule {}
