import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { ConflictoException } from '../common/errors/dominio.exception';
import { UsuariosService } from '../usuarios/usuario/usuarios.service';
import { InicializacionSistema } from './inicializacion.entity';
import { SistemaService } from './sistema.service';
import { InicializarSistemaDto } from './sistema.dto';

const datos: InicializarSistemaDto = {
  email: 'admin@ejemplo.com',
  nombre: 'Yesid',
  password: 'contrasena-larga',
};

const administradorCreado = {
  id: 'admin-1',
  email: 'admin@ejemplo.com',
  nombre: 'Yesid',
  rol: 'administrador' as const,
  estado: 'activo' as const,
  fechaCreacion: '2026-01-01T00:00:00.000Z',
};

/** Error que emite Postgres al violar la clave primaria del marcador. */
function violacionUnica(): QueryFailedError {
  const error = new QueryFailedError('INSERT', [], new Error('duplicada'));
  (error as unknown as { driverError: { code: string } }).driverError = {
    code: '23505',
  };
  return error;
}

type ManagerMock = { insert: jest.Mock };

function crear(opciones: { insert?: jest.Mock; crearAdmin?: jest.Mock } = {}) {
  const manager: ManagerMock = {
    insert: opciones.insert ?? jest.fn().mockResolvedValue(undefined),
  };
  // Refleja la semántica real de `transaction`: si el callback lanza, la
  // transacción se revierte y el error se propaga.
  const transaction = jest.fn((cb: (m: EntityManager) => Promise<unknown>) =>
    cb(manager as unknown as EntityManager),
  );
  const dataSource = { transaction } as unknown as DataSource;

  const crearAdmin =
    opciones.crearAdmin ?? jest.fn().mockResolvedValue(administradorCreado);
  const usuarios = { crearAdministradorInicial: crearAdmin };

  const servicio = new SistemaService(
    dataSource,
    usuarios as unknown as UsuariosService,
  );
  return { servicio, manager, crearAdmin, transaction };
}

describe('SistemaService.inicializar', () => {
  it('reserva el marcador y crea la cuenta administradora', async () => {
    const { servicio, manager, crearAdmin } = crear();

    const dto = await servicio.inicializar(datos);

    expect(manager.insert).toHaveBeenCalledWith(
      InicializacionSistema,
      expect.objectContaining({ id: 1, adminEmail: 'admin@ejemplo.com' }),
    );
    expect(crearAdmin).toHaveBeenCalledWith(datos, manager);
    expect(dto.rol).toBe('administrador');
  });

  it('inserta el marcador ANTES de crear la cuenta', async () => {
    const orden: string[] = [];
    const insert = jest.fn(() => {
      orden.push('marcador');
      return Promise.resolve(undefined);
    });
    const crearAdmin = jest.fn(() => {
      orden.push('cuenta');
      return Promise.resolve(administradorCreado);
    });
    const { servicio } = crear({ insert, crearAdmin });

    await servicio.inicializar(datos);

    // Consultar antes e insertar después reabriría la ventana que el marcador
    // existe para cerrar: dos peticiones simultáneas leerían «vacío» las dos.
    expect(orden).toEqual(['marcador', 'cuenta']);
  });

  it('normaliza el email que deja anotado en el marcador', async () => {
    const { servicio, manager } = crear();

    await servicio.inicializar({ ...datos, email: '  ADMIN@Ejemplo.COM  ' });

    expect(manager.insert).toHaveBeenCalledWith(
      InicializacionSistema,
      expect.objectContaining({ adminEmail: 'admin@ejemplo.com' }),
    );
  });

  it('responde CONFLICTO cuando el sistema ya fue inicializado', async () => {
    const insert = jest.fn().mockRejectedValue(violacionUnica());
    const { servicio, crearAdmin } = crear({ insert });

    await expect(servicio.inicializar(datos)).rejects.toBeInstanceOf(
      ConflictoException,
    );
    // El 409 lo decide el marcador; no se llega a tocar la cuenta.
    expect(crearAdmin).not.toHaveBeenCalled();
  });

  it('propaga cualquier otro error de base de datos sin disfrazarlo de CONFLICTO', async () => {
    const insert = jest.fn().mockRejectedValue(new Error('conexión caída'));
    const { servicio } = crear({ insert });

    await expect(servicio.inicializar(datos)).rejects.toThrow('conexión caída');
    await expect(servicio.inicializar(datos)).rejects.not.toBeInstanceOf(
      ConflictoException,
    );
  });

  it('revierte el marcador cuando falla el alta, dejando el sistema inicializable', async () => {
    const crearAdmin = jest
      .fn()
      .mockRejectedValue(new ConflictoException('Ya existe una cuenta.'));
    const { servicio, transaction } = crear({ crearAdmin });

    await expect(servicio.inicializar(datos)).rejects.toBeInstanceOf(
      ConflictoException,
    );

    // El fallo se propaga fuera del callback de la transacción, que es lo que
    // dispara el rollback: un email duplicado no puede consumir la única
    // oportunidad de inicializar el sistema.
    expect(transaction).toHaveBeenCalledTimes(1);
    await expect(
      (transaction.mock.results[0] as { value: Promise<unknown> }).value,
    ).rejects.toBeInstanceOf(ConflictoException);
  });

  it('ejecuta marcador y cuenta dentro de la MISMA transacción', async () => {
    const { servicio, manager, crearAdmin } = crear();

    await servicio.inicializar(datos);

    // El alta recibe el mismo `EntityManager` con el que se reservó el marcador.
    expect(crearAdmin).toHaveBeenCalledWith(expect.anything(), manager);
  });
});
