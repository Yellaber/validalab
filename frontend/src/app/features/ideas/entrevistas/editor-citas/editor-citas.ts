import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { FilaCita, filaNueva } from '../citas';

/**
 * Editor de citas textuales, compartido por el alta y la edición de una entrevista.
 *
 * Las citas viven en un signal propio y **no** en el modelo de Signal Forms, al
 * revés que las preguntas del editor de guiones (E4a). La razón es la validación: allí
 * cada fila era obligatoria y `applyEach` daba el estado por fila gratis; aquí no hay
 * nada que validar —el `texto` solo decide si la fila se envía o se descarta— así que
 * meterlas en el formulario añadiría indirección sin ganar nada.
 *
 * Cualquier cita puede eliminarse, incluida la última: el contrato no las exige.
 */
@Component({
  selector: 'app-editor-citas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './editor-citas.html',
  styleUrls: ['../../../../shared/dominio.css', '../entrevistas.css'],
})
export class EditorCitas {
  readonly filas = model.required<FilaCita[]>();

  anadir(): void {
    this.filas.update((filas) => [...filas, filaNueva()]);
  }

  quitar(indice: number): void {
    this.filas.update((filas) => filas.filter((_, i) => i !== indice));
  }

  cambiarTexto(indice: number, texto: string): void {
    this.filas.update((filas) =>
      filas.map((fila, i) => (i === indice ? { ...fila, texto } : fila)),
    );
  }

  cambiarContexto(indice: number, contexto: string): void {
    this.filas.update((filas) =>
      filas.map((fila, i) => (i === indice ? { ...fila, contexto } : fila)),
    );
  }
}
