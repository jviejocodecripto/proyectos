import { Gitlab, AccessLevel,AddMemberOptions, AccessLevel as AccessLevelType } from '@gitbeaker/rest';

interface ForkProjectOptions {
  source: string;
  subgroup: string;
  user: string;
  name?: string;
  role?: string;
}

// Mapeo de roles a niveles de acceso de GitLab
const ROLE_ACCESS_LEVELS: Record<string, number> = {
  'guest': 10,
  'reporter': 20,
  'developer': 30,
  'maintainer': 40,
  'owner': 50
};

/**
 * Busca un proyecto en GitLab
 */
async function findProject(gitlab: Gitlab, source: string): Promise<{ id: number; path_with_namespace: string }> {
  console.log(`Buscando proyecto: ${source}...`);
  
  // Si es una URL, extraer el path
  let projectPathOrId: string | number = source;
  if (source.startsWith('http://') || source.startsWith('https://')) {
    try {
      const urlObj = new URL(source);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      if (pathParts.length >= 2) {
        projectPathOrId = pathParts.join('/');
        console.log(`Path extraído de URL: ${projectPathOrId}`);
      }
    } catch {
      throw new Error(`URL inválida: ${source}`);
    }
  }
  
  // Buscar el proyecto
  const project = await gitlab.Projects.show(projectPathOrId);
  
  console.log(`✅ Proyecto encontrado:`);
  console.log(`   ID: ${project.id}`);
  console.log(`   Path: ${project.path_with_namespace}`);
  console.log(`   Nombre: ${project.name}`);
  
  return {
    id: project.id,
    path_with_namespace: project.path_with_namespace || ''
  };
}

/**
 * Busca un grupo/subgrupo en GitLab
 */
async function findGroup(gitlab: Gitlab, subgroup: string): Promise<{ id: number; full_path: string; path: string }> {
  console.log(`Buscando grupo: ${subgroup}...`);
  
  // Buscar en la lista completa de grupos
  const allGroups = await gitlab.Groups.all({ allAvailable: true });
  
  const normalizedSubgroup = subgroup.toLowerCase();
  
  // Buscar por path completo o nombre
  const group = allGroups.find((g: { full_path?: string; path?: string; name?: string }) => {
    const fullPath = (g.full_path || g.path || '').toLowerCase();
    const name = (g.name || '').toLowerCase();
    return fullPath === normalizedSubgroup || name === normalizedSubgroup;
  });
  
  if (!group) {
    throw new Error(`Grupo no encontrado: ${subgroup}`);
  }
  
  const fullPath = group.full_path || group.path || '';
  const path = group.path || '';
  
  console.log(`✅ Grupo encontrado:`);
  console.log(`   ID: ${group.id}`);
  console.log(`   Path: ${fullPath}`);
  console.log(`   Nombre: ${group.name}`);
  
  return {
    id: group.id,
    full_path: fullPath,
    path: path
  };
}

/**
 * Busca un usuario en GitLab
 */
async function findUser(gitlab: Gitlab, user: string): Promise<{ id: number; username: string; email: string }> {
  console.log(`Buscando usuario: ${user}...`);
  
  // Buscar todos los usuarios
  const allUsers = await gitlab.Users.all({});
  
  // Buscar por username o email
  const foundUser = allUsers.find((u: { username?: string; email?: string }) => 
    u.username === user || u.email === user
  );
  
  if (!foundUser) {
    throw new Error(`Usuario no encontrado: ${user}`);
  }
  
  const username = typeof foundUser.username === 'string' ? foundUser.username : '';
  const email = typeof foundUser.email === 'string' ? foundUser.email : '';
  
  console.log(`✅ Usuario encontrado:`);
  console.log(`   ID: ${foundUser.id}`);
  console.log(`   Username: ${username}`);
  console.log(`   Email: ${email}`);
  
  return {
    id: foundUser.id,
    username: username,
    email: email
  };
}

export async function forkProject(gitlab: Gitlab, options: ForkProjectOptions): Promise<void> {
  const { source, subgroup, user, name, role = 'maintainer' } = options;

  console.log('Haciendo fork del proyecto...\n');

  try {
    // 1. Buscar proyecto
    //const project = await findProject(gitlab, source);
    const projects = await gitlab.Projects.all({
      search: "98_pfm_traza_2025",
      // Gitbeaker permite pasar parámetros adicionales del API de GitLab
    });

    // 3. Filtrado por namespace específico (codecrypto/github)
    const filteredProjects = projects.filter((p: { path_with_namespace: string }) => 
      p.path_with_namespace.startsWith('codecrypto/github')
    );
    if (filteredProjects.length == 0)
       throw "no hay proyecto"

    const foundUser = await findUser(gitlab, user);

    console.log(foundUser);
    // 2. Buscar grupo
    const group = await findGroup(gitlab, subgroup);
    console.log("group: ", subgroup);
    
    const forkedProject = await gitlab.Projects.fork(
      filteredProjects[0].id, {
      namespace: subgroup,
      name: name,
      visibility: 'public',
      description: 'Fork del proyecto ' + filteredProjects[0].name

    });
    console.log("forkedProject: ", forkedProject.id);
    // console.log("forkedProject: ", forkedProject);

    // Agregar miembro al fork con el role especificado
    const accessLevel = ROLE_ACCESS_LEVELS[role] || 40; // Por defecto: maintainer
    await gitlab.ProjectMembers.add(136, AccessLevel.MAINTAINER, 
      { userId: foundUser.id});
    console.log("✅ Usuario ", foundUser.username, " añadido como ", role, " al fork.");

  } catch (error) {
    console.log("error: ", error);
    console.error('Error al hacer fork:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  
   
}

