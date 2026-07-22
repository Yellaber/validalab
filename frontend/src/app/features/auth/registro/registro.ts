import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { email, form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ErrorApi } from '../../../core/api/error-api.model';
import { SesionService } from '../../../core/auth/sesion.service';

/** Pantalla de registro (Signal Forms). Valida en el cliente, registra y autentica. */
@Component({
  selector: 'app-registro',
  imports: [FormField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './registro.html',
  styleUrl: '../auth.css',
})
export class Registro {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  protected readonly modelo = signal({ email: '', nombre: '', password: '' });
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.email, { message: 'El email es obligatorio' });
    email(ruta.email, { message: 'Introduce un email válido' });
    required(ruta.nombre, { message: 'El nombre es obligatorio' });
    required(ruta.password, { message: 'La contraseña es obligatoria' });
    minLength(ruta.password, 8, {
      message: 'La contraseña debe tener al menos 8 caracteres',
    });
  });

  protected readonly enviando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);

  onSubmit(): void {
    this.errorGeneral.set(null);
    void submit(this.formulario, async () => {
      this.enviando.set(true);
      try {
        const datos = this.modelo();
        await firstValueFrom(this.sesion.registrar(datos));
        // Auto-login tras el alta para llevar al usuario directo al portafolio.
        await firstValueFrom(this.sesion.iniciarSesion(datos));
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
      if (error.codigo === 'CONFLICTO') {
        return 'Ese email ya está registrado. ¿Quieres iniciar sesión?';
      }
      if (error.codigo === 'VALIDACION_FALLIDA' && error.detalles?.length) {
        return error.detalles.map((d) => `${d.campo}: ${d.problema}`).join(' · ');
      }
      if (error.codigo === 'ERROR_RED') {
        return error.message;
      }
    }
    return 'No se pudo completar el registro. Inténtalo de nuevo.';
  }
}
