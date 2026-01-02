/**
 * GitLab API client for forking repositories
 */

import { Gitlab, AccessLevel } from '@gitbeaker/rest';

// Read environment variables from .env.local
// Note: In Next.js, environment variables are only available at runtime
function getEnvVar(name: string): string | undefined {
  return process.env[name];
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
 * Get GitLab client instance (lazy initialization)
 */
export function getGitlabClient(): Gitlab | null {
  // Read environment variables at runtime (not at module level)
  const GITLAB_URL = getEnvVar('GITLAB_URL') || 'https://gitlab.codecrypto.academy';
  const GITLAB_TOKEN_ROOT = getEnvVar('GITLAB_TOKEN_ROOT');

  // Debug logging
  console.log('GitLab Config Check:', {
    GITLAB_URL: GITLAB_URL ? '✓ Configurado' : '✗ No configurado',
    GITLAB_TOKEN_ROOT: GITLAB_TOKEN_ROOT ? '✓ Configurado' : '✗ No configurado',
    tokenLength: GITLAB_TOKEN_ROOT?.length || 0
  });

  if (!GITLAB_TOKEN_ROOT) {
    console.error('GITLAB_TOKEN_ROOT no configurado. Verifica que esté en .env.local y reinicia el servidor.');
    return null;
  }

  try {
    // Initialize GitLab client with proper configuration
    const client = new Gitlab({
      host: GITLAB_URL,
      token: GITLAB_TOKEN_ROOT
    });
    console.log(`GitLab client inicializado con URL: ${GITLAB_URL}`);
    return client;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error initializing GitLab client:', errorMessage);
    return null;
  }
}

interface ForkRepositoryParams {
  sourceProjectId: string | number; // Puede ser ID numérico o path completo (namespace/project)
  targetNamespace: string; // Subgrupo: eth-rust o ia4devs
  targetName?: string; // Nombre opcional para el fork
}

interface ForkRepositoryResponse {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  web_url: string;
}

/**
 * Fork a repository in GitLab
 */
export async function forkRepository(
  params: ForkRepositoryParams
): Promise<ForkRepositoryResponse> {
  const gitlab = getGitlabClient();
  if (!gitlab) {
    throw new Error('GITLAB_TOKEN_ROOT no configurado');
  }

  const { sourceProjectId, targetNamespace, targetName } = params;

  try {
    // First, get the numeric project ID if sourceProjectId is a path
    let projectId: string | number = sourceProjectId;
    
    if (typeof sourceProjectId === 'string' && sourceProjectId.includes('/')) {
      // It's a path, get the numeric ID
      try {
        const projectInfo = await gitlab.Projects.show(sourceProjectId);
        projectId = projectInfo.id;
        console.log(`Proyecto encontrado: ID=${projectId}, Path=${sourceProjectId}`);
      } catch (error) {
        console.error(`Error al obtener ID del proyecto ${sourceProjectId}:`, error);
        // Continue with path, GitLab API should handle it
      }
    }

    console.log('Iniciando fork en GitLab:', {
      sourceProjectId,
      projectId,
      targetNamespace,
      targetName
    });

    // Use GitLab API to fork the project
    // GitLab API accepts either numeric ID or path encoded
    const forkedProject = await gitlab.Projects.fork(projectId, {
      namespace: targetNamespace,
      name: targetName
    });

    console.log('Fork exitoso:', {
      id: forkedProject.id,
      name: forkedProject.name,
      path: forkedProject.path,
      web_url: forkedProject.web_url
    });

    return {
      id: forkedProject.id,
      name: forkedProject.name,
      path: forkedProject.path,
      path_with_namespace: forkedProject.path_with_namespace,
      web_url: forkedProject.web_url
    } as ForkRepositoryResponse;
  } catch (error) {
    // Log detailed error information
    const errorDetails: Record<string, unknown> = {
      sourceProjectId,
      targetNamespace,
      targetName
    };

    if (error instanceof Error) {
      errorDetails.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };

      // Try to extract additional properties from GitbeakerRequestError
      const errorObj = error as unknown as Record<string, unknown>;
      
      // Try to get the actual error message from response.text() if it's a function
      if (errorObj.cause) {
        const cause = errorObj.cause as Record<string, unknown>;
        if (cause.response) {
          const response = cause.response as Record<string, unknown>;
          if (typeof response.text === 'function') {
            try {
              // Call the text() function to get the actual error message
              const textPromise = response.text as () => Promise<string>;
              const errorText = await textPromise();
              errorDetails.gitlabErrorMessage = errorText;
              console.error('GitLab Error Message:', errorText);
            } catch (textError) {
              console.error('Error calling response.text():', textError);
            }
          }
        }
      }
      
      // Extract status code
      if (errorObj.status) {
        errorDetails.status = errorObj.status;
      }
      if (errorObj.statusCode) {
        errorDetails.statusCode = errorObj.statusCode;
      }
      
      // Extract response details
      if (errorObj.response) {
        const response = errorObj.response as Record<string, unknown>;
        errorDetails.response = {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: response.body,
          data: response.data,
          text: response.text
        };
      }
      
      // Extract cause details (this is where GitLab API errors are usually stored)
      if (errorObj.cause) {
        const cause = errorObj.cause as Record<string, unknown>;
        const causeDetails: Record<string, unknown> = {};
        
        // Extract all properties from cause
        if (cause.description) causeDetails.description = cause.description;
        if (cause.message) causeDetails.message = cause.message;
        if (cause.status) causeDetails.status = cause.status;
        if (cause.statusCode) causeDetails.statusCode = cause.statusCode;
        if (cause.statusText) causeDetails.statusText = cause.statusText;
        
        // Extract request details
        if (cause.request) {
          const request = cause.request as Record<string, unknown>;
          causeDetails.request = {
            method: request.method,
            url: request.url,
            headers: request.headers,
            body: request.body
          };
        }
        
        // Extract response details from cause
        if (cause.response) {
          const response = cause.response as Record<string, unknown>;
          const responseDetails: Record<string, unknown> = {
            status: response.status,
            statusCode: response.statusCode,
            statusText: response.statusText,
            headers: response.headers,
            body: response.body,
            data: response.data
          };
          
          // Try to get response text
          // Note: response.text might be a function that needs to be called
          if (typeof response.text === 'function') {
            responseDetails.text = 'function (needs async call)';
            // Store the function reference for later use if needed
            responseDetails.textFunction = true;
          } else {
            responseDetails.text = response.text;
          }
          
          causeDetails.response = responseDetails;
          
          // Try to get response body as text if available
          if (response.body && typeof response.body === 'object') {
            try {
              causeDetails.responseBodyJSON = JSON.stringify(response.body);
            } catch {
              // Ignore
            }
          }
        }
        
        // Get all other properties from cause
        const causeProps = Object.getOwnPropertyNames(cause);
        for (const prop of causeProps) {
          if (!['description', 'request', 'response', 'message'].includes(prop)) {
            try {
              causeDetails[prop] = cause[prop];
            } catch {
              // Ignore
            }
          }
        }
        
        errorDetails.cause = causeDetails;
      }
      
      if (errorObj.request) {
        const request = errorObj.request as Record<string, unknown>;
        errorDetails.request = {
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.body
        };
      }
      
      if (errorObj.description) {
        errorDetails.description = errorObj.description;
      }
      
      // Try to get all properties
      const allProps = Object.getOwnPropertyNames(error);
      for (const prop of allProps) {
        if (!['message', 'stack', 'name', 'cause', 'response', 'request'].includes(prop)) {
          try {
            const value = errorObj[prop];
            // Try to serialize if it's an object
            if (typeof value === 'object' && value !== null) {
              try {
                errorDetails[prop] = JSON.parse(JSON.stringify(value));
              } catch {
                errorDetails[prop] = String(value);
              }
            } else {
              errorDetails[prop] = value;
            }
          } catch {
            // Ignore if property can't be accessed
          }
        }
      }
    } else {
      errorDetails.error = error;
    }

    console.error('Error detallado al hacer fork en GitLab:', JSON.stringify(errorDetails, null, 2));

    // Build a more informative error message
    let errorMessage = 'Error desconocido';
    if (error instanceof Error) {
      const errorObj = error as unknown as Record<string, unknown>;
      
      // Try to get status code
      if (errorObj.status) {
        errorMessage = `HTTP ${errorObj.status}: `;
      }
      
      // First, try to use the GitLab error message we captured
      if (errorDetails.gitlabErrorMessage) {
        errorMessage = `HTTP 400: ${errorDetails.gitlabErrorMessage}`;
      } else {
        // Try to get response body from errorObj.response
        if (errorObj.response) {
          try {
            const response = errorObj.response as Record<string, unknown>;
            if (response.body) {
              const body = typeof response.body === 'string' 
                ? response.body 
                : JSON.stringify(response.body);
              errorMessage += body;
            } else if (response.data) {
              errorMessage += JSON.stringify(response.data);
            }
          } catch {
            // Ignore parsing errors
          }
        }
        
        // Try to get information from cause.response (GitLab API errors are usually here)
        if (errorObj.cause) {
          const cause = errorObj.cause as Record<string, unknown>;
          if (cause.response) {
            const response = cause.response as Record<string, unknown>;
            
            // Get status code
            if (response.status || response.statusCode) {
              const status = response.status || response.statusCode;
              errorMessage = `HTTP ${status}: `;
            }
            
            // Try to get response text
            let responseText = '';
            if (response.text && typeof response.text !== 'function') {
              responseText = String(response.text);
            }
            
            // Get response body
            if (response.body) {
              const body = typeof response.body === 'string' 
                ? response.body 
                : JSON.stringify(response.body);
              errorMessage += body;
            } else if (response.data) {
              errorMessage += JSON.stringify(response.data);
            } else if (responseText) {
              errorMessage += responseText;
            }
            
            // Get status text
            if (response.statusText && !errorMessage.includes(response.statusText as string)) {
              errorMessage = `${response.statusText} - ${errorMessage}`;
            }
          }
          
          // Try description from cause
          if (cause.description && (!errorMessage || errorMessage === 'Error desconocido' || errorMessage === 'HTTP : ')) {
            errorMessage = String(cause.description);
          }
        }
        
        // Fallback to message or name
        if (errorMessage === 'Error desconocido' || errorMessage === 'HTTP : ') {
          errorMessage = error.message || error.name || 'Error desconocido';
        }
        
        // If still empty, try description
        if (!errorMessage || errorMessage.trim() === '') {
          if (errorObj.description) {
            errorMessage = String(errorObj.description);
          }
        }
      }
    } else if (typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>;
      if (errorObj.message) {
        errorMessage = String(errorObj.message);
      } else {
        errorMessage = JSON.stringify(errorObj);
      }
    } else {
      errorMessage = String(error);
    }

    throw new Error(`Error al hacer fork en GitLab: ${errorMessage}`);
  }
}

