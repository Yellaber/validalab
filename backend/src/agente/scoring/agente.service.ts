import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfigService } from '../../config/app-config.service';
import { Entrevista } from '../../entrevistas/entrevista/entrevista.entity';
import { ScoreEntrevista } from '../../entrevistas/entrevista/entrevista.types';
import { HipotesisService } from '../../ideas/hipotesis/hipotesis.service';
import { UmbralesService } from '../../ideas/umbral/umbrales.service';
import { AlertasService } from '../../kpis/alertas/alertas.service';
import {
  EjecucionAgente,
  EstadoEjecucion,
  ModoAgente,
} from '../ejecucion/ejecucion-agente.entity';
import { ModeloDeChatFactory } from '../proveedor/modelo-chat.factory';
import { SalidaScoring } from './esquema-scoring';
import { ejecutarScoring } from './grafo-scoring';
import { calcularHashScoring } from './hash-scoring';
import { humanScoring, SYSTEM_SCORING } from './prompt-scoring';
import { crearToolsDominio } from './tools-dominio';

/** Salida normalizada de un intento de scoring (real o fake) antes de persistir. */
interface SalidaEjecucion {
  salida: SalidaScoring;
  modo: ModoAgente;
  proveedor: string | null;
  modelo: string | null;
  iteraciones: number;
  tokensEntrada: number | null;
  tokensSalida: number | null;
}

/**
 * El Validador Inteligente para el scoring de entrevistas (SRS §8, RF-AG-*). Se
 * dispara desde `entrevistas` de forma asíncrona (fire-and-forget) y nunca
 * propaga errores al flujo HTTP: cualquier fallo deja la entrevista `fallida` con
 * su traza. Es idempotente (RF-22c) y agnóstico del proveedor (RNF-06).
 */
@Injectable()
export class AgenteService {
  private readonly logger = new Logger(AgenteService.name);

  constructor(
    @InjectRepository(Entrevista)
    private readonly entrevistas: Repository<Entrevista>,
    @InjectRepository(EjecucionAgente)
    private readonly ejecuciones: Repository<EjecucionAgente>,
    private readonly factory: ModeloDeChatFactory,
    private readonly hipotesis: HipotesisService,
    private readonly umbrales: UmbralesService,
    private readonly config: AppConfigService,
    private readonly alertas: AlertasService,
  ) {}

  /**
   * Puntúa una entrevista. Omite el trabajo si ya está `puntuada` con el mismo
   * hash (idempotencia); si no, la mueve a `procesando`, ejecuta el agente (real
   * o `fake`) y persiste `puntuada` + `score` o `fallida`, siempre dejando traza.
   * No rechaza nunca: está pensado para invocarse sin `await`.
   */
  async solicitarScoring(
    ownerId: string,
    entrevista: Entrevista,
  ): Promise<void> {
    const { versionRubrica, modo } = this.config.agente;
    const hash = calcularHashScoring(entrevista.respuestas, versionRubrica);
    if (this.estaAlDia(entrevista, hash)) {
      return; // nada cambió: no re-puntúa (RF-22c)
    }

    try {
      await this.entrevistas.update(
        { id: entrevista.id },
        { estadoScoring: 'procesando' },
      );
      const resultado =
        modo === 'fake'
          ? this.puntuarFake(entrevista, hash)
          : await this.puntuarReal(ownerId, entrevista);
      await this.finalizarPuntuada(ownerId, entrevista, hash, resultado);
      await this.evaluarAlertas(ownerId, entrevista.ideaId);
    } catch (error) {
      await this.finalizarFallida(ownerId, entrevista, error);
    }
  }

