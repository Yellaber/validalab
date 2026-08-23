import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, map, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, RegistroUsuarioRequest, TokenRespuesta } from '../api/sesion.model';
import { Usuario } from '../api/usuario.model';

/**
 * Única fuente de verdad de la sesión del cliente. Mantiene el `accessToken` en
 * **memoria** (nunca en `localStorage`/`sessionStorage`) y el `usuario` en signals;
 * el refresh token vive solo en la cookie `HttpOnly` que gestiona el backend, así
 * que el cliente no lo ve ni lo persiste. Guards, shell e interceptor leen estos
 * signals; el trabajo async actualiza la UI a través de ellos (requisito zoneless).
 */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  private readonly _accessToken = signal<string | null>(null);
  private readonly _usuario = signal<Usuario | null>(null);

  readonly usuario = this._usuario.asReadonly();
  readonly estaAutenticado = computed(() => this._usuario() !== null);

  /** Renovación en curso, compartida para que varias peticiones 401 no disparen múltiples refresh. */
  private refrescoEnCurso: Observable<TokenRespuesta> | null = null;

  /** Access token en memoria; lo lee el interceptor de autorización. */
  accessToken(): string | null {
    return this._accessToken();
  }

  /** Registra una cuenta nueva. No inicia sesión (el usuario luego hace login). */
  registrar(datos: RegistroUsuarioRequest): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.base}/usuarios/registro`, datos);
  }

  /** Inicia sesión: guarda el access token en memoria y el usuario. */
  iniciarSesion(datos: LoginRequest): Observable<Usuario> {
    return this.http.post<TokenRespuesta>(`${this.base}/usuarios/login`, datos).pipe(
      tap((respuesta) => this.establecer(respuesta)),
      map((respuesta) => respuesta.usuario),
    );
  }

  /**
   * Silent refresh (`POST /usuarios/refresh`, sin cuerpo; la cookie viaja sola).
   * Restaura access token + usuario. Comparte una única renovación entre llamadas
   * concurrentes y la libera al terminar.
   */
  renovar(): Observable<TokenRespuesta> {
    if (!this.refrescoEnCurso) {
      this.refrescoEnCurso = this.http
        .post<TokenRespuesta>(`${this.base}/usuarios/refresh`, null)
        .pipe(
          tap((respuesta) => this.establecer(respuesta)),
          finalize(() => (this.refrescoEnCurso = null)),
          shareReplay(1),
        );
    }
    return this.refrescoEnCurso;
  }

  /** Cierra sesión en el backend (revoca + limpia cookie) y vacía el estado local pase lo que pase. */
  cerrarSesion(): Observable<void> {
    return this.http
      .post<void>(`${this.base}/usuarios/logout`, null)
      .pipe(finalize(() => this.limpiar()));
  }

  /** Vacía el estado de sesión sin llamar al backend (p. ej. tras un refresh fallido). */
  limpiar(): void {
    this._accessToken.set(null);
    this._usuario.set(null);
  }

  private establecer(respuesta: TokenRespuesta): void {
    this._accessToken.set(respuesta.accessToken);
    this._usuario.set(respuesta.usuario);
  }
}
