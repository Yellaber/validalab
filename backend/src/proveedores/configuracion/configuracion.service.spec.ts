import { Repository } from 'typeorm';
import {
  ApiKeyInvalidaException,
  ProveedorNoDisponibleException,
  RecursoNoEncontradoException,
  ValidacionFallidaException,
} from '../../common/errors/dominio.exception';
import { CatalogoService } from '../catalogo/catalogo.service';
import { ConfiguracionByok } from './configuracion-byok.entity';
import { ConfiguracionService } from './configuracion.service';
import { ServicioDeCifrado } from './cifrado.service';
import { ValidadorDeApiKey } from './validador-apikey.service';
import { GuardarByokDto } from './configuracion.dto';

const OWNER = 'owner-1';

function crear(): {
  servicio: ConfiguracionService;
  repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  catalogo: { modeloIdsDe: jest.Mock };
  cifrado: { cifrar: jest.Mock };
  validador: { validar: jest.Mock };
} {
  const repo = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((x: Partial<ConfiguracionByok>) => x),
    save: jest.fn((x: ConfiguracionByok) =>
      Promise.resolve({
        ...x,
        id: x.id ?? 'c1',
        fechaActualizacion:
          x.fechaActualizacion ?? new Date('2026-01-02T00:00:00.000Z'),
      }),
    ),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const catalogo = {
    modeloIdsDe: jest
      .fn()
      .mockResolvedValue(['claude-opus-4-8', 'claude-haiku-4-5-20251001']),
  };
  const cifrado = { cifrar: jest.fn().mockReturnValue('iv:tag:ct') };
  const validador = { validar: jest.fn().mockResolvedValue('valida') };
  const servicio = new ConfiguracionService(
    repo as unknown as Repository<ConfiguracionByok>,
    catalogo as unknown as CatalogoService,
    cifrado as unknown as ServicioDeCifrado,
    validador as unknown as ValidadorDeApiKey,
  );
  return { servicio, repo, catalogo, cifrado, validador };
}

const datos: GuardarByokDto = {
  proveedor: 'anthropic',
  apiKey: 'sk-ant-123',
  modeloScoring: 'claude-haiku-4-5-20251001',
  modeloVeredicto: 'claude-opus-4-8',
};

describe('ConfiguracionService.guardar', () => {
  it('valida, cifra y guarda; la respuesta no incluye la key', async () => {
    const { servicio, repo, cifrado } = crear();

    const dto = await servicio.guardar(OWNER, datos);

    expect(cifrado.cifrar).toHaveBeenCalledWith('sk-ant-123');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ apiKeyCifrada: 'iv:tag:ct', ownerId: OWNER }),
    );
    expect(dto).toEqual(
      expect.objectContaining({
        proveedor: 'anthropic',
        apiKeyRegistrada: true,
      }),
    );
    expect(dto).not.toHaveProperty('apiKey');
    expect(dto).not.toHaveProperty('apiKeyCifrada');
  });

  it('un modelo fuera del catálogo del proveedor → ValidacionFallida (422)', async () => {
    const { servicio, validador } = crear();

    await expect(
      servicio.guardar(OWNER, { ...datos, modeloScoring: 'gpt-4o' }),
    ).rejects.toBeInstanceOf(ValidacionFallidaException);
    expect(validador.validar).not.toHaveBeenCalled();
  });

  it('key inválida → ApiKeyInvalida (422)', async () => {
    const { servicio, validador, repo } = crear();
    validador.validar.mockResolvedValue('invalida');

    await expect(servicio.guardar(OWNER, datos)).rejects.toBeInstanceOf(
      ApiKeyInvalidaException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('proveedor no disponible → ProveedorNoDisponible (503)', async () => {
    const { servicio, validador } = crear();
    validador.validar.mockResolvedValue('no_disponible');

    await expect(servicio.guardar(OWNER, datos)).rejects.toBeInstanceOf(
      ProveedorNoDisponibleException,
    );
  });

  it('reemplaza la config existente (idempotente, no crea otra)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue({ id: 'c1', ownerId: OWNER });

    await servicio.guardar(OWNER, datos);

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1' }),
    );
  });
});

describe('ConfiguracionService.obtener/eliminar', () => {
  it('sin configuración → RecursoNoEncontrado (404)', async () => {
    const { servicio } = crear();

    await expect(servicio.obtener(OWNER)).rejects.toBeInstanceOf(
      RecursoNoEncontradoException,
    );
  });

  it('obtener no expone la key', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue({
      ownerId: OWNER,
      proveedor: 'anthropic',
      modeloScoring: 'claude-haiku-4-5-20251001',
      modeloVeredicto: 'claude-opus-4-8',
      apiKeyCifrada: 'iv:tag:ct',
      fechaActualizacion: new Date('2026-01-02T00:00:00.000Z'),
    });

    const dto = await servicio.obtener(OWNER);

    expect(dto.apiKeyRegistrada).toBe(true);
    expect(JSON.stringify(dto)).not.toContain('iv:tag:ct');
  });

  it('eliminar sin configuración → RecursoNoEncontrado (404)', async () => {
    const { servicio, repo } = crear();

    await expect(servicio.eliminar(OWNER)).rejects.toBeInstanceOf(
      RecursoNoEncontradoException,
    );
    expect(repo.remove).not.toHaveBeenCalled();
  });
});
