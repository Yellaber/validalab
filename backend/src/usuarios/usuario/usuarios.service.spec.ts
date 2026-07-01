import { QueryFailedError, Repository } from 'typeorm';
import {
  ConflictoException,
  NoAutenticadoException,
  RecursoNoEncontradoException,
} from '../../common/errors/dominio.exception';
import { ServicioDeHashing } from '../sesion/hashing.service';
import { ServicioDeTokens } from '../sesion/token.service';
import { Usuario } from './usuario.entity';
import { UsuariosService } from './usuarios.service';
import {
  ActualizarPerfilDto,
  LoginDto,
  RegistroUsuarioDto,
} from './usuarios.dto';

type RepoMock = {
  findOne: jest.Mock;
  findAndCount: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

type HashingMock = { hash: jest.Mock; verificar: jest.Mock };

type TokensMock = {
  firmarAccessToken: jest.Mock;
  emitirRefreshToken: jest.Mock;
  rotarRefreshToken: jest.Mock;
  revocarRefreshToken: jest.Mock;
};

function crear(): {
  servicio: UsuariosService;
  repo: RepoMock;
  hashing: HashingMock;
  tokens: TokensMock;
} {
  const repo: RepoMock = {
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    create: jest.fn((x: Partial<Usuario>) => x),
    save: jest.fn((x: Usuario) =>
      Promise.resolve({
        ...x,
        id: 'u1',
        fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ),
  };
  const hashing: HashingMock = {
    hash: jest.fn().mockResolvedValue('HASH'),
    verificar: jest.fn(),
  };
  const tokens: TokensMock = {
    firmarAccessToken: jest
      .fn()
      .mockReturnValue({ accessToken: 'AT', expiraEn: 900 }),
    emitirRefreshToken: jest.fn().mockResolvedValue('RT'),
    rotarRefreshToken: jest.fn(),
    revocarRefreshToken: jest.fn().mockResolvedValue(undefined),
  };
  const servicio = new UsuariosService(
    repo as unknown as Repository<Usuario>,
    hashing as unknown as ServicioDeHashing,
    tokens as unknown as ServicioDeTokens,
  );
  return { servicio, repo, hashing, tokens };
}

function usuarioActivo(parcial: Partial<Usuario> = {}): Usuario {
  return {
    id: 'u1',
    email: 'ana@ejemplo.com',
    nombre: 'Ana',
    passwordHash: 'HASH',
    rol: 'validador',
    estado: 'activo',
    fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
    ...parcial,
  };
}

const datosValidos: RegistroUsuarioDto = {
  email: 'ana@ejemplo.com',
  nombre: 'Ana',
  password: 'contrasena-larga',
};

describe('UsuariosService.registrar', () => {
  it('crea la cuenta con rol validador/activo, hasheando la contraseña', async () => {
    const { servicio, repo, hashing } = crear();

    const dto = await servicio.registrar(datosValidos);

    expect(hashing.hash).toHaveBeenCalledWith('contrasena-larga');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ana@ejemplo.com',
        nombre: 'Ana',
        passwordHash: 'HASH',
        rol: 'validador',
        estado: 'activo',
      }),
    );
    expect(dto.rol).toBe('validador');
    expect(dto.estado).toBe('activo');
    expect(dto).not.toHaveProperty('passwordHash');
  });

  it('normaliza el email a minúsculas y sin espacios', async () => {
    const { servicio, repo } = crear();

    await servicio.registrar({
      ...datosValidos,
      email: '  ANA@Ejemplo.COM  ',
    });

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { email: 'ana@ejemplo.com' },
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@ejemplo.com' }),
    );
  });

  it('rechaza un email ya registrado (pre-chequeo)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue({ id: 'existente' });

    await expect(servicio.registrar(datosValidos)).rejects.toBeInstanceOf(
      ConflictoException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('traduce la violación de unicidad (carrera) a ConflictoException', async () => {
    const { servicio, repo } = crear();
    const driverError = Object.assign(new Error('duplicate'), {
      code: '23505',
    });
    repo.save.mockRejectedValue(
      new QueryFailedError('insert', [], driverError),
    );

    await expect(servicio.registrar(datosValidos)).rejects.toBeInstanceOf(
      ConflictoException,
    );
  });
});

const credenciales: LoginDto = {
  email: 'ana@ejemplo.com',
  password: 'contrasena-larga',
};

describe('UsuariosService.login', () => {
  it('emite TokenRespuesta con credenciales válidas de una cuenta activa', async () => {
    const { servicio, repo, hashing, tokens } = crear();
    repo.findOne.mockResolvedValue(usuarioActivo());
    hashing.verificar.mockResolvedValue(true);

    const respuesta = await servicio.login(credenciales);

    expect(respuesta.accessToken).toBe('AT');
    expect(respuesta.refreshToken).toBe('RT');
    expect(respuesta.tokenTipo).toBe('Bearer');
    expect(respuesta.expiraEn).toBe(900);
    expect(respuesta.usuario.id).toBe('u1');
    expect(respuesta.usuario.email).toBe('ana@ejemplo.com');
    expect(tokens.emitirRefreshToken).toHaveBeenCalledWith('u1');
    expect(respuesta.usuario).not.toHaveProperty('passwordHash');
  });

  it('rechaza una contraseña incorrecta (NO_AUTENTICADO)', async () => {
    const { servicio, repo, hashing } = crear();
    repo.findOne.mockResolvedValue(usuarioActivo());
    hashing.verificar.mockResolvedValue(false);

    await expect(servicio.login(credenciales)).rejects.toBeInstanceOf(
      NoAutenticadoException,
    );
  });

  it('rechaza un email inexistente sin verificar hash (NO_AUTENTICADO)', async () => {
    const { servicio, repo, hashing } = crear();
    repo.findOne.mockResolvedValue(null);

    await expect(servicio.login(credenciales)).rejects.toBeInstanceOf(
      NoAutenticadoException,
    );
    expect(hashing.verificar).not.toHaveBeenCalled();
  });

  it('rechaza una cuenta suspendida aun con credenciales válidas', async () => {
    const { servicio, repo, hashing } = crear();
    repo.findOne.mockResolvedValue(usuarioActivo({ estado: 'suspendido' }));
    hashing.verificar.mockResolvedValue(true);

    await expect(servicio.login(credenciales)).rejects.toBeInstanceOf(
      NoAutenticadoException,
    );
  });
});

describe('UsuariosService.refrescar', () => {
  it('rota el refresh y emite tokens nuevos para una cuenta activa', async () => {
    const { servicio, repo, tokens } = crear();
    tokens.rotarRefreshToken.mockResolvedValue({
      usuarioId: 'u1',
      refreshToken: 'RT2',
    });
    repo.findOne.mockResolvedValue(usuarioActivo());

    const respuesta = await servicio.refrescar({ refreshToken: 'viejo' });

    expect(tokens.rotarRefreshToken).toHaveBeenCalledWith('viejo');
    expect(respuesta.refreshToken).toBe('RT2');
    expect(respuesta.accessToken).toBe('AT');
    expect(respuesta.tokenTipo).toBe('Bearer');
  });

  it('propaga el rechazo de un refresh inválido', async () => {
    const { servicio, tokens } = crear();
    tokens.rotarRefreshToken.mockRejectedValue(new NoAutenticadoException());

    await expect(
      servicio.refrescar({ refreshToken: 'malo' }),
    ).rejects.toBeInstanceOf(NoAutenticadoException);
  });

  it('rechaza si la cuenta quedó suspendida', async () => {
    const { servicio, repo, tokens } = crear();
    tokens.rotarRefreshToken.mockResolvedValue({
      usuarioId: 'u1',
      refreshToken: 'RT2',
    });
    repo.findOne.mockResolvedValue(usuarioActivo({ estado: 'suspendido' }));

    await expect(
      servicio.refrescar({ refreshToken: 'viejo' }),
    ).rejects.toBeInstanceOf(NoAutenticadoException);
  });
});

describe('UsuariosService.logout', () => {
  it('revoca el refreshToken presentado', async () => {
    const { servicio, tokens } = crear();

    await servicio.logout('un-refresh');

    expect(tokens.revocarRefreshToken).toHaveBeenCalledWith('un-refresh');
  });
});

describe('UsuariosService.obtenerPerfil', () => {
  it('devuelve solo la cuenta del owner_id del token (aislamiento)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(usuarioActivo({ id: 'u1' }));

    const dto = await servicio.obtenerPerfil('u1');

    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(dto.id).toBe('u1');
    expect(dto).not.toHaveProperty('passwordHash');
  });

  it('falla si la cuenta del token ya no existe', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(null);

    await expect(servicio.obtenerPerfil('u1')).rejects.toBeInstanceOf(
      NoAutenticadoException,
    );
  });
});

