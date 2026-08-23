import { ProveedorId } from './proveedor.model';

/**
 * Visibilidad de costo estimado del consumo de IA (`contrato-api/openapi.yaml`,
 * tag `proveedores`, épica E8). Escrito a mano reflejando el contrato.
 *
 * **Es un estimado del consumo vía ValidaLab, NO el saldo de la cuenta** (RNF-17):
 * las API keys de inferencia no exponen el saldo. `esEstimado` es siempre `true` y
 * `aclaracion` trae el texto normativo; para recargar, `urlFacturacion` enlaza al
 * panel del proveedor. Todo lo de aquí lo **calcula el servidor**; el cliente lee.
 */

/** Moneda del costo estimado. Los proveedores facturan la inferencia en USD. */
export type Moneda = 'USD';

/** Tarea del agente que consumió IA. */
export type TareaCosto = 'scoring' | 'veredicto';

/** Costo estimado del consumo de una idea, desglosado por tarea del agente. */
export interface DesgloseCostoTarea {
  tarea: TareaCosto;
  llamadas: number;
  tokensEntrada: number;
  tokensSalida: number;
  /** Costo estimado acumulado de esta tarea (tokens × tabla de precios). */
  costoEstimado: number;
}

/** Costo estimado acumulado del consumo de IA de una idea (RF-22f). */
export interface CostoIdea {
  ideaId: string;
  /** Proveedor con que se generó el consumo; `null` si aún no hay consumo o BYOK. */
  proveedor: ProveedorId | null;
  moneda: Moneda;
  costoEstimadoTotal: number;
  desglosePorTarea: DesgloseCostoTarea[];
  tokensEntrada: number;
  tokensSalida: number;
  llamadas: number;
  /** Siempre `true`: recalca que es un estimado del consumo, no el saldo. */
  esEstimado: boolean;
  /** Texto normativo (SRS §8.9.1): estimado del consumo vía ValidaLab, no el saldo. */
  aclaracion: string;
  /** Enlace al panel de facturación del proveedor para recargar (RF-22g). */
  urlFacturacion: string | null;
  fechaCalculo: string;
}

/** Costo estimado de una idea, para el desglose del costo total del usuario. */
export interface CostoIdeaResumen {
  ideaId: string;
  /** Título de la idea, para identificarla en el desglose. */
  titulo: string;
  costoEstimado: number;
}

/** Costo estimado acumulado total del usuario, agregado sobre todas sus ideas. */
export interface CostoUsuario {
  moneda: Moneda;
  costoEstimadoTotal: number;
  costoPorIdea: CostoIdeaResumen[];
  /** Proveedor BYOK configurado; `null` si aún no hay configuración. */
  proveedor: ProveedorId | null;
  tokensEntrada: number;
  tokensSalida: number;
  esEstimado: boolean;
  aclaracion: string;
  urlFacturacion: string | null;
  fechaCalculo: string;
}

/**
 * Tarifa de un modelo en la tabla de precios (RF-22e). Los precios son datos
 * configurables, actualizables sin redesplegar (RNF-18), no valores cableados.
 */
export interface PrecioModelo {
  proveedor: ProveedorId;
  /** Id del modelo (cadena del catálogo curado, igual que `ModeloIA.id`). */
  modeloId: string;
  precioEntradaPorMillon: number;
  precioSalidaPorMillon: number;
  /** Precio de entrada cacheada (prompt caching); `null` si no aplica. */
  precioEntradaCacheadaPorMillon: number | null;
  moneda: Moneda;
  vigenteDesde?: string;
}
