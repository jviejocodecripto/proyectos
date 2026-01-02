import { Gitlab } from '@gitbeaker/rest';

interface ListGroupsOptions {
  all?: boolean;
  search?: string;
  topLevelOnly?: boolean;
}

export async function listGroups(gitlab: Gitlab, options: ListGroupsOptions): Promise<void> {
  const { all, search, topLevelOnly } = options;

  console.log('Listando grupos y subgrupos de GitLab...\n');

  try {
    const params: {
      allAvailable?: boolean;
      search?: string;
      topLevelOnly?: boolean;
    } = {};

    if (all) {
      params.allAvailable = true;
    }

    if (search) {
      params.search = search;
    }

    if (topLevelOnly) {
      params.topLevelOnly = true;
    }

    const groups = await gitlab.Groups.all(params);

    if (groups.length === 0) {
      console.log('No se encontraron grupos.');
      return;
    }

    console.log(`Total de grupos encontrados: ${groups.length}\n`);
    console.log('┌─────┬──────────────────────────────────────────────────────┬──────────────────────────────┬────────────┬──────────┐');
    console.log('│ ID  │ Nombre                                             │ Path                         │ Parent     │ Proyectos│');
    console.log('├─────┼──────────────────────────────────────────────────────┼──────────────────────────────┼────────────┼──────────┤');

    groups.forEach((group: { 
      id: number; 
      name?: string; 
      full_path?: string; 
      path?: string;
      parent_id?: number | null;
      projects_count?: number;
    }) => {
      const id = String(group.id).padEnd(3);
      const name = (group.name || '').padEnd(54).substring(0, 54);
      const path = (group.full_path || group.path || '').padEnd(28).substring(0, 28);
      const parent = group.parent_id ? String(group.parent_id).padEnd(10) : 'N/A'.padEnd(10);
      const projects = String(group.projects_count || 0).padEnd(8);

      console.log(`│ ${id} │ ${name} │ ${path} │ ${parent} │ ${projects} │`);
    });

    console.log('└─────┴──────────────────────────────────────────────────────┴──────────────────────────────┴────────────┴──────────┘');

    // Mostrar estructura jerárquica si hay subgrupos
    const groupsWithParent = groups.filter((g: { parent_id?: number | null }) => g.parent_id);
    if (groupsWithParent.length > 0 && !topLevelOnly) {
      console.log('\n📁 Estructura de subgrupos:');
      
      // Crear un mapa de grupos por ID para búsqueda rápida
      const groupsMap = new Map<number, { name?: string; full_path?: string; path?: string; parent_id?: number | null }>();
      groups.forEach((g: { id: number; name?: string; full_path?: string; path?: string; parent_id?: number | null }) => {
        groupsMap.set(g.id, g);
      });

      // Mostrar subgrupos con su parent
      groupsWithParent.forEach((group: { 
        id: number; 
        name?: string; 
        full_path?: string; 
        path?: string;
        parent_id?: number | null;
      }) => {
        const parent = groupsMap.get(group.parent_id!);
        const parentPath = parent ? (parent.full_path || parent.path || `ID:${group.parent_id}`) : `ID:${group.parent_id}`;
        const groupPath = group.full_path || group.path || `ID:${group.id}`;
        console.log(`  ${parentPath} → ${groupPath}`);
      });
    }

    // Mostrar URLs
    console.log('\n📋 URLs de los grupos:');
    groups.forEach((group: { 
      id: number; 
      name?: string; 
      web_url?: string;
      full_path?: string;
      path?: string;
    }) => {
      const path = group.full_path || group.path || `ID:${group.id}`;
      if (group.web_url) {
        console.log(`  - ${path}: ${group.web_url}`);
      }
    });
  } catch (error) {
    throw error;
  }
}

