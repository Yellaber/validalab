import { createZodDto } from 'nestjs-zod';
import { registroUsuarioSchema } from '../usuarios/usuario/usuarios.dto';

/**
 * Cuerpo de `POST /sistema/inicializar`. Reutiliza literalmente el esquema del
 * registro: el contrato exige las mismas reglas de validación en ambas
 * operaciones, y lo único que difiere entre ellas es el rol resultante.
 *
 * Derivarlo en vez de copiarlo mantiene esa promesa cierta por construcción — si
 * el registro cambia sus límites, esta operación los hereda.
 */
export const inicializarSistemaSchema = registroUsuarioSchema;
export class InicializarSistemaDto extends createZodDto(
  inicializarSistemaSchema,
) {}
