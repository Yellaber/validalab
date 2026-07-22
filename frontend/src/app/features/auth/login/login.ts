import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ErrorApi } from '../../../core/api/error-api.model';
import { SesionService } from '../../../core/auth/sesion.service';

/** Pantalla de inicio de sesión (Signal Forms). Valida en el cliente y llama a `SesionService`. */
@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: '../auth.css',
})
export class Login {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  protected readonly modelo = signal({ email: '', password: '' });
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.email, { message: 'El email es obligatorio' });
    email(ruta.email, { message: 'Introduce un email válido' });
    required(ruta.password, { message: 'La contraseña es obligatoria' });
  });

  protected readonly enviando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);

  onSubmit(): void {
    this.errorGeneral.set(null);
    void submit(this.formulario, async () => {
      this.enviando.set(true);
      try {
        await firstValueFrom(this.sesion.iniciarSesion(this.modelo()));
        await this.router.navigateByUrl('/');
      } catch (error) {
        this.errorGeneral.set(this.mensajeDeError(error));
      } finally {
        this.enviando.set(false);
      }
    });
  }

  private mensajeDeError(error: unknown): string {
    if (error instanceof ErrorApi) {
      if (error.codigo === 'NO_AUTENTICADO') {
        return 'Email o contraseña incorrectos.';
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
  }
}
