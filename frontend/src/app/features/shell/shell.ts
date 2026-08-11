import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SesionService } from '../../core/auth/sesion.service';

/** Shell autenticado: identidad del usuario, cierre de sesión y `<router-outlet>` de dominio. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  protected readonly usuario = this.sesion.usuario;
  protected readonly cerrando = signal(false);

  async cerrarSesion(): Promise<void> {
    this.cerrando.set(true);
    try {
      await firstValueFrom(this.sesion.cerrarSesion());
    } catch {
      // El estado local ya se limpia en el `finalize` del servicio; el fallo del
      // servidor no debe impedir salir de la sesión localmente.
    } finally {
      await this.router.navigateByUrl('/login');
    }
  }
}
