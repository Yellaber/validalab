import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { ConflictoException } from '../common/errors/dominio.exception';
import { UsuarioRespuesta } from '../usuarios/usuario/usuario-respuesta';
import { UsuariosService } from '../usuarios/usuario/usuarios.service';
import { InicializacionSistema } from './inicializacion.entity';
import { InicializarSistemaDto } from './sistema.dto';

/** Código de PostgreSQL para violación de restricción única. */
const PG_UNIQUE_VIOLATION = '23505';

/** Versión que se deja anotada en el marcador como traza de la puesta en marcha. */
const VERSION_APP = '0.1.0';

@Injectable()
export class SistemaService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly usuarios: UsuariosService,
  ) {}

  /**
   * Inicializa el sistema: reserva el marcador y crea la cuenta administradora de
   * origen, todo en una transacción.
   *
   * El orden importa y es deliberadamente contraintuitivo: **primero se inserta
   * el marcador, después se crea la cuenta**. Insertar primero convierte
   * comprobar y reservar en un único acto atómico. Consultar antes e insertar
   * después reabriría la ventana que el marcador existe para cerrar: dos
   * peticiones simultáneas sobre un sistema virgen leerían ambas «vacío» y ambas
   * crearían un administrador.
   *
   * Al ir las dos operaciones en la misma transacción, un fallo en el alta
   * revierte también el marcador: un email duplicado o una contraseña inválida no
   * consumen la única oportunidad de inicializar el sistema.
   */
  async inicializar(datos: InicializarSistemaDto): Promise<UsuarioRespuesta> {
    return this.dataSource.transaction(async (manager) => {
      try {
        await manager.insert(InicializacionSistema, {
          id: 1,
          version: VERSION_APP,
          adminEmail: datos.email.trim().toLowerCase(),
        });
      } catch (error) {
        if (this.esViolacionUnica(error)) {
          // El marcador ya existía: el sistema está inicializado. Este 409 lo
          // decide el marcador, nunca el secreto — quien llega hasta aquí ya
          // superó el guard con el secreto correcto.
          throw new ConflictoException('El sistema ya fue inicializado.');
        }
        throw error;
      }

      return this.usuarios.crearAdministradorInicial(datos, manager);
    });
  }

  private esViolacionUnica(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
    );
  }
}