  /**
   * Puntúa una entrevista de forma SÍNCRONA, para la re-evaluación en lote (E8b).
   * A diferencia de `solicitarScoring` (asíncrono, que traga errores), devuelve el
   * resultado y PROPAGA los errores (sin BYOK / proveedor caído) para que el lote
   * reporte conteos y costo reales. Omite por idempotencia si el hash coincide
   * (RF-22c). Tras re-puntuar, reevalúa las alertas de la idea (E5b).
   */
  async reevaluar(
    ownerId: string,
    entrevista: Entrevista,
  ): Promise<{
    reevaluada: boolean;
    tokensEntrada: number;
    tokensSalida: number;
  }> {
    const { versionRubrica, modo } = this.config.agente;
    const hash = calcularHashScoring(entrevista.respuestas, versionRubrica);
    if (this.estaAlDia(entrevista, hash)) {
      return { reevaluada: false, tokensEntrada: 0, tokensSalida: 0 };
    }
    // Puntúa primero: si falta BYOK o cae el proveedor, lanza ANTES de tocar el estado.
    const resultado =
      modo === 'fake'
        ? this.puntuarFake(entrevista, hash)
        : await this.puntuarReal(ownerId, entrevista);
    await this.entrevistas.update(
      { id: entrevista.id },
      { estadoScoring: 'procesando' },
    );
    await this.finalizarPuntuada(ownerId, entrevista, hash, resultado);
    await this.evaluarAlertas(ownerId, entrevista.ideaId);
    return {
      reevaluada: true,
      tokensEntrada: resultado.tokensEntrada ?? 0,
      tokensSalida: resultado.tokensSalida ?? 0,
    };
  }

  /** `true` si la entrevista ya está puntuada con el hash vigente (idempotencia, RF-22c). */
  private estaAlDia(entrevista: Entrevista, hash: string): boolean {
    return (
      entrevista.estadoScoring === 'puntuada' &&
      entrevista.score?.hashEntrada === hash
    );
  }

