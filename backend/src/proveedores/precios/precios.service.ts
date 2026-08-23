import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrecioModelo } from './precio-modelo.entity';
import { aPrecioDto, PrecioModeloRespuesta } from './precios-respuesta';

/**
 * Sirve la tabla de precios por modelo (RF-22e). Los precios son datos
 * configurables (RNF-18); este servicio solo los expone y los provee al motor de
 * costo como un mapa por `(proveedor, modelo)` con la tarifa más reciente.
 */
@Injectable()
export class PreciosService {
  constructor(
    @InjectRepository(PrecioModelo)
    private readonly precios: Repository<PrecioModelo>,
  ) {}

  /** Devuelve la tabla de precios completa (por proveedor y modelo). */
  async listar(): Promise<PrecioModeloRespuesta[]> {
    const precios = await this.precios.find({
      order: { proveedor: 'ASC', modeloId: 'ASC' },
    });
    return precios.map(aPrecioDto);
  }

  /**
   * Mapa `"proveedor|modelo" → PrecioModelo` con la tarifa vigente (la más
   * reciente por `vigenteDesde`), para el cálculo del costo. Consumido por
   * `CostoService`.
   */
  async mapaVigente(): Promise<Map<string, PrecioModelo>> {
    const precios = await this.precios.find({
      order: { vigenteDesde: 'ASC' },
    });
    const mapa = new Map<string, PrecioModelo>();
    for (const p of precios) {
      // Orden ascendente por vigencia: la última escritura por clave prevalece.
      mapa.set(`${p.proveedor}|${p.modeloId}`, p);
    }
    return mapa;
  }
}
