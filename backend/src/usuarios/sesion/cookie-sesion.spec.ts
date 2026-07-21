import {
  NOMBRE_COOKIE_REFRESH,
  opcionesCookieRefresh,
  opcionesLimpiezaCookieRefresh,
} from './cookie-sesion';

describe('cookie de refresh', () => {
  it('la cookie se llama refreshToken', () => {
    expect(NOMBRE_COOKIE_REFRESH).toBe('refreshToken');
  });

  describe('opcionesCookieRefresh', () => {
    it('marca httpOnly, sameSite strict y path acotado, con el maxAge dado', () => {
      const opts = opcionesCookieRefresh({ secure: true, maxAgeMs: 12345 });

      expect(opts.httpOnly).toBe(true);
      expect(opts.sameSite).toBe('strict');
      expect(opts.path).toBe('/usuarios');
      expect(opts.secure).toBe(true);
      expect(opts.maxAge).toBe(12345);
    });

    it('propaga secure=false para dev sobre http', () => {
      expect(opcionesCookieRefresh({ secure: false, maxAgeMs: 1 }).secure).toBe(
        false,
      );
    });
  });

  describe('opcionesLimpiezaCookieRefresh', () => {
    it('coincide en path/sameSite/httpOnly/secure y no fija maxAge', () => {
      const opts = opcionesLimpiezaCookieRefresh({ secure: true });

      expect(opts.httpOnly).toBe(true);
      expect(opts.sameSite).toBe('strict');
      expect(opts.path).toBe('/usuarios');
      expect(opts.secure).toBe(true);
      expect(opts.maxAge).toBeUndefined();
    });
  });
});
