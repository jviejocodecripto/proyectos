import { Gitlab } from '@gitbeaker/rest';

interface ListUsersOptions {
  all?: boolean;
  search?: string;
  active?: boolean;
  blocked?: boolean;
}

export async function listUsers(gitlab: Gitlab, options: ListUsersOptions): Promise<void> {
  const { all, search, active, blocked } = options;

  console.log('Listando usuarios de GitLab...\n');

  try {
    const params: {
      active?: boolean;
      blocked?: boolean;
      search?: string;
    } = {};

    if (active) {
      params.active = true;
    } else if (blocked) {
      params.blocked = true;
    }

    if (search) {
      params.search = search;
    }

    const users = await gitlab.Users.all(params);

    // Filtrar usuarios inactivos si no se solicita --all
    const filteredUsers = all ? users : users.filter(user => user.state === 'active');

    if (filteredUsers.length === 0) {
      console.log('No se encontraron usuarios.');
      return;
    }

    console.log(`Total de usuarios encontrados: ${filteredUsers.length}\n`);
    console.log('┌─────┬─────────────────────┬──────────────────────────────┬─────────────────────┬─────────┬──────────┐');
    console.log('│ ID  │ Username            │ Email                         │ Name                │ Admin   │ Estado   │');
    console.log('├─────┼─────────────────────┼──────────────────────────────┼─────────────────────┼─────────┼──────────┤');

    filteredUsers.forEach((user: { id: number; username?: string; email?: string; name?: string; isAdmin?: boolean; state?: string }) => {
      const id = String(user.id).padEnd(3);
      const username = (user.username || '').padEnd(19).substring(0, 19);
      const email = (user.email || '').padEnd(28).substring(0, 28);
      const name = (user.name || '').padEnd(19).substring(0, 19);
      const admin = (user.isAdmin ? 'Sí' : 'No').padEnd(7);
      const state = (user.state || '').padEnd(8);

      console.log(`│ ${id} │ ${username} │ ${email} │ ${name} │ ${admin} │ ${state} │`);
    });

    console.log('└─────┴─────────────────────┴──────────────────────────────┴─────────────────────┴─────────┴──────────┘');
  } catch (error) {
    throw error;
  }
}

