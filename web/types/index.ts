import { ObjectId } from 'mongodb';

// ============================================================================
// USER TYPES
// ============================================================================

export type UserRole = 'pending' | 'student' | 'teacher' | 'admin';

export interface User {
  _id?: ObjectId;
  email: string;
  roles: UserRole[];
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
  isActive: boolean;
}

export type UserWithoutId = Omit<User, '_id'>;

export interface UserDTO {
  email: string;
  roles: UserRole[];
  name: string;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  isActive: boolean;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export type ProjectStatus = 'pending' | 'submitted' | 'evaluated';

export interface VideoEvaluation {
  score: number; // Nota final (0-10)
  presentation: number; // Calidad de Presentación (0-10)
  functionality: number; // Demostración de Funcionalidades (0-10)
  technicalQuality: number; // Calidad Técnica del Video (Audio/Video) (0-10)
  explanation: number; // Claridad de Explicación (0-10)
  comments: string;
  commentsFileId?: ObjectId; // GridFS file ID for large markdown content
  evaluatedBy: string;
  evaluatedAt: Date;
}

export interface RepositoryEvaluation {
  score: number;
  comments: string;
  commentsFileId?: ObjectId; // GridFS file ID for large markdown content
  aiPromptUsed?: string;
  aiAnalysis?: string;
  aiAnalysisFileId?: ObjectId; // GridFS file ID for large AI analysis
  codeQuality?: number;
  documentation?: number;
  functionality?: number;
  gitUsage?: number;
  evaluatedBy: string;
  evaluatedAt: Date;
}

export interface ProjectEvaluations {
  videoDemo?: VideoEvaluation;
  repository?: RepositoryEvaluation;
}

export interface Project {
  _id?: ObjectId;
  name: string;
  studentEmail: string;
  repositoryUrl: string;
  videoUrl?: string;
  course: string;
  edition: string;
  submissionDate: Date;
  createdAt: Date;
  updatedAt: Date;
  evaluations?: ProjectEvaluations;
  status: ProjectStatus;
}

export type ProjectWithoutId = Omit<Project, '_id'>;

export interface ProjectDTO {
  _id: string;
  name: string;
  studentEmail: string;
  repositoryUrl: string;
  videoUrl?: string;
  course: string;
  edition: string;
  submissionDate: string;
  createdAt: string;
  updatedAt: string;
  evaluations?: {
    videoDemo?: {
      score: number;
      presentation: number;
      functionality: number;
      technicalQuality: number;
      explanation: number;
      comments: string;
      evaluatedBy: string;
      evaluatedAt: string;
    };
    repository?: {
      score: number;
      comments: string;
      aiPromptUsed?: string;
      aiAnalysis?: string;
      codeQuality?: number;
      documentation?: number;
      functionality?: number;
      gitUsage?: number;
      evaluatedBy: string;
      evaluatedAt: string;
    };
  };
  status: ProjectStatus;
}

export interface CreateProjectInput {
  name: string;
  repositoryUrl: string;
  videoUrl?: string;
  course: string;
  edition: string;
  submissionDate: Date;
}

export interface UpdateProjectInput {
  name?: string;
  repositoryUrl?: string;
  videoUrl?: string;
  course?: string;
  edition?: string;
  submissionDate?: Date;
}

// ============================================================================
// MAGIC LINK TYPES
// ============================================================================

export interface MagicLink {
  _id?: ObjectId;
  email: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
  redirect?: string; // URL de redirección después del login
}

export type MagicLinkWithoutId = Omit<MagicLink, '_id'>;

// ============================================================================
// TOKEN TYPES (6-digit code for JWT generation)
// ============================================================================

export interface Token {
  _id?: ObjectId;
  code: string; // 6-digit random code
  email?: string; // Email del usuario (se asigna al validar)
  expiresAt?: Date; // Fecha de expiración del JWT (12 meses)
  jwt?: string; // JWT token generado
  createdAt: Date;
  used: boolean; // Si el código ya fue usado
}

export type TokenWithoutId = Omit<Token, '_id'>;

export interface TokenDTO {
  _id: string;
  code: string;
  email?: string;
  expiresAt?: string;
  jwt?: string;
  createdAt: string;
  used: boolean;
}

// ============================================================================
// ENV CONFIG TYPES
// ============================================================================

export type Environment = 'dev' | 'pro' | 'all';

export interface EnvConfig {
  _id?: ObjectId;
  projectId: string | 'global'; // 'global' para configuraciones globales (estudiante o admin), ObjectId string para proyectos específicos
  studentEmail?: string; // Email del estudiante (solo para globales de estudiante, undefined para globales de admin)
  environment: Environment; // 'dev' o 'pro' o 'all'
  scope: 'client' | 'server'; // 'client' para NEXT_PUBLIC_ (cliente), 'server' para servidor
  key: string; // Nombre de la variable de entorno
  value: string; // Valor de la variable
  createdAt: Date;
  updatedAt: Date;
}

export type EnvConfigWithoutId = Omit<EnvConfig, '_id'>;

export interface EnvConfigDTO {
  _id: string;
  projectId: string | 'global';
  studentEmail?: string | null; // Email del estudiante (solo para globales de estudiante), null para admin globals
  environment: Environment;
  scope: 'client' | 'server';
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnvConfigInput {
  projectId: string | 'global';
  environment: Environment;
  scope: 'client' | 'server';
  key: string;
  value: string;
}

export interface UpdateEnvConfigInput {
  environment?: 'dev' | 'pro' | 'all';
  scope?: 'client' | 'server';
  key?: string;
  value?: string;
}

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface SessionData {
  email: string;
  roles: UserRole[];
  isLoggedIn: boolean;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  globals?: {
    studentGlobalsDev?: EnvConfigDTO[];
    studentGlobalsPro?: EnvConfigDTO[];
    studentGlobalsAll?: EnvConfigDTO[];
    adminGlobals?: EnvConfigDTO[];
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20
} as const;

export const MAGIC_LINK_EXPIRY_MINUTES = 15;

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  roles?: UserRole[];
  isActive?: boolean;
}

export interface ProjectQueryParams {
  page?: number;
  limit?: number;
  studentEmail?: string;
  status?: ProjectStatus;
  course?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export function dateToISOString(date: Date): string {
  return date.toISOString();
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function convertUserToDTO(user: User): UserDTO {
  return {
    email: user.email,
    roles: user.roles,
    name: user.name,
    createdAt: dateToISOString(user.createdAt),
    updatedAt: dateToISOString(user.updatedAt),
    lastLogin: user.lastLogin ? dateToISOString(user.lastLogin) : null,
    isActive: user.isActive
  };
}

export function convertPromptToDTO(prompt: AIPrompt): AIPromptDTO {
  return {
    _id: prompt._id!.toString(),
    name: prompt.name,
    prompt: prompt.prompt,
    isActive: prompt.isActive,
    createdBy: prompt.createdBy,
    createdAt: dateToISOString(prompt.createdAt),
    updatedAt: dateToISOString(prompt.updatedAt)
  };
}

export function convertTokenToDTO(token: Token): TokenDTO {
  return {
    _id: token._id!.toString(),
    code: token.code,
    email: token.email,
    expiresAt: token.expiresAt ? dateToISOString(token.expiresAt) : undefined,
    jwt: token.jwt,
    createdAt: dateToISOString(token.createdAt),
    used: token.used
  };
}

export function convertEnvConfigToDTO(envConfig: EnvConfig): EnvConfigDTO {
  return {
    _id: envConfig._id!.toString(),
    projectId: envConfig.projectId,
    studentEmail: envConfig.studentEmail,
    environment: envConfig.environment,
    scope: envConfig.scope,
    key: envConfig.key,
    value: envConfig.value,
    createdAt: dateToISOString(envConfig.createdAt),
    updatedAt: dateToISOString(envConfig.updatedAt)
  };
}

export function convertProjectToDTO(project: Project): ProjectDTO {
  return {
    _id: project._id!.toString(),
    name: project.name,
    studentEmail: project.studentEmail,
    repositoryUrl: project.repositoryUrl,
    videoUrl: project.videoUrl,
    course: project.course,
    edition: project.edition,
    submissionDate: project.submissionDate.toISOString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    status: project.status,
    evaluations: project.evaluations
      ? {
          videoDemo: project.evaluations.videoDemo
            ? {
                score: project.evaluations.videoDemo.score,
                presentation: project.evaluations.videoDemo.presentation,
                functionality: project.evaluations.videoDemo.functionality,
                technicalQuality:
                  project.evaluations.videoDemo.technicalQuality,
                explanation: project.evaluations.videoDemo.explanation,
                comments: project.evaluations.videoDemo.comments,
                evaluatedBy: project.evaluations.videoDemo.evaluatedBy,
                evaluatedAt:
                  project.evaluations.videoDemo.evaluatedAt.toISOString()
              }
            : undefined,
          repository: project.evaluations.repository
            ? {
                score: project.evaluations.repository.score,
                comments: project.evaluations.repository.comments,
                aiPromptUsed: project.evaluations.repository.aiPromptUsed,
                aiAnalysis: project.evaluations.repository.aiAnalysis,
                codeQuality: project.evaluations.repository.codeQuality,
                documentation: project.evaluations.repository.documentation,
                functionality: project.evaluations.repository.functionality,
                gitUsage: project.evaluations.repository.gitUsage,
                evaluatedBy: project.evaluations.repository.evaluatedBy,
                evaluatedAt:
                  project.evaluations.repository.evaluatedAt.toISOString()
              }
            : undefined
        }
      : undefined
  };
}

// ============================================================================
// AI PROMPT TYPES
// ============================================================================

export interface AIPrompt {
  _id?: ObjectId;
  name: string;
  prompt: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIPromptDTO {
  _id: string;
  name: string;
  prompt: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromptInput {
  name: string;
  prompt: string;
  isActive: boolean;
}

export interface UpdatePromptInput {
  name?: string;
  prompt?: string;
  isActive?: boolean;
}

// ============================================================================
// EVALUATION TYPES
// ============================================================================

export interface EvaluateVideoInput {
  score: number; // Nota final (0-10)
  presentation: number; // Calidad de Presentación (0-10)
  functionality: number; // Demostración de Funcionalidades (0-10)
  technicalQuality: number; // Calidad Técnica del Video (Audio/Video) (0-10)
  explanation: number; // Claridad de Explicación (0-10)
  comments: string;
}

export interface EvaluateRepositoryInput {
  score: number;
  comments: string;
  aiPromptUsed?: string;
  codeQuality?: number;
  documentation?: number;
  functionality?: number;
  gitUsage?: number;
}

// ============================================================================
// GITHUB TYPES
// ============================================================================

export interface RepositoryInfo {
  readme: string;
  fileStructure: Array<{
    path: string;
    type: string;
    size?: number;
  }>;
  recentCommits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>;
  mainFiles: Record<string, string>;
  stats: {
    stars: number;
    forks: number;
    openIssues: number;
    languages: Record<string, number>;
  };
}

// ============================================================================
// SMART CONTRACT TYPES
// ============================================================================

export interface SmartContract {
  _id?: ObjectId;
  email: string;
  privateKey: string;
  folder: string;
  rpcUrl: string;
  transactions: Record<string, unknown>; // JSON with transactions
  createdAt: Date;
  updatedAt: Date;
}

export interface SmartContractDTO {
  _id: string;
  email: string;
  folder: string;
  rpcUrl: string;
  transactions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSmartContractInput {
  email: string;
  privateKey: string;
  folder: string;
  rpcUrl: string;
  transactions: Record<string, unknown>;
}

export function convertSmartContractToDTO(smartContract: SmartContract): SmartContractDTO {
  return {
    _id: smartContract._id!.toString(),
    email: smartContract.email,
    folder: smartContract.folder,
    rpcUrl: smartContract.rpcUrl,
    transactions: smartContract.transactions,
    createdAt: dateToISOString(smartContract.createdAt),
    updatedAt: dateToISOString(smartContract.updatedAt)
  };
}