  /**
   * Dispara la evaluación de alertas de KPI tras un scoring exitoso (E5b). Nunca
   * propaga: un fallo aquí no debe marcar la entrevista `fallida` (el score ya se
   * persistió), solo se registra.
   */
  private async evaluarAlertas(ownerId: string, ideaId: string): Promise<void> {
    try {
      await this.alertas.evaluarIdea(ownerId, ideaId);
    } catch (error) {
      this.logger.warn(
        `No se pudieron evaluar las alertas de la idea ${ideaId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Ejecuta el agente real contra el proveedor BYOK del usuario (RNF-06). */
  private async puntuarReal(
    ownerId: string,
    entrevista: Entrevista,
  ): Promise<SalidaEjecucion> {
    const { modelo, proveedor, nombreModelo } = await this.factory.crear(
      ownerId,
      'scoring',
    );
    const tools = crearToolsDominio(
      {
        hipotesis: this.hipotesis,
        umbrales: this.umbrales,
        entrevistas: this.entrevistas,
      },
      { ownerId, ideaId: entrevista.ideaId, entrevistaId: entrevista.id },
    );
    const { maxIteraciones, maxReintentos, timeoutMs } = this.config.agente;
    const resultado = await ejecutarScoring({
      modelo,
      tools,
      system: SYSTEM_SCORING,
      human: humanScoring(entrevista),
      maxIteraciones,
      maxReintentos,
      timeoutMs,
    });
    return {
      salida: resultado.salida,
      modo: 'real',
      proveedor,
      modelo: nombreModelo,
      iteraciones: resultado.iteraciones,
      tokensEntrada: resultado.tokensEntrada,
      tokensSalida: resultado.tokensSalida,
    };
  }

  /**
   * Modo `fake`: salida válida y DETERMINISTA derivada del hash, sin proveedor ni
   * red. Recorre el mismo camino de estados y traza que el modo real.
   */
  private puntuarFake(entrevista: Entrevista, hash: string): SalidaEjecucion {
    const semilla = parseInt(hash.slice(0, 8), 16);
    const bits = parseInt(hash.slice(8, 16), 16);
    return {
      salida: {
        score: semilla % 11, // 0–10
        confianza: 40 + (semilla % 61), // 40–100
        justificacion: `Scoring simulado (modo fake), determinista por hash, a partir de ${entrevista.respuestas.length} respuesta(s).`,
        senales: [
          `respuestas analizadas: ${entrevista.respuestas.length}`,
          `citas registradas: ${entrevista.citas.length}`,
        ],
        senalesEstructuradas: {
          dolorConfirmado: (bits & 1) === 1,
          dolorUrgente: (bits & 2) === 2,
          sinSolucionActual: (bits & 4) === 4,
          disposicionPago: (bits & 8) === 8,
        },
      },
      modo: 'fake',
      proveedor: 'fake',
      modelo: 'fake',
      iteraciones: 0,
      tokensEntrada: null,
      tokensSalida: null,
    };
  }

  /** Persiste el `score` y marca `puntuada`; deja traza `exitosa`. */
  private async finalizarPuntuada(
    ownerId: string,
    entrevista: Entrevista,
    hash: string,
    resultado: SalidaEjecucion,
  ): Promise<void> {
    const score: ScoreEntrevista = {
      ...resultado.salida,
      proveedor: resultado.proveedor ?? undefined,
      modelo: resultado.modelo ?? undefined,
      rubricaVersion: this.config.agente.versionRubrica,
      hashEntrada: hash,
      tokensEntrada: resultado.tokensEntrada ?? undefined,
      tokensSalida: resultado.tokensSalida ?? undefined,
      fechaScoring: new Date().toISOString(),
    };
    await this.registrarEjecucion(
      ownerId,
      entrevista,
      resultado,
      'exitosa',
      null,
    );
    // Guarda solo si la entrevista sigue `procesando`: una edición concurrente de
    // las respuestas la habría movido a `pendiente` (con un scoring nuevo en
    // curso), y en ese caso no debemos pisar el estado con datos ya obsoletos.
    await this.entrevistas.update(
      { id: entrevista.id, estadoScoring: 'procesando' },
      { estadoScoring: 'puntuada', score },
    );
  }

  /** Marca `fallida` (si sigue `procesando`) y deja traza del error. */
  private async finalizarFallida(
    ownerId: string,
    entrevista: Entrevista,
    error: unknown,
  ): Promise<void> {
    const motivo = error instanceof Error ? error.message : String(error);
    this.logger.warn(
      `Scoring fallido para la entrevista ${entrevista.id}: ${motivo}`,
    );
    try {
      await this.ejecuciones.save(
        this.ejecuciones.create({
          ideaId: entrevista.ideaId,
          entrevistaId: entrevista.id,
          ownerId,
          tarea: 'scoring',
          modo: this.config.agente.modo,
          proveedor: null,
          modelo: null,
          estado: 'fallida',
          iteraciones: 0,
          tokensEntrada: null,
          tokensSalida: null,
          salida: null,
          error: motivo,
        }),
      );
      await this.entrevistas.update(
        { id: entrevista.id, estadoScoring: 'procesando' },
        { estadoScoring: 'fallida' },
      );
    } catch (persistError) {
      this.logger.error(
        `No se pudo registrar el fallo de scoring de ${entrevista.id}: ${String(persistError)}`,
      );
    }
  }

  /** Inserta la fila de traza de una ejecución (RF-AG-08). */
  private async registrarEjecucion(
    ownerId: string,
    entrevista: Entrevista,
    resultado: SalidaEjecucion,
    estado: EstadoEjecucion,
    error: string | null,
  ): Promise<void> {
    await this.ejecuciones.save(
      this.ejecuciones.create({
        ideaId: entrevista.ideaId,
        entrevistaId: entrevista.id,
        ownerId,
        tarea: 'scoring',
        modo: resultado.modo,
        proveedor: resultado.proveedor,
        modelo: resultado.modelo,
        estado,
        iteraciones: resultado.iteraciones,
        tokensEntrada: resultado.tokensEntrada,
        tokensSalida: resultado.tokensSalida,
        salida: resultado.salida,
        error,
      }),
    );
  }
}
