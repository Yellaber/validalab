import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApiKeyInvalidaException,
  ProveedorNoDisponibleException,
  RecursoNoEncontradoException,
  ValidacionFallidaException,
} from '../../common/errors/dominio.exception';
import { CatalogoService } from '../catalogo/catalogo.service';
import { ProveedorId } from '../catalogo/proveedor.types';
import { ServicioDeCifrado } from './cifrado.service';
import { ValidadorDeApiKey } from './validador-apikey.service';
import { ConfiguracionByok } from './configuracion-byok.entity';
import {
  aConfiguracionDto,
  ConfiguracionByokRespuesta,
} from './configuracion-respuesta';
import { GuardarByokDto } from './configuracion.dto';

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(ConfiguracionByok)
    private readonly configuraciones: Repository<ConfiguracionByok>,
    private readonly catalogo: CatalogoService,
    private readonly cifrado: ServicioDeCifrado,
    private readonly validador: ValidadorDeApiKey,
  ) {}

  /** Devuelve la config BYOK del usuario (sin la key). Sin config → 404. */
  async obtener(ownerId: string): Promise<ConfiguracionByokRespuesta> {
    const config = await this.configuraciones.findOne({ where: { ownerId } });
    if (!config) {
      throw new RecursoNoEncontradoException(
        'No hay configuración BYOK para este usuario.',
      );
    }
    return aConfiguracionDto(config);
  }

  /**
   * Crea o reemplaza (upsert por `owner_id`) la config BYOK. Valida los modelos
   * contra el catálogo del proveedor (422), valida la key contra el proveedor
   * (invalida → 422, no_disponible → 503), la cifra y guarda. No devuelve la key.
   */
  async guardar(
    ownerId: string,
    datos: GuardarByokDto,
  ): Promise<ConfiguracionByokRespuesta> {
    await this.validarModelos(
      datos.proveedor,
      datos.modeloScoring,
      datos.modeloVeredicto,
    );
    await this.validarApiKey(datos.proveedor, datos.apiKey);

    const config =
      (await this.configuraciones.findOne({ where: { ownerId } })) ??
      this.configuraciones.create({ ownerId });
    config.proveedor = datos.proveedor;
    config.modeloScoring = datos.modeloScoring;
    config.modeloVeredicto = datos.modeloVeredicto;
    config.apiKeyCifrada = this.cifrado.cifrar(datos.apiKey);
    return aConfiguracionDto(await this.configuraciones.save(config));
  }

  /** Revoca la config BYOK (y su credencial cifrada). Sin config → 404. */
  async eliminar(ownerId: string): Promise<void> {
    const config = await this.configuraciones.findOne({ where: { ownerId } });
    if (!config) {
      throw new RecursoNoEncontradoException(
        'No hay configuración BYOK para este usuario.',
      );
    }
    await this.configuraciones.remove(config);
  }

  /** Ambos modelos deben pertenecer al catálogo del proveedor; si no → 422. */
  private async validarModelos(
    proveedor: ProveedorId,
    modeloScoring: string,
    modeloVeredicto: string,
  ): Promise<void> {
    const ids = new Set(await this.catalogo.modeloIdsDe(proveedor));
    const invalidos = [modeloScoring, modeloVeredicto].filter(
      (m) => !ids.has(m),
    );
    if (invalidos.length > 0) {
      throw new ValidacionFallidaException(
        'Los modelos deben pertenecer al catálogo del proveedor.',
        invalidos.map((m) => ({
          campo: 'modelo',
          problema: `'${m}' no está en el catálogo de '${proveedor}'.`,
        })),
      );
    }
  }

  /** Valida la key contra el proveedor: invalida → 422; no_disponible → 503. */
  private async validarApiKey(
    proveedor: ProveedorId,
    apiKey: string,
  ): Promise<void> {
    const resultado = await this.validador.validar(proveedor, apiKey);
    if (resultado === 'invalida') {
      throw new ApiKeyInvalidaException();
    }
    if (resultado === 'no_disponible') {
      throw new ProveedorNoDisponibleException(
        'El proveedor no respondió al validar la API key.',
      );
    }
  }
}