describe('UsuariosService.actualizarPerfil', () => {
  it('actualiza solo el nombre', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(usuarioActivo({ nombre: 'Ana' }));

    const dto = await servicio.actualizarPerfil('u1', { nombre: 'Ana María' });

    expect(dto.nombre).toBe('Ana María');
  });

  it('no cambia rol ni estado aunque lleguen en el cuerpo', async () => {
    const { servicio, repo } = crear();
    const usuario = usuarioActivo({ rol: 'validador', estado: 'activo' });
    repo.findOne.mockResolvedValue(usuario);

    await servicio.actualizarPerfil('u1', {
      nombre: 'Nuevo',
      rol: 'administrador',
      estado: 'suspendido',
    } as ActualizarPerfilDto);

    expect(usuario.nombre).toBe('Nuevo');
    expect(usuario.rol).toBe('validador');
    expect(usuario.estado).toBe('activo');
  });
});

describe('UsuariosService.listar (admin)', () => {
  it('pagina las cuentas y arma el sobre RespuestaPaginada', async () => {
    const { servicio, repo } = crear();
    repo.findAndCount.mockResolvedValue([
      [usuarioActivo({ id: 'u1' }), usuarioActivo({ id: 'u2' })],
      45,
    ]);

    const respuesta = await servicio.listar({ pagina: 2, porPagina: 20 });

    expect(repo.findAndCount).toHaveBeenCalledWith({
      order: { fechaCreacion: 'DESC' },
      skip: 20,
      take: 20,
    });
    expect(respuesta.datos).toHaveLength(2);
    expect(respuesta.datos[0]).not.toHaveProperty('passwordHash');
    expect(respuesta.paginacion).toEqual({
      pagina: 2,
      porPagina: 20,
      total: 45,
      totalPaginas: 3,
    });
  });
});

