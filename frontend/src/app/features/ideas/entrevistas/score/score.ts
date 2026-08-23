import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  AjusteScore,
  ScoreEntrevista,
  SenalesEstructuradas,
} from '../../../../core/api/entrevista.model';

/** Una señal estructurada ya lista para pintar. */
interface SenalVista {
  etiqueta: string;
  detectada: boolean;
}

const ETIQUETAS_SENALES: Record<keyof SenalesEstructuradas, string> = {
  dolorConfirmado: 'Confirma el problema',
  dolorUrgente: 'Lo vive como urgente',
  sinSolucionActual: 'No tiene solución que le sirva',
  disposicionPago: 'Muestra disposición a pagar',
};

/**
 * Bloque del juicio del agente sobre una entrevista.
 *
 * Tres criterios lo gobiernan:
 *
 * - **Ausencia no es negativo.** `senalesEstructuradas` es opcional: un score de una
 *   rúbrica anterior no las trae. El contrato dice que al **agregarlas** en KPIs las
 *   ausentes cuentan como `false`, pero eso vale para agregar, no para mostrar:
 *   pintar cuatro «no» afirmaría algo que el agente nunca dijo.
 * - **El costo es consumo, no saldo.** Las API keys de inferencia no exponen el
 *   crédito de la cuenta (RNF-17), así que se etiqueta sin ambigüedad.
 * - **El ajuste acompaña, no sustituye.** Cuando existe se muestran los dos valores y
 *   se dice cuál prevalece en los KPIs; la justificación del agente permanece.
 */
@Component({
  selector: 'app-score-entrevista',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './score.html',
  styleUrl: './score.css',
})
export class ScoreEntrevistaBloque {
  readonly score = input.required<ScoreEntrevista>();
  readonly ajuste = input<AjusteScore | null>(null);

  /** `undefined` cuando la rúbrica no las clasificó; nunca cuatro `false` inventados. */
  protected readonly senalesEstructuradas = computed<SenalVista[] | undefined>(() => {
    const senales = this.score().senalesEstructuradas;
    if (!senales) {
      return undefined;
    }
    return (Object.keys(ETIQUETAS_SENALES) as (keyof SenalesEstructuradas)[]).map((clave) => ({
      etiqueta: ETIQUETAS_SENALES[clave],
      detectada: senales[clave],
    }));
  });

  protected readonly hayTrazabilidad = computed(() => {
    const s = this.score();
    return !!(s.proveedor || s.modelo || s.rubricaVersion || s.fechaScoring);
  });

  protected readonly hayCosto = computed(() => {
    const s = this.score();
    return (
      s.tokensEntrada !== undefined || s.tokensSalida !== undefined || s.costoEstimado !== undefined
    );
  });
}
