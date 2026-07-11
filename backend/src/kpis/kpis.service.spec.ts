import { Repository } from 'typeorm';
import { AccesoDenegadoException } from '../common/errors/dominio.exception';
import { Contacto } from '../contactos/contacto.entity';
import { Entrevista } from '../entrevistas/entrevista/entrevista.entity';
import { IdeasService } from '../ideas/idea/ideas.service';
import { CATALOGO_KPI, KPIS } from '../ideas/umbral/kpi.catalog';
import { UmbralRespuesta } from '../ideas/umbral/umbral-respuesta';
import { UmbralesService } from '../ideas/umbral/umbrales.service';
import { KpisService } from './kpis.service';

const OWNER = 'owner-1';
const IDEA = 'idea-1';

/** Umbrales vigentes = defaults del catálogo, en orden canónico. */
const umbralesVigentes: UmbralRespuesta[] = KPIS.map((kpi) => ({
  kpi,
  grupo: CATALOGO_KPI[kpi].grupo,
  unidad: CATALOGO_KPI[kpi].unidad,
  umbralGo: CATALOGO_KPI[kpi].umbralGo,
  umbralKill: CATALOGO_KPI[kpi].umbralKill,
}));

function crear() {
  const entrevistas = { find: jest.fn().mockResolvedValue([]) };
  const contactos = { find: jest.fn().mockResolvedValue([]) };
  const ideas = {
    asegurarPropia: jest.fn().mockResolvedValue({ segmentoBeachhead: null }),
  };
  const umbrales = {
    listar: jest.fn().mockResolvedValue(umbralesVigentes),
  };
  const servicio = new KpisService(
    entrevistas as unknown as Repository<Entrevista>,
    contactos as unknown as Repository<Contacto>,
    ideas as unknown as IdeasService,
    umbrales as unknown as UmbralesService,
  );
  return { servicio, ideas };
}

describe('KpisService.calcularTablero', () => {
  it('devuelve los 14 KPIs con resumen; sin datos todos son sin_datos o conteo', async () => {
    const { servicio } = crear();

    const tablero = await servicio.calcularTablero(OWNER, IDEA);

    expect(tablero.ideaId).toBe(IDEA);
    expect(tablero.kpis).toHaveLength(14);
    expect(tablero.resumen.totalKpis).toBe(14);
    // sin evidencia, las tasas quedan sin_datos; volumen_evidencia es un conteo (0)
    const volumen = tablero.kpis.find((k) => k.kpi === 'volumen_evidencia');
    expect(volumen?.valor).toBe(0);
    const tasa = tablero.kpis.find((k) => k.kpi === 'tasa_respuesta');
    expect(tasa?.zona).toBe('sin_datos');
  });

  it('propaga AccesoDenegado si la idea es ajena', async () => {
    const { servicio, ideas } = crear();
    ideas.asegurarPropia.mockRejectedValue(new AccesoDenegadoException());

    await expect(servicio.calcularTablero(OWNER, IDEA)).rejects.toBeInstanceOf(
      AccesoDenegadoException,
    );
  });
});
