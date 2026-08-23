import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AjusteScore, ScoreEntrevista } from '../../../../core/api/entrevista.model';
import { ScoreEntrevistaBloque } from './score';

function score(parcial: Partial<ScoreEntrevista> = {}): ScoreEntrevista {
  return {
    score: 8,
    justificacion: 'Confirma el problema y lo describe como urgente.',
    senales: ['dolor_confirmado', 'urgencia'],
    confianza: 90,
    ...parcial,
  };
}

async function montar(
  datos: ScoreEntrevista,
  ajuste: AjusteScore | null = null,
): Promise<ComponentFixture<ScoreEntrevistaBloque>> {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(ScoreEntrevistaBloque);
  fixture.componentRef.setInput('score', datos);
  fixture.componentRef.setInput('ajuste', ajuste);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function texto(fixture: ComponentFixture<ScoreEntrevistaBloque>): string {
  return fixture.nativeElement.textContent as string;
}

describe('ScoreEntrevistaBloque', () => {
  it('muestra score, justificación, señales y confianza', async () => {
    const fixture = await montar(score());

    expect(texto(fixture)).toContain('8');
    expect(texto(fixture)).toContain('Confirma el problema y lo describe como urgente.');
    expect(texto(fixture)).toContain('dolor_confirmado');
    expect(texto(fixture)).toContain('90%');
  });

  describe('señales estructuradas', () => {
    it('las muestra cuando el score las trae', async () => {
      const fixture = await montar(
        score({
          senalesEstructuradas: {
            dolorConfirmado: true,
            dolorUrgente: true,
            sinSolucionActual: false,
            disposicionPago: false,
          },
        }),
      );

      const items = Array.from(
        fixture.nativeElement.querySelectorAll('.senales-estructuradas li'),
      ) as HTMLElement[];
      expect(items).toHaveLength(4);
      expect(items[0].classList).toContain('detectada');
      expect(items[2].classList).not.toContain('detectada');
      expect(items[0].textContent).toContain('Confirma el problema');
    });

    it('declara la ausencia en vez de pintarlas como negativas', async () => {
      const fixture = await montar(score());

      expect(texto(fixture)).toContain('no clasificó señales estructuradas');
      expect(fixture.nativeElement.querySelectorAll('.senales-estructuradas li')).toHaveLength(0);
      // No se inventan cuatro «no detectada».
      expect(texto(fixture)).not.toContain('Muestra disposición a pagar');
    });
  });

  describe('trazabilidad', () => {
    it('muestra proveedor, modelo, rúbrica y fecha cuando vienen', async () => {
      const fixture = await montar(
        score({
          proveedor: 'anthropic',
          modelo: 'claude-haiku-4-5',
          rubricaVersion: 'v3',
          fechaScoring: '2026-03-12T10:00:00.000Z',
        }),
      );

      expect(texto(fixture)).toContain('anthropic');
      expect(texto(fixture)).toContain('claude-haiku-4-5');
      expect(texto(fixture)).toContain('v3');
      expect(texto(fixture)).toContain('2026-03-12');
    });

    it('omite los campos ausentes en lugar de mostrarlos vacíos', async () => {
      const fixture = await montar(score({ proveedor: 'anthropic' }));

      const etiquetas = Array.from(fixture.nativeElement.querySelectorAll('.auditoria dt')).map(
        (dt) => (dt as HTMLElement).textContent?.trim(),
      );
      expect(etiquetas).toContain('Proveedor');
      expect(etiquetas).not.toContain('Modelo');
      expect(etiquetas).not.toContain('Rúbrica');
    });
  });

  describe('costo', () => {
    it('muestra tokens y costo etiquetados como consumo, no como saldo', async () => {
      const fixture = await montar(
        score({ tokensEntrada: 1200, tokensSalida: 300, costoEstimado: 0.0042, moneda: 'USD' }),
      );

      const t = texto(fixture);
      expect(t).toContain('Consumo estimado');
      expect(t).toContain('0.0042');
      expect(t).toContain('USD');
      expect(t).toContain('1200');
      expect(t).toContain('no el saldo de tu cuenta');
      // Nunca se presenta como crédito disponible.
      expect(t).not.toContain('saldo disponible');
      expect(t).not.toContain('crédito');
    });

    it('omite el bloque de costo cuando no viene', async () => {
      const fixture = await montar(score());

      expect(texto(fixture)).not.toContain('Consumo estimado');
    });
  });

  describe('ajuste humano', () => {
    const ajuste: AjusteScore = {
      scoreAjustado: 6,
      nota: 'Sobrevaloró la urgencia',
      fechaAjuste: '2026-03-13T09:00:00.000Z',
    };

    it('muestra ambos valores y señala cuál prevalece en los KPIs', async () => {
      const fixture = await montar(score(), ajuste);

      const t = texto(fixture);
      expect(t).toContain('8');
      expect(t).toContain('6');
      expect(t).toContain('Score del agente');
      expect(t).toContain('Tu ajuste');
      expect(t).toContain('En los KPIs cuenta tu ajuste');
    });

    it('muestra la nota del ajuste', async () => {
      const fixture = await montar(score(), ajuste);

      expect(texto(fixture)).toContain('Sobrevaloró la urgencia');
    });

    it('la justificación del agente sobrevive al ajuste', async () => {
      const fixture = await montar(score(), ajuste);

      expect(texto(fixture)).toContain('Confirma el problema y lo describe como urgente.');
    });

    it('sin ajuste no insinúa que exista uno', async () => {
      const fixture = await montar(score());

      expect(texto(fixture)).not.toContain('Tu ajuste');
      expect(texto(fixture)).not.toContain('En los KPIs cuenta');
    });
  });
});
