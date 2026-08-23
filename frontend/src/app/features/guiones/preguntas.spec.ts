import { Pregunta } from '../../core/api/guion.model';
import { FilaPregunta, aRequests, filaNueva, filasDesde, moverFila } from './preguntas';

function filas(...textos: string[]): FilaPregunta[] {
  return textos.map((t) => filaNueva(t));
}

describe('preguntas', () => {
  describe('filaNueva', () => {
    it('crea una fila vacía por defecto, con clave local propia', () => {
      const a = filaNueva();
      const b = filaNueva();

      expect(a.texto).toBe('');
      expect(a.claveLocal).not.toBe(b.claveLocal);
    });

    it('la fila no tiene id ni orden', () => {
      expect(Object.keys(filaNueva('¿Cómo lo resuelves?')).sort()).toEqual(['claveLocal', 'texto']);
    });
  });

  describe('filasDesde', () => {
    it('vuelca las preguntas del servidor respetando su orden', () => {
      const preguntas: Pregunta[] = [
        { id: 'p2', orden: 2, texto: 'Segunda' },
        { id: 'p1', orden: 1, texto: 'Primera' },
        { id: 'p3', orden: 3, texto: 'Tercera' },
      ];

      expect(filasDesde(preguntas).map((f) => f.texto)).toEqual(['Primera', 'Segunda', 'Tercera']);
    });

    it('no arrastra el id del servidor a la fila local', () => {
      const filasLocales = filasDesde([{ id: 'p1', orden: 1, texto: 'Primera' }]);

      expect(JSON.stringify(filasLocales)).not.toContain('p1');
    });
  });

  describe('moverFila', () => {
    it('sube una fila intercambiándola con la anterior', () => {
      const resultado = moverFila(filas('A', 'B', 'C'), 1, -1);

      expect(resultado.map((f) => f.texto)).toEqual(['B', 'A', 'C']);
    });

    it('baja una fila intercambiándola con la siguiente', () => {
      const resultado = moverFila(filas('A', 'B', 'C'), 1, 1);

      expect(resultado.map((f) => f.texto)).toEqual(['A', 'C', 'B']);
    });

    it('la primera no sube y la última no baja', () => {
      const original = filas('A', 'B', 'C');

      expect(moverFila(original, 0, -1).map((f) => f.texto)).toEqual(['A', 'B', 'C']);
      expect(moverFila(original, 2, 1).map((f) => f.texto)).toEqual(['A', 'B', 'C']);
    });

    it('mover conserva la clave local de la fila, que viaja con ella', () => {
      const original = filas('A', 'B');
      const claveDeB = original[1].claveLocal;

      expect(moverFila(original, 1, -1)[0].claveLocal).toBe(claveDeB);
    });
  });

  describe('aRequests', () => {
    it('numera 1..n por posición', () => {
      expect(aRequests(filas('A', 'B', 'C'))).toEqual([
        { orden: 1, texto: 'A' },
        { orden: 2, texto: 'B' },
        { orden: 3, texto: 'C' },
      ]);
    });

    it('tras eliminar una fila intermedia el orden queda sin huecos', () => {
      const restantes = filas('A', 'B', 'C').filter((_, i) => i !== 1);

      expect(aRequests(restantes).map((p) => p.orden)).toEqual([1, 2]);
    });

    it('tras intercalar una fila el orden se recalcula por posición', () => {
      const original = filas('A', 'C');
      const conIntercalada = [original[0], filaNueva('B'), original[1]];

      expect(aRequests(conIntercalada)).toEqual([
        { orden: 1, texto: 'A' },
        { orden: 2, texto: 'B' },
        { orden: 3, texto: 'C' },
      ]);
    });

    it('el orden enviado sigue al orden visible tras mover', () => {
      const movidas = moverFila(filas('A', 'B'), 1, -1);

      expect(aRequests(movidas)).toEqual([
        { orden: 1, texto: 'B' },
        { orden: 2, texto: 'A' },
      ]);
    });

    it('recorta el texto', () => {
      expect(aRequests(filas('  A  '))[0].texto).toBe('A');
    });

    it('la salida no contiene la clave local ni ningún id', () => {
      const salida = JSON.stringify(aRequests(filas('A', 'B')));

      expect(salida).not.toContain('claveLocal');
      expect(salida).not.toContain('fila-');
      expect(salida).not.toContain('"id"');
    });
  });
});
