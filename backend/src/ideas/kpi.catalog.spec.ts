import {
  CATALOGO_KPI,
  esKpiValido,
  kpiGrupoSchema,
  kpiSchema,
  KPIS,
  unidadKpiSchema,
} from './kpi.catalog';

describe('CATALOGO_KPI', () => {
  it('tiene los 14 KPIs del catálogo (SRS §7)', () => {
    expect(KPIS).toHaveLength(14);
    expect(new Set(KPIS).size).toBe(14);
  });

  it('cada entrada usa un grupo y una unidad válidos', () => {
    for (const kpi of KPIS) {
      const def = CATALOGO_KPI[kpi];
      expect(kpiSchema.safeParse(kpi).success).toBe(true);
      expect(kpiGrupoSchema.safeParse(def.grupo).success).toBe(true);
      expect(unidadKpiSchema.safeParse(def.unidad).success).toBe(true);
    }
  });

  it('los defaults son coherentes: umbralKill null o ≤ umbralGo', () => {
    for (const kpi of KPIS) {
      const { umbralGo, umbralKill } = CATALOGO_KPI[kpi];
      if (umbralKill !== null) {
        expect(umbralKill).toBeLessThanOrEqual(umbralGo);
      }
    }
  });

  it('los KPIs sin zona kill tienen umbralKill null', () => {
    expect(CATALOGO_KPI.volumen_evidencia.umbralKill).toBeNull();
    expect(CATALOGO_KPI.densidad_citas.umbralKill).toBeNull();
  });

  it('esKpiValido distingue claves del catálogo', () => {
    expect(esKpiValido('tasa_respuesta')).toBe(true);
    expect(esKpiValido('no_existe')).toBe(false);
  });
});
