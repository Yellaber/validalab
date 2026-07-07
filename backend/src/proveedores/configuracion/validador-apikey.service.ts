import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { ProveedorId } from '../catalogo/proveedor.types';

/** Resultado de validar una API key contra su proveedor. */
export type ResultadoValidacion = 'valida' | 'invalida' | 'no_disponible';

/** Milisegundos antes de considerar que el proveedor no responde. */
const TIMEOUT_MS = 8000;

/**
 * Endpoint ligero y autenticado por proveedor para comprobar la validez de una
 * key (listar modelos). Es la SEMILLA del adaptador común (RNF-06) que el agente
 * ampliará: añadir un proveedor es añadir una entrada aquí.
 */
const SONDA_POR_PROVEEDOR: Record<
  ProveedorId,
  (apiKey: string) => { url: string; headers: Record<string, string> }
> = {
  anthropic: (apiKey) => ({
    url: 'https://api.anthropic.com/v1/models',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
  }),
  openai: (apiKey) => ({
    url: 'https://api.openai.com/v1/models',
    headers: { Authorization: `Bearer ${apiKey}` },
  }),
  google: (apiKey) => ({
    url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    headers: {},
  }),
};

/**
 * Valida una API key contra su proveedor (RF-20). Con `BYOK_VALIDAR_KEY=false`
 * (dev/test) acepta cualquier key no vacía sin salir a la red. Con `true` hace
 * una sonda HTTP: `2xx → valida`; `401/403 → invalida`; error de red, timeout u
 * otro estado → `no_disponible`.
 */
@Injectable()
export class ValidadorDeApiKey {
  constructor(private readonly config: AppConfigService) {}

  async validar(
    proveedor: ProveedorId,
    apiKey: string,
  ): Promise<ResultadoValidacion> {
    if (!this.config.byok.validarKey) {
      return apiKey.trim().length > 0 ? 'valida' : 'invalida';
    }

    const { url, headers } = SONDA_POR_PROVEEDOR[proveedor](apiKey);
    const abort = new AbortController();
    const temporizador = setTimeout(() => abort.abort(), TIMEOUT_MS);
    try {
      const respuesta = await fetch(url, {
        method: 'GET',
        headers,
        signal: abort.signal,
      });
      if (respuesta.ok) return 'valida';
      if (respuesta.status === 401 || respuesta.status === 403) {
        return 'invalida';
      }
      return 'no_disponible';
    } catch {
      return 'no_disponible';
    } finally {
      clearTimeout(temporizador);
    }
  }
}
