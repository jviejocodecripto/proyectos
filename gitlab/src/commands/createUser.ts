import { Gitlab } from '@gitbeaker/rest';
import { randomBytes } from 'crypto';

interface CreateUserOptions {
  email: string;
  username?: string;
  name?: string;
  password?: string;
  admin?: boolean;
  canCreateGroup?: boolean;
  skipConfirmation?: boolean;
}

export async function createUser(gitlab: Gitlab, options: CreateUserOptions): Promise<void> {
  const { email, password, admin, canCreateGroup, skipConfirmation } = options;

  // Generar username y name desde el email si no se proporcionan
  const namePart = email.split('@')[0];
  const username = options.username || namePart;
  const name = options.name || namePart;

  // Generar contraseña aleatoria si no se proporciona
  const userPassword = password || randomBytes(16).toString('hex');

  console.log('Creando usuario en GitLab...');
  console.log(`Email: ${email}`);
  console.log(`Username: ${username}${!options.username ? ' (generado desde email)' : ''}`);
  console.log(`Name: ${name}${!options.name ? ' (generado desde email)' : ''}`);
  console.log(`Admin: ${admin ? 'Sí' : 'No'}`);
  console.log(`Can Create Group: ${canCreateGroup ? 'Sí' : 'No'}`);

  try {
    const user = await gitlab.Users.create({
      email,
      username,
      name,
      password: userPassword,
      admin: admin || false,
      canCreateGroup: canCreateGroup || false,
      skipConfirmation: skipConfirmation || false
    });

    console.log('\n✅ Usuario creado exitosamente:');
    console.log(`ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Admin: ${user.isAdmin ? 'Sí' : 'No'}`);
    console.log(`Estado: ${user.state}`);
    
    if (!password) {
      console.log(`\n⚠️  Contraseña generada: ${userPassword}`);
      console.log('⚠️  IMPORTANTE: Guarda esta contraseña de forma segura.');
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'cause' in error) {
      const cause = error.cause as { response?: { status?: number; body?: unknown } };
      if (cause.response) {
        const status = cause.response.status;
        const body = cause.response.body;
        
        if (status === 400 || status === 422) {
          console.error('\n❌ Error de validación:');
          if (typeof body === 'object' && body !== null) {
            console.error(JSON.stringify(body, null, 2));
          } else {
            console.error(body);
          }
          throw new Error('Error al crear usuario: datos inválidos');
        }
      }
    }
    throw error;
  }
}

