import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import { ConflictoException } from '../../common/errors/dominio.exception';
import { ProveedorId } from '../../proveedores/catalogo/proveedor.types';
import { ConfiguracionService } from '../../proveedores/configuracion/configuracion.service';

/** Tarea del agente para la que se construye el modelo (elige scoring o veredicto). */
export type TareaModelo = 'scoring' | 'veredicto';

/** Modelo de chat listo para una tarea del agente, con sus metadatos. */
export interface ModeloAgente {
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
 * Selecciona el modelo de IA para una tarea del agente (scoring o veredicto)
 * según la config BYOK del usuario dueño de la idea: descifra la API key en el
 * momento (nunca antes) y construye el `BaseChatModel` del proveedor con el
 * modelo de esa tarea. Sin config BYOK → `ConflictoException` (la captura la capa
 * agéntica para degradar sin romper el flujo).
 */
@Injectable()
export class ModeloDeChatFactory {
  constructor(private readonly configuracion: ConfiguracionService) {}

  async crear(ownerId: string, tarea: TareaModelo): Promise<ModeloAgente> {
    const credencial = await this.configuracion.credencialPara(ownerId, tarea);
    if (!credencial) {
      throw new ConflictoException(
        'No hay configuración BYOK: configura tu proveedor de IA antes de usar el agente.',
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
