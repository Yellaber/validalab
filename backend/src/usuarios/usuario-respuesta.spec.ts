import { Usuario } from './usuario.entity';
import { aUsuarioDto } from './usuario-respuesta';

describe('aUsuarioDto', () => {
  const entidad = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'ana@ejemplo.com',
    nombre: 'Ana',
    passwordHash: '$2a$10$hashsecreto',
    rol: 'validador',
    estado: 'activo',
    fechaCreacion: new Date('2026-01-15T10:00:00.000Z'),
  } as Usuario;

  it('mapea los campos públicos del contrato', () => {
    expect(aUsuarioDto(entidad)).toEqual({
      id: entidad.id,
      email: 'ana@ejemplo.com',
      nombre: 'Ana',
      rol: 'validador',
      estado: 'activo',
      fechaCreacion: '2026-01-15T10:00:00.000Z',
    });
  });

  it('NUNCA expone el passwordHash ni la contraseña', () => {
    const dto = aUsuarioDto(entidad);

    expect(dto).not.toHaveProperty('passwordHash');
    expect(dto).not.toHaveProperty('password');
    expect(JSON.stringify(dto)).not.toContain('hashsecreto');
  });
});
