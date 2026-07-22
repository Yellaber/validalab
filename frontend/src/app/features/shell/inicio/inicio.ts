import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SesionService } from '../../../core/auth/sesion.service';

/** Página de inicio del shell: marcador de posición del futuro portafolio de ideas (E1). */
@Component({
  selector: 'app-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Hola, {{ usuario()?.nombre }} 👋</h1>
    <p>
      Aquí vivirá tu <strong>portafolio de ideas</strong>. Todavía no hay nada que mostrar: la
      gestión de ideas llega en la siguiente épica.
    </p>
  `,
  styles: `
    :host {
      display: block;
      max-width: 42rem;
    }
    h1 {
      font-size: 1.5rem;
      color: #111827;
    }
    p {
      color: #4b5563;
      line-height: 1.6;
    }
  `,
})
export class Inicio {
  private readonly sesion = inject(SesionService);
  protected readonly usuario = this.sesion.usuario;
}