/**
 * Parse GitLab URL to extract project ID or namespace/path
 */
export function parseGitLabUrl(url: string): { namespace: string; project: string } | null {
  try {
    const urlObj = new URL(url);
    
    // Check if it's a GitLab URL (compare with configured GITLAB_URL)
    const GITLAB_URL = getEnvVar('GITLAB_URL') || 'https://gitlab.codecrypto.academy';
    const gitlabHost = new URL(GITLAB_URL).hostname;
    if (urlObj.hostname !== gitlabHost) {
      return null;
    }

    // Remove leading slash and split
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    
    if (pathParts.length >= 2) {
      const namespace = pathParts[0];
      const project = pathParts.slice(1).join('/');
      return { namespace, project };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get project path from GitLab URL
 * Returns the full path (namespace/project) that can be used directly with GitLab API
 */
export function getProjectPathFromUrl(url: string): string | null {
  const parsed = parseGitLabUrl(url);
  if (!parsed) {
    return null;
  }

  const { namespace, project } = parsed;
  return `${namespace}/${project}`;
}

/**
 * Get project ID from GitLab URL (legacy function, kept for compatibility)
 * Now uses path directly, but can still return ID if needed
 */
export async function getProjectIdFromUrl(url: string): Promise<string | null> {
  const projectPath = getProjectPathFromUrl(url);
  if (!projectPath) {
    return null;
  }

  // Return the path directly - GitLab API accepts both ID and path
  return projectPath;
}

/**
 * List all users from GitLab
 */
export async function listGitLabUsers(): Promise<Array<{
  id: number;
  username: string;
  email: string;
  name: string;
  state: string;
}>> {
  const gitlab = getGitlabClient();
  if (!gitlab) {
    throw new Error('GITLAB_TOKEN_ROOT no configurado');
  }

  try {
    const users = await gitlab.Users.all({});
    return users.map((user: {
      id: number;
      username?: string;
      email?: string;
      name?: string;
      state?: string;
    }) => ({
      id: user.id,
      username: user.username || '',
      email: user.email || '',
      name: user.name || '',
      state: user.state || 'unknown'
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error al listar usuarios de GitLab:', errorMessage);
    throw new Error(`Error al listar usuarios de GitLab: ${errorMessage}`);
  }
}

/**
 * Create a user in GitLab
 */
export async function createGitLabUser(params: {
  email: string;
  username?: string;
  name?: string;
  password?: string;
  admin?: boolean;
  canCreateGroup?: boolean;
  skipConfirmation?: boolean;
}): Promise<{
  id: number;
  username: string;
  email: string;
  name: string;
  state: string;
}> {
  const gitlab = getGitlabClient();
  if (!gitlab) {
    throw new Error('GITLAB_TOKEN_ROOT no configurado');
  }

  const { email, password, admin, canCreateGroup, skipConfirmation } = params;

  // Generate username and name from email if not provided
  const namePart = email.split('@')[0];
  const username = params.username || namePart;
  const name = params.name || namePart;

  // Generate random password if not provided
  const { randomBytes } = await import('crypto');
  const userPassword = password || randomBytes(16).toString('hex');

  try {
    const user = await gitlab.Users.create({
      email,
      username,
      name,
      password: userPassword,
      admin: admin || false,
      canCreateGroup: canCreateGroup || false,
      skipConfirmation: skipConfirmation !== undefined ? skipConfirmation : true
    });

    return {
      id: user.id,
      username: user.username || username,
      email: user.email || email,
      name: user.name || name,
      state: user.state || 'active'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error al crear usuario en GitLab:', errorMessage);
    throw new Error(`Error al crear usuario en GitLab: ${errorMessage}`);
  }
}

/**
 * Find a project in GitLab by source (URL or path)
 */
export async function findGitLabProject(source: string): Promise<{
  id: number;
  path_with_namespace: string;
  name: string;
}> {
  const gitlab = getGitlabClient();
  if (!gitlab) {
    throw new Error('GITLAB_TOKEN_ROOT no configurado');
  }

  // Si es una URL, extraer el path
  let projectPathOrId: string | number = source;
  if (source.startsWith('http://') || source.startsWith('https://')) {
    try {
      const urlObj = new URL(source);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      if (pathParts.length >= 2) {
        projectPathOrId = pathParts.join('/');
      }
    } catch {
      throw new Error(`URL inválida: ${source}`);
    }
  }

  // Buscar el proyecto
  const project = await gitlab.Projects.show(projectPathOrId);

  return {
    id: project.id,
    path_with_namespace: project.path_with_namespace || '',
    name: project.name || ''
  };
}

/**
 * Find projects in GitLab by search and filter by namespace
 */
export async function findGitLabProjectsBySearch(
  search: string,
  namespaceFilter?: string
): Promise<Array<{
  id: number;
  path_with_namespace: string;
  name: string;
}>> {
  const gitlab = getGitlabClient();
  if (!gitlab) {
    throw new Error('GITLAB_TOKEN_ROOT no configurado');
  }

  try {
    const projects = await gitlab.Projects.all({
      search
    });

    let filteredProjects = projects;

    // Filtrar por namespace si se especifica
    if (namespaceFilter) {
      filteredProjects = projects.filter((p: { path_with_namespace?: string }) =>
        p.path_with_namespace?.startsWith(namespaceFilter)
      );
    }

    return filteredProjects.map((p: {
      id: number;
      path_with_namespace?: string;
      name?: string;
    }) => ({
      id: p.id,
      path_with_namespace: p.path_with_namespace || '',
      name: p.name || ''
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error al buscar proyectos en GitLab:', errorMessage);
    throw new Error(`Error al buscar proyectos en GitLab: ${errorMessage}`);
  }
}

/**
 * Find a group/subgroup in GitLab
 */
export async function findGitLabGroup(subgroup: string): Promise<{
  id: number;
  full_path: string;
  path: string;
  name: string;
}> {
  const gitlab = getGitlabClient();
  if (!gitlab) {
    throw new Error('GITLAB_TOKEN_ROOT no configurado');
  }

  try {
    // Buscar en la lista completa de grupos
    const allGroups = await gitlab.Groups.all({ allAvailable: true });

    const normalizedSubgroup = subgroup.toLowerCase();

    // Buscar por path completo o nombre
    const group = allGroups.find((g: {
      full_path?: string;
      path?: string;
      name?: string;
    }) => {
      const fullPath = (g.full_path || g.path || '').toLowerCase();
      const name = (g.name || '').toLowerCase();
      return fullPath === normalizedSubgroup || name === normalizedSubgroup;
    });

    if (!group) {
      throw new Error(`Grupo no encontrado: ${subgroup}`);
    }

    return {
      id: group.id,
      full_path: group.full_path || group.path || '',
      path: group.path || '',
      name: group.name || ''
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error al buscar grupo en GitLab:', errorMessage);
    throw new Error(`Error al buscar grupo en GitLab: ${errorMessage}`);
  }
}

/**
 * Find a user in GitLab by username or email
 */
export async function findGitLabUser(user: string): Promise<{
  id: number;
  username: string;
  email: string;
}> {
  const gitlab = getGitlabClient();
  if (!gitlab) {
    throw new Error('GITLAB_TOKEN_ROOT no configurado');
  }

  try {
    // Buscar todos los usuarios
    const allUsers = await gitlab.Users.all({});

    // Buscar por username o email
    const foundUser = allUsers.find((u: {
      username?: string;
      email?: string;
    }) => u.username === user || u.email === user);

    if (!foundUser) {
      throw new Error(`Usuario no encontrado: ${user}`);
    }

    const username = typeof foundUser.username === 'string' ? foundUser.username : '';
    const email = typeof foundUser.email === 'string' ? foundUser.email : '';

    return {
      id: foundUser.id,
      username,
      email
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error al buscar usuario en GitLab:', errorMessage);
    throw new Error(`Error al buscar usuario en GitLab: ${errorMessage}`);
  }
}

/**
 * Add a member to a GitLab project with a specific role
 */
export async function addProjectMember(
  projectId: number,
  userId: number,
  role: string = 'maintainer'
): Promise<void> {
  const gitlab = getGitlabClient();
  if (!gitlab) {
    throw new Error('GITLAB_TOKEN_ROOT no configurado');
  }

  try {
    const accessLevel = ROLE_ACCESS_LEVELS[role] || 40; // Por defecto: maintainer
    const accessLevelEnum = accessLevel === 10 ? AccessLevel.GUEST :
                           accessLevel === 20 ? AccessLevel.REPORTER :
                           accessLevel === 30 ? AccessLevel.DEVELOPER :
                           accessLevel === 40 ? AccessLevel.MAINTAINER :
                           AccessLevel.OWNER;

    await gitlab.ProjectMembers.add(projectId, accessLevelEnum, {
      userId
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error al agregar miembro al proyecto:', errorMessage);
    throw new Error(`Error al agregar miembro al proyecto: ${errorMessage}`);
  }
}