describe('UsuariosService.obtenerPorId (admin)', () => {
  it('devuelve cualquier cuenta por id, sin filtrar por propietario', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(usuarioActivo({ id: 'otro' }));

    const dto = await servicio.obtenerPorId('otro');

    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'otro' } });
    expect(dto.id).toBe('otro');
    expect(dto).not.toHaveProperty('passwordHash');
  });

  it('lanza RECURSO_NO_ENCONTRADO si la cuenta no existe', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(null);

    await expect(servicio.obtenerPorId('inexistente')).rejects.toBeInstanceOf(
      RecursoNoEncontradoException,
    );
  });
});

describe('UsuariosService.cambiarRol (admin)', () => {
  it('actualiza el rol de la cuenta', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(usuarioActivo({ rol: 'validador' }));

    const dto = await servicio.cambiarRol('u1', 'administrador');

    expect(dto.rol).toBe('administrador');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ rol: 'administrador' }),
    );
  });

  it('lanza RECURSO_NO_ENCONTRADO si la cuenta no existe', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(null);

    await expect(
      servicio.cambiarRol('inexistente', 'administrador'),
    ).rejects.toBeInstanceOf(RecursoNoEncontradoException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe('UsuariosService.cambiarEstado (admin)', () => {
  it('suspende una cuenta activa', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(usuarioActivo({ estado: 'activo' }));

    const dto = await servicio.cambiarEstado('u1', 'suspendido');

    expect(dto.estado).toBe('suspendido');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'suspendido' }),
    );
  });

  it('lanza RECURSO_NO_ENCONTRADO si la cuenta no existe', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(null);

    await expect(
      servicio.cambiarEstado('inexistente', 'suspendido'),
    ).rejects.toBeInstanceOf(RecursoNoEncontradoException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
