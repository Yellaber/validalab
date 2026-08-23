/**
 * Configuración BYOK del proveedor de IA (`contrato-api/openapi.yaml`, tag
 * `proveedores`, épica E7). Escrito a mano reflejando el contrato.
 *
 * **La API key nunca viaja de vuelta** (RNF-07): el cliente la envía al guardar,
 * pero el servidor no la devuelve jamás; `apiKeyRegistrada` solo indica su
 * presencia. Los `id` de modelo son datos del catálogo curado, actualizables sin
 * redesplegar (RNF-18) — cadenas, no enums.
 */

/** Proveedor de IA soportado. Un cuarto entraría por el adaptador común (RNF-06). */
export const PROVEEDORES_ID = ['anthropic', 'openai', 'google'] as const;
export type ProveedorId = (typeof PROVEEDORES_ID)[number];

/** Modelo idóneo para el análisis dentro de un proveedor. */
export interface ModeloIA {
  /** Identificador del modelo en el proveedor (cadena del catálogo, no enum). */
  id: string;
  nombre: string;
  descripcion?: string;
}

/** Proveedor soportado con su lista curada de modelos idóneos. */
export interface ProveedorIA {
  id: ProveedorId;
  nombre: string;
  modelos: ModeloIA[];
}

/**
 * Configuración BYOK del usuario. NUNCA incluye la API key: solo
 * `apiKeyRegistrada` indica su presencia. Dos modelos por tarea: económico para
 * scoring (E4), potente para veredicto (E6).
 */
export interface ConfiguracionByok {
  proveedor: ProveedorId;
  modeloScoring: string;
  modeloVeredicto: string;
  apiKeyRegistrada: boolean;
  fechaActualizacion: string;
}

/**
 * Crea o reemplaza (idempotente) la configuración BYOK. La `apiKey` es write-only:
 * se acepta aquí pero nunca se devuelve. Los modelos deben pertenecer al catálogo
 * del `proveedor`.
 */
export interface GuardarByokRequest {
  proveedor: ProveedorId;
  apiKey: string;
  modeloScoring: string;
  modeloVeredicto: string;
}
