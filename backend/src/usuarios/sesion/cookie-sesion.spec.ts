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
    it('marca httpOnly y path acotado, con el maxAge dado', () => {
      const opts = opcionesCookieRefresh({
        secure: true,
        sameSite: 'strict',
        maxAgeMs: 12345,
      });

      expect(opts.httpOnly).toBe(true);
      expect(opts.sameSite).toBe('strict');
      expect(opts.path).toBe('/usuarios');
      expect(opts.secure).toBe(true);
      expect(opts.maxAge).toBe(12345);
    });

    it('propaga secure=false para dev sobre http', () => {
      expect(
        opcionesCookieRefresh({
          secure: false,
          sameSite: 'strict',
          maxAgeMs: 1,
        }).secure,
      ).toBe(false);
    });

    it('propaga el sameSite recibido, sin fijarlo', () => {
      expect(
        opcionesCookieRefresh({
          secure: true,
          sameSite: 'none',
          maxAgeMs: 1,
        }).sameSite,
      ).toBe('none');
      expect(
        opcionesCookieRefresh({ secure: true, sameSite: 'lax', maxAgeMs: 1 })
          .sameSite,
      ).toBe('lax');
    });
  });

  describe('opcionesLimpiezaCookieRefresh', () => {
    it('coincide en path/sameSite/httpOnly/secure y no fija maxAge', () => {
      const opts = opcionesLimpiezaCookieRefresh({
        secure: true,
        sameSite: 'strict',
      });

      expect(opts.httpOnly).toBe(true);
      expect(opts.sameSite).toBe('strict');
      expect(opts.path).toBe('/usuarios');
      expect(opts.secure).toBe(true);
      expect(opts.maxAge).toBeUndefined();
    });

    it('propaga el sameSite recibido', () => {
      expect(
        opcionesLimpiezaCookieRefresh({ secure: true, sameSite: 'none' })
          .sameSite,
      ).toBe('none');
    });
  });

  // El navegador solo borra una cookie si los atributos de la limpieza coinciden
  // con los de la emisión. Si divergieran, el logout revocaría la sesión en BD y
  // dejaría la cookie muerta en el navegador.
  describe('coherencia entre emisión y limpieza', () => {
    it.each(['strict', 'lax', 'none'] as const)(
      'los atributos coinciden con sameSite=%s',
      (sameSite) => {
        const emision = opcionesCookieRefresh({
          secure: true,
          sameSite,
          maxAgeMs: 1,
        });
        const limpieza = opcionesLimpiezaCookieRefresh({
          secure: true,
          sameSite,
        });

        expect(limpieza.sameSite).toBe(emision.sameSite);
        expect(limpieza.path).toBe(emision.path);
        expect(limpieza.secure).toBe(emision.secure);
        expect(limpieza.httpOnly).toBe(emision.httpOnly);
      },
    );
  });
});
