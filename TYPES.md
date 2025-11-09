# TypeScript Types - Sistema de Gestión de Proyectos

Este archivo contiene todas las definiciones de tipos TypeScript del proyecto.

## Archivo: `web/types/index.ts`

```typescript
import { ObjectId } from 'mongodb';

// ============================================================================
// USER TYPES
// ============================================================================

export type UserRole = 'pending' | 'student' | 'teacher' | 'admin';

export interface User {
  _id?: ObjectId;
  email: string;
  role: UserRole;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
  isActive: boolean;
}

export type UserWithoutId = Omit<User, '_id'>;

export interface UserDTO {
  email: string;
  role: UserRole;
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
  score: number;
  comments: string;
  evaluatedBy: string;
  evaluatedAt: Date;
}

export interface RepositoryEvaluation {
  score: number;
  comments: string;
  aiPromptUsed: string;
  aiAnalysis?: string;
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
  submissionDate: string;
  createdAt: string;
  updatedAt: string;
  evaluations?: {
    videoDemo?: {
      score: number;
      comments: string;
      evaluatedBy: string;
      evaluatedAt: string;
    };
    repository?: {
      score: number;
      comments: string;
      aiAnalysis?: string;
      evaluatedBy: string;
      evaluatedAt: string;
    };
  };
  status: ProjectStatus;
}

export interface CreateProjectInput {
  name: string;
  repositoryUrl: string;
  submissionDate: string;
}

export interface UpdateProjectInput {
  name?: string;
  repositoryUrl?: string;
  submissionDate?: string;
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
}

export type MagicLinkWithoutId = Omit<MagicLink, '_id'>;

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

export type AIPromptWithoutId = Omit<AIPrompt, '_id'>;

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
  score: number;
  comments: string;
}

export interface EvaluateRepositoryInput {
  score: number;
  comments?: string;
  promptId?: string;
}

export interface AIAnalysisResult {
  summary: string;
  codeQuality: number;
  documentation: number;
  functionality: number;
  gitUsage: number;
  suggestedScore: number;
  strengths: string[];
  improvements: string[];
  detailedComments: string;
}

// ============================================================================
// GITHUB TYPES
// ============================================================================

export interface GitHubFileTree {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
}

export interface RepositoryInfo {
  readme: string;
  fileStructure: GitHubFileTree[];
  recentCommits: GitHubCommit[];
  mainCode: string;
  packageJson?: any;
  languages?: string[];
}

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface SessionData {
  email: string;
  role: UserRole;
  isLoggedIn: boolean;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface UserQueryParams extends Partial<PaginationParams> {
  role?: UserRole;
  search?: string;
}

export interface ProjectQueryParams extends Partial<PaginationParams> {
  studentEmail?: string;
  status?: ProjectStatus;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface StudentStats {
  totalProjects: number;
  averageScore: number;
  evaluatedProjects: number;
  pendingProjects: number;
}

export interface TeacherStats {
  totalEvaluated: number;
  pendingEvaluations: number;
  averageScoreGiven: number;
}

export interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  evaluatedProjects: number;
  usersByRole: {
    student: number;
    teacher: number;
    admin: number;
    pending: number;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type WithId<T> = T & { _id: ObjectId };
export type WithStringId<T> = Omit<T, '_id'> & { _id: string };

// Helper para convertir ObjectId a string en DTOs
export type ToDTO<T> = {
  [K in keyof T]: T[K] extends ObjectId
    ? string
    : T[K] extends Date
    ? string
    : T[K] extends object
    ? ToDTO<T[K]>
    : T[K];
};

// ============================================================================
// FORM TYPES
// ============================================================================

export interface LoginFormData {
  email: string;
}

export interface ProjectFormData {
  name: string;
  repositoryUrl: string;
  submissionDate: string;
}

export interface VideoEvaluationFormData {
  score: string;
  comments: string;
}

export interface RepositoryEvaluationFormData {
  score: string;
  comments: string;
}

export interface PromptFormData {
  name: string;
  prompt: string;
  isActive: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'No autenticado') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso') {
    super(`${resource} no encontrado`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

export interface BaseComponentProps {
  className?: string;
}

export interface UserTableProps extends BaseComponentProps {
  users: UserDTO[];
  onRoleChange: (email: string, role: UserRole) => Promise<void>;
  onStatusChange: (email: string, isActive: boolean) => Promise<void>;
}

export interface ProjectTableProps extends BaseComponentProps {
  projects: ProjectDTO[];
  onDelete?: (id: string) => Promise<void>;
  showActions?: boolean;
}

export interface ProjectCardProps extends BaseComponentProps {
  project: ProjectDTO;
  onClick?: () => void;
}

export interface EvaluationCardProps extends BaseComponentProps {
  evaluation: VideoEvaluation | RepositoryEvaluation;
  type: 'video' | 'repository';
}

export interface NavbarProps extends BaseComponentProps {
  user: UserDTO;
}

export interface SidebarProps extends BaseComponentProps {
  role: UserRole;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

export interface UseAuthReturn {
  user: UserDTO | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseProjectsReturn {
  projects: ProjectDTO[];
  isLoading: boolean;
  error: string | null;
  createProject: (data: CreateProjectInput) => Promise<ProjectDTO>;
  updateProject: (id: string, data: UpdateProjectInput) => Promise<ProjectDTO>;
  deleteProject: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseUsersReturn {
  users: UserDTO[];
  isLoading: boolean;
  error: string | null;
  updateUserRole: (email: string, role: UserRole) => Promise<void>;
  updateUserStatus: (email: string, isActive: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const USER_ROLES: Record<UserRole, string> = {
  pending: 'Pendiente',
  student: 'Estudiante',
  teacher: 'Profesor',
  admin: 'Administrador'
};

export const PROJECT_STATUSES: Record<ProjectStatus, string> = {
  pending: 'Pendiente',
  submitted: 'Enviado',
  evaluated: 'Evaluado'
};

export const SCORE_RANGES = {
  MIN: 0,
  MAX: 10
} as const;

export const MAGIC_LINK_EXPIRY_MINUTES = 15;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100
} as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isUserRole(value: string): value is UserRole {
  return ['pending', 'student', 'teacher', 'admin'].includes(value);
}

export function isProjectStatus(value: string): value is ProjectStatus {
  return ['pending', 'submitted', 'evaluated'].includes(value);
}

export function isValidScore(value: number): boolean {
  return value >= SCORE_RANGES.MIN && value <= SCORE_RANGES.MAX;
}

export function isApiSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

export function isApiErrorResponse(
  response: ApiResponse
): response is ApiErrorResponse {
  return response.success === false;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function objectIdToString(id: ObjectId): string {
  return id.toString();
}

export function dateToISOString(date: Date): string {
  return date.toISOString();
}

export function convertUserToDTO(user: User): UserDTO {
  return {
    email: user.email,
    role: user.role,
    name: user.name,
    createdAt: dateToISOString(user.createdAt),
    updatedAt: dateToISOString(user.updatedAt),
    lastLogin: user.lastLogin ? dateToISOString(user.lastLogin) : null,
    isActive: user.isActive
  };
}

export function convertProjectToDTO(project: Project): ProjectDTO {
  return {
    _id: project._id ? objectIdToString(project._id) : '',
    name: project.name,
    studentEmail: project.studentEmail,
    repositoryUrl: project.repositoryUrl,
    submissionDate: dateToISOString(project.submissionDate),
    createdAt: dateToISOString(project.createdAt),
    updatedAt: dateToISOString(project.updatedAt),
    status: project.status,
    evaluations: project.evaluations
      ? {
          videoDemo: project.evaluations.videoDemo
            ? {
                score: project.evaluations.videoDemo.score,
                comments: project.evaluations.videoDemo.comments,
                evaluatedBy: project.evaluations.videoDemo.evaluatedBy,
                evaluatedAt: dateToISOString(
                  project.evaluations.videoDemo.evaluatedAt
                )
              }
            : undefined,
          repository: project.evaluations.repository
            ? {
                score: project.evaluations.repository.score,
                comments: project.evaluations.repository.comments,
                aiAnalysis: project.evaluations.repository.aiAnalysis,
                evaluatedBy: project.evaluations.repository.evaluatedBy,
                evaluatedAt: dateToISOString(
                  project.evaluations.repository.evaluatedAt
                )
              }
            : undefined
        }
      : undefined
  };
}

export function convertPromptToDTO(prompt: AIPrompt): AIPromptDTO {
  return {
    _id: prompt._id ? objectIdToString(prompt._id) : '',
    name: prompt.name,
    prompt: prompt.prompt,
    isActive: prompt.isActive,
    createdBy: prompt.createdBy,
    createdAt: dateToISOString(prompt.createdAt),
    updatedAt: dateToISOString(prompt.updatedAt)
  };
}

export function calculateAverageScore(
  project: Project | ProjectDTO
): number | null {
  const scores: number[] = [];

  if (project.evaluations?.videoDemo?.score) {
    scores.push(project.evaluations.videoDemo.score);
  }

  if (project.evaluations?.repository?.score) {
    scores.push(project.evaluations.repository.score);
  }

  if (scores.length === 0) return null;

  return scores.reduce((acc, score) => acc + score, 0) / scores.length;
}

export function isProjectEditable(project: Project | ProjectDTO): boolean {
  const submissionDate =
    typeof project.submissionDate === 'string'
      ? new Date(project.submissionDate)
      : project.submissionDate;

  return new Date() < submissionDate && project.status !== 'evaluated';
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
```

