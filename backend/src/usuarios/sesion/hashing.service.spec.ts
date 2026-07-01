import { ServicioDeHashing } from './hashing.service';

describe('ServicioDeHashing', () => {
  const servicio = new ServicioDeHashing();

  it('produce un hash distinto del texto plano', async () => {
    const hash = await servicio.hash('secreto-123');

    expect(hash).not.toBe('secreto-123');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifica una contraseña correcta', async () => {
    const hash = await servicio.hash('secreto-123');

    await expect(servicio.verificar('secreto-123', hash)).resolves.toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await servicio.hash('secreto-123');

    await expect(servicio.verificar('otra-clave', hash)).resolves.toBe(false);
  });
});
