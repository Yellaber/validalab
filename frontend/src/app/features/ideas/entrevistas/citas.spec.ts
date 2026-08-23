import { Cita } from '../../../core/api/entrevista.model';
import { FilaCita, aRequests, filaNueva, filasDesde } from './citas';

function filas(...textos: string[]): FilaCita[] {
  return textos.map((t) => filaNueva(t));
}

describe('citas', () => {
  describe('filaNueva', () => {
    it('crea una fila vacía con clave local propia', () => {
      const a = filaNueva();
      const b = filaNueva();

      expect(a.texto).toBe('');
      expect(a.contexto).toBe('');
      expect(a.claveLocal).not.toBe(b.claveLocal);
    });

    it('la fila no tiene id ni orden', () => {
      expect(Object.keys(filaNueva('Cita')).sort()).toEqual(['claveLocal', 'contexto', 'texto']);
    });
  });

  describe('filasDesde', () => {
    it('vuelca las citas del servidor conservando texto y contexto', () => {
      const citas: Cita[] = [
        { id: 'q1', texto: 'Pierdo dos horas al día', contexto: 'sobre el proceso actual' },
        { id: 'q2', texto: 'Pagaría por esto' },
      ];

      expect(filasDesde(citas).map((f) => [f.texto, f.contexto])).toEqual([
        ['Pierdo dos horas al día', 'sobre el proceso actual'],
        ['Pagaría por esto', ''],
      ]);
    });

    it('no arrastra el id del servidor a la fila local', () => {
      expect(JSON.stringify(filasDesde([{ id: 'q1', texto: 'Cita' }]))).not.toContain('q1');
    });
  });

  describe('aRequests', () => {
    it('envía texto recortado', () => {
      expect(aRequests(filas('  Pierdo dos horas  '))).toEqual([{ texto: 'Pierdo dos horas' }]);
    });

    it('incluye el contexto solo cuando tiene contenido', () => {
      const conContexto = [filaNueva('Cita', 'en la demo'), filaNueva('Otra', '   ')];

      expect(aRequests(conContexto)).toEqual([
        { texto: 'Cita', contexto: 'en la demo' },
        { texto: 'Otra' },
      ]);
    });

    it('omite las filas sin texto', () => {
      const mezcladas = [filaNueva('Válida'), filaNueva('   '), filaNueva('')];

      expect(aRequests(mezcladas)).toEqual([{ texto: 'Válida' }]);
    });

    it('sin ninguna fila con texto devuelve un arreglo vacío, que es válido', () => {
      expect(aRequests(filas('', '  '))).toEqual([]);
      expect(aRequests([])).toEqual([]);
    });

    it('la salida no contiene la clave local ni ningún id', () => {
      const salida = JSON.stringify(aRequests(filas('Una', 'Otra')));

      expect(salida).not.toContain('claveLocal');
      expect(salida).not.toContain('cita-');
      expect(salida).not.toContain('"id"');
    });

    it('la salida no lleva orden: las citas no lo tienen', () => {
      expect(JSON.stringify(aRequests(filas('Una', 'Otra')))).not.toContain('orden');
    });
  });
});