---

## Uso de los Types

### En Componentes React

```typescript
import type { ProjectDTO, UserDTO } from '@/types';

interface ProjectListProps {
  projects: ProjectDTO[];
  user: UserDTO;
}

export default function ProjectList({ projects, user }: ProjectListProps) {
  // ...
}
```

### En API Routes

```typescript
import type { ApiResponse, ProjectDTO, CreateProjectInput } from '@/types';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest): Promise<Response> {
  const body: CreateProjectInput = await req.json();

  // ...

  const response: ApiResponse<ProjectDTO> = {
    success: true,
    data: projectDTO
  };

  return Response.json(response);
}
```

### En Database Functions

```typescript
import type { User, UserWithoutId } from '@/types';
import { getDatabase } from './mongodb';

export async function createUser(userData: UserWithoutId): Promise<User> {
  const db = await getDatabase();
  const result = await db.collection<User>('users').insertOne(userData);
  return { ...userData, _id: result.insertedId };
}
```

### Con Type Guards

```typescript
import { isApiSuccessResponse, type ApiResponse } from '@/types';

async function fetchProject(id: string) {
  const response: ApiResponse<ProjectDTO> = await fetch(`/api/projects/${id}`)
    .then(r => r.json());

  if (isApiSuccessResponse(response)) {
    console.log(response.data);
  } else {
    console.error(response.error);
  }
}
```
