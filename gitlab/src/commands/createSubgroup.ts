import { Gitlab } from '@gitbeaker/rest';

interface CreateSubgroupOptions {
  parentGroup: string; // Nombre o path del grupo padre
  name: string; // Nombre del nuevo subgrupo
  path?: string; // Path del subgrupo (opcional, si no se proporciona se usa el name)
  description?: string; // Descripción del subgrupo
  visibility?: 'private' | 'internal' | 'public'; // Visibilidad del subgrupo
}

/**
 * Busca un grupo/subgrupo en GitLab
 */
async function findGroup(gitlab: Gitlab, groupName: string): Promise<{ id: number; full_path: string; path: string; name: string }> {
  console.log(`Buscando grupo padre: ${groupName}...`);
  
  // Buscar en la lista completa de grupos
  const allGroups = await gitlab.Groups.all({ allAvailable: true });
  
  const normalizedGroupName = groupName.toLowerCase();
  
  // Buscar por path completo o nombre
  const group = allGroups.find((g: { full_path?: string; path?: string; name?: string }) => {
    const fullPath = (g.full_path || g.path || '').toLowerCase();
    const name = (g.name || '').toLowerCase();
    return fullPath === normalizedGroupName || name === normalizedGroupName;
  });
  
  if (!group) {
    throw new Error(`Grupo no encontrado: ${groupName}`);
  }
  
  const fullPath = group.full_path || group.path || '';
  const path = group.path || '';
  const name = group.name || '';
  
  console.log(`✅ Grupo encontrado:`);
  console.log(`   ID: ${group.id}`);
  console.log(`   Path: ${fullPath}`);
  console.log(`   Nombre: ${name}`);
  
  return {
    id: group.id,
    full_path: fullPath,
    path: path,
    name: name
  };
}

export async function createSubgroup(gitlab: Gitlab, options: CreateSubgroupOptions): Promise<void> {
  const { parentGroup, name, path, description, visibility } = options;

  console.log('Creando subgrupo en GitLab...');
  console.log(`Grupo padre: ${parentGroup}`);
  console.log(`Nombre del subgrupo: ${name}`);
  console.log(`Path del subgrupo: ${path || name}`);
  if (description) {
    console.log(`Descripción: ${description}`);
  }
  console.log(`Visibilidad: ${visibility || 'public'}`);

  try {
    // Buscar el grupo padre
    const parent = await findGroup(gitlab, parentGroup);
    console.log('Parent...', parent);
    // Crear el subgrupo
    const subgroupPath = path || name;
    const subgroupVisibility = visibility || 'public';
    console.log('Creating subgroup...', name, subgroupPath, parent.id, subgroupVisibility, description);
    console.log(`\nCreando subgrupo '${name}' dentro de '${parent.full_path}'...`);
    
    // La API de gitbeaker: Groups.create(name: string, path: string, options)
    // name: nombre del grupo (name)
    // path: path del grupo (subgroupPath)
    // options: incluye parentId para crear un subgrupo
    const subgroup = await gitlab.Groups.create(name, subgroupPath, {
      parentId: parent.id,
      visibility: subgroupVisibility,
      description: description || `Subgrupo '${name}' dentro de '${parent.full_path}'`
    });

    console.log('\n✅ Subgrupo creado exitosamente:');
    console.log(`ID: ${subgroup.id}`);
    console.log(`Nombre: ${subgroup.name}`);
    console.log(`Path: ${subgroup.path}`);
    console.log(`Full Path: ${subgroup.full_path}`);
    if (subgroup.web_url) {
      console.log(`URL: ${subgroup.web_url}`);
    }
    console.log(`Parent ID: ${parent.id}`);
    console.log(`Visibilidad: ${subgroup.visibility || subgroupVisibility}`);
  } catch (error: unknown) {
    console.error('\n❌ Error al crear subgrupo:');
    
    // Log del error completo para debugging
    if (error instanceof Error) {
      console.error('Mensaje:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
      if ('cause' in error) {
        const cause = (error as any).cause;
        console.error('Causa:', cause);
        if (cause && typeof cause === 'object' && 'response' in cause) {
          const response = cause.response;
          if (response) {
            console.error('Status:', (response as any).status);
            console.error('Body:', (response as any).body);
          }
        }
      }
    } else {
      console.error('Error:', error);
    }
    
    throw error;
  }
}

