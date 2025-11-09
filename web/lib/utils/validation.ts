import { z } from 'zod';

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const emailSchema = z.object({
  email: z.string().email('Email inválido')
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email es requerido')
    .email('Email inválido')
    .toLowerCase()
});

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const userRoleSchema = z.enum(['pending', 'student', 'teacher', 'admin'], {
  errorMap: () => ({ message: 'Rol inválido' })
});

export const updateUserRolesSchema = z.object({
  roles: z.array(userRoleSchema).min(1, 'Debe tener al menos un rol')
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean()
});

export const createUserSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres')
});

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, 'Nombre debe tener al menos 3 caracteres')
    .max(200, 'Nombre debe tener máximo 200 caracteres'),
  repositoryUrl: z
    .string()
    .url('URL inválida')
    .regex(
      /^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/,
      'Debe ser una URL válida de GitHub (https://github.com/usuario/repositorio)'
    ),
  videoUrl: z
    .string()
    .url('URL del video inválida')
    .refine(
      (url) => {
        // Validar que sea una URL de YouTube, Vimeo, Loom u otras plataformas comunes
        const patterns = [
          /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/,
          /^https?:\/\/(www\.)?vimeo\.com\/.+$/,
          /^https?:\/\/(www\.)?loom\.com\/.+$/,
          /^https?:\/\/(www\.)?drive\.google\.com\/.+$/
        ];
        return patterns.some(pattern => pattern.test(url));
      },
      'Debe ser una URL válida de YouTube, Vimeo, Loom o Google Drive'
    ),
  course: z
    .string()
    .min(2, 'Curso debe tener al menos 2 caracteres')
    .max(100, 'Curso debe tener máximo 100 caracteres'),
  edition: z
    .string()
    .min(2, 'Edición debe tener al menos 2 caracteres')
    .max(50, 'Edición debe tener máximo 50 caracteres')
});

export const createProjectAsTeacherSchema = createProjectSchema.extend({
  studentEmail: z.string().email('Email del estudiante inválido')
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(3, 'Nombre debe tener al menos 3 caracteres')
    .max(200, 'Nombre debe tener máximo 200 caracteres')
    .optional(),
  repositoryUrl: z
    .string()
    .url('URL inválida')
    .regex(
      /^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/,
      'Debe ser una URL válida de GitHub'
    )
    .optional(),
  videoUrl: z
    .string()
    .url('URL del video inválida')
    .refine(
      (url) => {
        const patterns = [
          /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/,
          /^https?:\/\/(www\.)?vimeo\.com\/.+$/,
          /^https?:\/\/(www\.)?loom\.com\/.+$/,
          /^https?:\/\/(www\.)?drive\.google\.com\/.+$/
        ];
        return patterns.some(pattern => pattern.test(url));
      },
      'Debe ser una URL válida de YouTube, Vimeo, Loom o Google Drive'
    )
    .optional(),
  course: z
    .string()
    .min(2, 'Curso debe tener al menos 2 caracteres')
    .max(100, 'Curso debe tener máximo 100 caracteres')
    .optional(),
  edition: z
    .string()
    .min(2, 'Edición debe tener al menos 2 caracteres')
    .max(50, 'Edición debe tener máximo 50 caracteres')
    .optional()
});

// ============================================================================
// EVALUATION SCHEMAS
// ============================================================================

export const evaluateVideoSchema = z.object({
  score: z
    .number()
    .min(0, 'La nota mínima es 0')
    .max(10, 'La nota máxima es 10'),
  comments: z
    .string()
    .min(10, 'Los comentarios deben tener al menos 10 caracteres')
});

export const evaluateRepositorySchema = z.object({
  score: z
    .number()
    .min(0, 'La nota mínima es 0')
    .max(10, 'La nota máxima es 10'),
  comments: z.string().optional(),
  promptId: z.string().optional()
});

// ============================================================================
// AI PROMPT SCHEMAS
// ============================================================================

export const createPromptSchema = z.object({
  name: z
    .string()
    .min(3, 'Nombre debe tener al menos 3 caracteres')
    .max(100, 'Nombre debe tener máximo 100 caracteres'),
  prompt: z.string().min(50, 'El prompt debe tener al menos 50 caracteres'),
  isActive: z.boolean().default(false)
});

export const updatePromptSchema = z.object({
  name: z
    .string()
    .min(3, 'Nombre debe tener al menos 3 caracteres')
    .max(100, 'Nombre debe tener máximo 100 caracteres')
    .optional(),
  prompt: z
    .string()
    .min(50, 'El prompt debe tener al menos 50 caracteres')
    .optional(),
  isActive: z.boolean().optional()
});

// ============================================================================
// QUERY PARAMS SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const userQuerySchema = paginationSchema.extend({
  roles: z.union([
    userRoleSchema,
    z.array(userRoleSchema)
  ]).optional().transform(val => {
    // Convert single role to array
    if (typeof val === 'string') return [val];
    return val;
  }),
  search: z.string().optional()
});

export const projectQuerySchema = paginationSchema.extend({
  studentEmail: z.string().email().optional(),
  status: z.enum(['pending', 'submitted', 'evaluated']).optional()
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate data against a schema
 * Returns parsed data if valid, throws error if invalid
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation - returns result object instead of throwing
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}

/**
 * Format Zod errors for API responses
 */
export function formatZodError(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formatted[path] = err.message;
  });

  return formatted;
}

/**
 * Get first error message from Zod error
 */
export function getFirstError(error: z.ZodError): string {
  if (!error.errors || error.errors.length === 0) {
    return 'Datos inválidos';
  }
  return error.errors[0]?.message || 'Datos inválidos';
}
