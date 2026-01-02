import { Gitlab } from '@gitbeaker/rest';

interface ListProjectsOptions {
  subgroup: string;
  archived?: boolean;
  search?: string;
}

export async function listProjects(gitlab: Gitlab, options: ListProjectsOptions): Promise<void> {
  const { subgroup, archived, search } = options;

  console.log(`Listando proyectos del subgrupo: ${subgroup}\n`);

  try {
    // Primero, obtener el grupo/subgrupo
    // Intentar diferentes formatos: path completo, solo nombre, o ID
    let groupId: number | string | undefined;
    let group: { id: number; full_path?: string; path?: string } | undefined;
    
    console.log(`Buscando grupo: ${subgroup}...`);
    
    // Intentar 1: Si es un número, usar como ID directamente
    if (!isNaN(Number(subgroup))) {
      const numericId = Number(subgroup);
      try {
        group = await gitlab.Groups.show(numericId);
        groupId = group.id;
        console.log(`✅ Grupo encontrado por ID: ID=${groupId}, Path=${group.full_path || group.path}\n`);
      } catch (error) {
        console.error(`❌ Error: No se pudo encontrar el grupo con ID "${subgroup}"`);
        throw new Error(`Grupo no encontrado: ${subgroup}`);
      }
    } else {
      // Buscar el grupo en la lista de grupos
      const allGroups = await gitlab.Groups.all({ allAvailable: true });
      
      // Buscar por path completo o por nombre
      const normalizedSubgroup = subgroup.toLowerCase();
      group = allGroups.find((g: { full_path?: string; path?: string; name?: string }) => {
        const fullPath = (g.full_path || g.path || '').toLowerCase();
        const name = (g.name || '').toLowerCase();
        return fullPath === normalizedSubgroup || 
               fullPath === normalizedSubgroup + '/' ||
               name === normalizedSubgroup.split('/').pop()?.toLowerCase();
      }) as { id: number; full_path?: string; path?: string } | undefined;
      
      if (group) {
        groupId = group.id;
        console.log(`✅ Grupo encontrado: ID=${groupId}, Path=${group.full_path || group.path}\n`);
      } else {
        // Si no se encuentra, intentar con Groups.show como último recurso
        try {
          group = await gitlab.Groups.show(subgroup);
          groupId = group.id;
          console.log(`✅ Grupo encontrado: ID=${groupId}, Path=${group.full_path || group.path}\n`);
        } catch (error) {
          // Si el subgroup contiene '/', intentar solo con el último segmento
          if (subgroup.includes('/')) {
            const parts = subgroup.split('/');
            const subgroupName = parts[parts.length - 1];
            console.log(`Intentando buscar solo con el nombre: ${subgroupName}`);
            
            // Buscar en la lista por nombre
            const foundByName = allGroups.find((g: { name?: string }) => 
              (g.name || '').toLowerCase() === subgroupName.toLowerCase()
            ) as { id: number; full_path?: string; path?: string } | undefined;
            
            if (foundByName) {
              group = foundByName;
              groupId = group.id;
              console.log(`✅ Grupo encontrado por nombre: ID=${groupId}, Path=${group.full_path || group.path}\n`);
            } else {
              console.error(`❌ Error: No se pudo encontrar el subgrupo "${subgroup}"`);
              console.error(`Grupos disponibles: ${allGroups.slice(0, 5).map((g: { full_path?: string; path?: string }) => g.full_path || g.path).join(', ')}...`);
              throw new Error(`Subgrupo no encontrado: ${subgroup}`);
            }
          } else {
            console.error(`❌ Error: No se pudo encontrar el subgrupo "${subgroup}"`);
            throw new Error(`Subgrupo no encontrado: ${subgroup}`);
          }
        }
      }
    }
    
    if (!group || !groupId) {
      console.error(`❌ Error: No se pudo encontrar el subgrupo "${subgroup}"`);
      throw new Error(`Subgrupo no encontrado: ${subgroup}`);
    }

    // Obtener proyectos del grupo
    // Usar el path del grupo encontrado para filtrar correctamente
    const groupPath = group.full_path || group.path || subgroup;
    
    // Obtener proyectos del grupo usando Projects.all con filtro por groupId
    const projectParams: {
      archived?: boolean;
      search?: string;
      withShared?: boolean;
      groupId?: number;
    } = {
      withShared: false
    };

    if (archived !== undefined) {
      projectParams.archived = archived;
    }

    if (search) {
      projectParams.search = search;
    }

    if (groupId && typeof groupId === 'number') {
      projectParams.groupId = groupId;
    }

    // Obtener proyectos del grupo
    const allProjects = await gitlab.Projects.all(projectParams);
    
    // Filtrar proyectos que pertenecen al subgrupo usando el path del grupo encontrado
    const projects = allProjects.filter((project: { path_with_namespace?: string }) => {
      const path = project.path_with_namespace || '';
      // El proyecto debe empezar con el path del grupo seguido de '/'
      return path.startsWith(groupPath + '/');
    });

    if (projects.length === 0) {
      console.log('No se encontraron proyectos en este subgrupo.');
      return;
    }

    console.log(`Total de proyectos encontrados: ${projects.length}\n`);
    console.log('┌─────┬──────────────────────────────────────────────────────┬──────────────────────────────┬────────────┐');
    console.log('│ ID  │ Nombre                                               │ Path                         │ Estado     │');
    console.log('├─────┼──────────────────────────────────────────────────────┼──────────────────────────────┼────────────┤');

    projects.forEach((project: { id: number; name?: string; path_with_namespace?: string; archived?: boolean; web_url?: string }) => {
      const id = String(project.id).padEnd(3);
      const name = (project.name || '').padEnd(54).substring(0, 54);
      const path = (project.path_with_namespace || '').padEnd(28).substring(0, 28);
      const archived = project.archived ? 'Archivado' : 'Activo';
      const state = archived.padEnd(10);

      console.log(`│ ${id} │ ${name} │ ${path} │ ${state} │`);
    });

    console.log('└─────┴──────────────────────────────────────────────────────┴──────────────────────────────┴────────────┘');

    // Mostrar URLs
    console.log('\nURLs de los proyectos:');
    projects.forEach((project: { name?: string; web_url?: string }) => {
      console.log(`  - ${project.name}: ${project.web_url}`);
    });
  } catch (error) {
    throw error;
  }
}

