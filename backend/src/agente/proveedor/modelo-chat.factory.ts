import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import { ConflictoException } from '../../common/errors/dominio.exception';
import { ProveedorId } from '../../proveedores/catalogo/proveedor.types';
import { ConfiguracionService } from '../../proveedores/configuracion/configuracion.service';

/** Modelo de chat listo para el scoring, con sus metadatos de proveedor/modelo. */
export interface ModeloScoring {
  modelo: BaseChatModel;
  proveedor: ProveedorId;
  nombreModelo: string;
}

type ConstructorModelo = (modelo: string, apiKey: string) => BaseChatModel;

/**
 * Adaptador común (RNF-06): un constructor por proveedor detrás de la MISMA
 * interfaz `BaseChatModel`. Añadir un cuarto proveedor es añadir una entrada
 * aquí; el resto de la capa agéntica no se entera. `temperature: 0` para un
 * scoring lo más determinista posible.
 */
const ADAPTADORES: Record<ProveedorId, ConstructorModelo> = {
  anthropic: (model, apiKey) =>
    new ChatAnthropic({ model, apiKey, temperature: 0 }),
  openai: (model, apiKey) => new ChatOpenAI({ model, apiKey, temperature: 0 }),
  google: (model, apiKey) =>
    new ChatGoogleGenerativeAI({ model, apiKey, temperature: 0 }),
};

/**
 * Selecciona el modelo de IA para el scoring según la config BYOK del usuario
 * dueño de la idea: descifra la API key en el momento (nunca antes) y construye
 * el `BaseChatModel` del proveedor con su `modeloScoring`. Sin config BYOK →
 * `ConflictoException` (la captura la capa agéntica para marcar la entrevista
 * `fallida` sin romper el registro).
 */
@Injectable()
export class ModeloDeChatFactory {
  constructor(private readonly configuracion: ConfiguracionService) {}

  async crear(ownerId: string): Promise<ModeloScoring> {
    const credencial = await this.configuracion.credencialParaScoring(ownerId);
    if (!credencial) {
      throw new ConflictoException(
        'No hay configuración BYOK: configura tu proveedor de IA antes de puntuar entrevistas.',
      );
    }
    const construir = ADAPTADORES[credencial.proveedor];
    return {
      modelo: construir(credencial.modelo, credencial.apiKey),
      proveedor: credencial.proveedor,
      nombreModelo: credencial.modelo,
    };
  }
}
