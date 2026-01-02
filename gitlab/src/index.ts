#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { Gitlab } from '@gitbeaker/rest';
import { createUser } from './commands/createUser.js';
import { forkProject } from './commands/forkProject.js';
import { listUsers } from './commands/listUsers.js';
import { listProjects } from './commands/listProjects.js';
import { listGroups } from './commands/listGroups.js';
import { createSubgroup } from './commands/createSubgroup.js';

// Cargar variables de entorno desde .env
dotenv.config();

const program = new Command();

// Configurar el programa
program
  .name('gitlab-cli')
  .description('CLI para gestionar usuarios y proyectos en GitLab')
  .version('1.0.0');

// Función para obtener el cliente de GitLab
function getGitlabClient(): Gitlab {
  const GITLAB_URL = process.env.GITLAB_URL;
  const GITLAB_TOKEN_ROOT = process.env.GITLAB_TOKEN_ROOT;

  if (!GITLAB_URL) {
    console.error('Error: GITLAB_URL no está configurado en el archivo .env');
    process.exit(1);
  }

  if (!GITLAB_TOKEN_ROOT) {
    console.error('Error: GITLAB_TOKEN_ROOT no está configurado en el archivo .env');
    process.exit(1);
  }

  return new Gitlab({
    host: GITLAB_URL,
    token: GITLAB_TOKEN_ROOT
  });
}

// Comando: crear usuario
program
  .command('create-user')
  .description('Crear un nuevo usuario en GitLab')
  .requiredOption('-e, --email <email>', 'Email del usuario')
  .option('-u, --username <username>', 'Nombre de usuario (si no se proporciona, se genera desde el email)')
  .option('-n, --name <name>', 'Nombre completo del usuario (si no se proporciona, se genera desde el email)')
  .option('-p, --password <password>', 'Contraseña del usuario (si no se proporciona, se generará una aleatoria)')
  .option('--admin', 'Crear usuario como administrador', false)
  .option('--can-create-group', 'Permitir crear grupos', false)
  .option('--skip-confirmation', 'Saltar confirmación por email', false)
  .action(async (options) => {
    try {
      const gitlab = getGitlabClient();
      await createUser(gitlab, options);
    } catch (error) {
      console.error('Error al crear usuario:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Comando: fork de proyecto
program
  .command('fork-project')
  .description('Hacer fork de un proyecto en un subgrupo')
  .requiredOption('-s, --source <source>', 'ID o path del proyecto origen (ej: 123 o namespace/project)')
  .requiredOption('-g, --subgroup <subgroup>', 'Nombre del subgrupo destino')
  .requiredOption('-u, --user <user>', 'Username o email del usuario a añadir al proyecto')
  .option('-n, --name <name>', 'Nombre opcional para el fork')
  .option('-r, --role <role>', 'Role del usuario (guest, reporter, developer, maintainer, owner). Por defecto: maintainer', 'maintainer')
  .action(async (options) => {
    try {
      const gitlab = getGitlabClient();
      await forkProject(gitlab, options);
    } catch (error) {
      console.error('Error al hacer fork:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Comando: listar usuarios
program
  .command('list-users')
  .description('Listar usuarios de GitLab')
  .option('-a, --all', 'Listar todos los usuarios (incluye inactivos)', false)
  .option('-s, --search <search>', 'Buscar usuarios por nombre o email')
  .option('--active', 'Solo usuarios activos', false)
  .option('--blocked', 'Solo usuarios bloqueados', false)
  .action(async (options) => {
    try {
      const gitlab = getGitlabClient();
      await listUsers(gitlab, options);
    } catch (error) {
      console.error('Error al listar usuarios:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Comando: listar proyectos por subgrupo
program
  .command('list-projects')
  .description('Listar proyectos de un subgrupo')
  .requiredOption('-g, --subgroup <subgroup>', 'Nombre del subgrupo')
  .option('-a, --archived', 'Incluir proyectos archivados', false)
  .option('-s, --search <search>', 'Buscar proyectos por nombre')
  .action(async (options) => {
    try {
      const gitlab = getGitlabClient();
      await listProjects(gitlab, options);
    } catch (error) {
      console.error('Error al listar proyectos:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Comando: listar grupos y subgrupos
program
  .command('list-groups')
  .description('Listar grupos y subgrupos de GitLab')
  .option('-a, --all', 'Listar todos los grupos disponibles (incluye grupos privados)', false)
  .option('-s, --search <search>', 'Buscar grupos por nombre')
  .option('--top-level-only', 'Solo mostrar grupos de nivel superior (sin subgrupos)', false)
  .action(async (options) => {
    try {
      const gitlab = getGitlabClient();
      await listGroups(gitlab, options);
    } catch (error) {
      console.error('Error al listar grupos:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Comando: crear subgrupo
program
  .command('create-subgroup')
  .description('Crear un subgrupo dentro de un grupo/subgrupo existente')
  .requiredOption('-p, --parent <parent>', 'Nombre o path del grupo padre')
  .requiredOption('-n, --name <name>', 'Nombre del nuevo subgrupo')
  .option('--path <path>', 'Path del subgrupo (si no se proporciona, se usa el nombre)')
  .option('-d, --description <description>', 'Descripción del subgrupo')
  .option('-v, --visibility <visibility>', 'Visibilidad del subgrupo (private, internal, public)', 'public')
  .action(async (options) => {
    try {
      const gitlab = getGitlabClient();
      await createSubgroup(gitlab, {
        parentGroup: options.parent,
        name: options.name,
        path: options.path,
        description: options.description,
        visibility: options.visibility
      });
    } catch (error) {
      console.error('Error al crear subgrupo:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Parsear argumentos
program.parse();

