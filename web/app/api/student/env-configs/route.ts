import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import {
  createEnvConfig,
  findEnvConfigsForStudent,
  keyExistsForProject
} from '@/lib/db/envconfigs';
import { findProjects } from '@/lib/db/projects';
import { getFirstError } from '@/lib/utils/validation';
import type { ApiResponse, EnvConfigDTO, CreateEnvConfigInput } from '@/types';
import { dateToISOString } from '@/types';

const createEnvConfigSchema = z.object({
  projectId: z.union([
    z.literal('global'),
    z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de proyecto inválido')
  ]),
  environment: z.enum(['dev', 'pro']),
  scope: z.enum(['client', 'server']),
  key: z.string().min(1, 'La clave es requerida').max(100, 'La clave es demasiado larga'),
  value: z.string().min(1, 'El valor es requerido')
});

/**
 * GET /api/student/env-configs
 * List all environment configurations for student's projects (including global)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    // Students can access this endpoint (even if they have other roles)
    const isStudent = user.roles.includes('student');

    if (!isStudent) {
      const response: ApiResponse = {
        success: false,
        error: 'Debes tener el rol de estudiante para acceder a este endpoint',
        code: 'FORBIDDEN'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Get student's projects
    const studentProjects = await findProjects({
      studentEmail: user.email,
      limit: 1000
    });

    const studentProjectIds = studentProjects.items.map(p => p._id!.toString());

    // Get all configs for student's projects + global (filtered by student email)
    const configs = await findEnvConfigsForStudent(studentProjectIds, user.email);

      // Convert to DTOs
      const items: EnvConfigDTO[] = configs.map(config => ({
        _id: config._id!.toString(),
        projectId: config.projectId,
        studentEmail: config.studentEmail,
        environment: config.environment,
        scope: config.scope || 'server', // Default to 'server' for old records
        key: config.key,
        value: config.value,
        createdAt: dateToISOString(config.createdAt),
        updatedAt: dateToISOString(config.updatedAt)
      }));

    const response: ApiResponse<EnvConfigDTO[]> = {
      success: true,
      data: items
    };

    return NextResponse.json(response);
  } catch (error: any) {
    if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
      const response: ApiResponse = {
        success: false,
        error: 'No autenticado',
        code: 'UNAUTHORIZED'
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.error('Error in GET /api/student/env-configs:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/student/env-configs
 * Create a new environment configuration
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    // Students can access this endpoint (even if they have other roles)
    const isStudent = user.roles.includes('student');

    if (!isStudent) {
      const response: ApiResponse = {
        success: false,
        error: 'Debes tener el rol de estudiante para acceder a este endpoint',
        code: 'FORBIDDEN'
      };
      return NextResponse.json(response, { status: 403 });
    }

    const body = await req.json();
    const validatedData = createEnvConfigSchema.parse(body);

    // If not global, verify the project belongs to the student
    if (validatedData.projectId !== 'global') {
      const studentProjects = await findProjects({
        studentEmail: user.email,
        limit: 1000
      });

      const studentProjectIds = studentProjects.items.map(p => p._id!.toString());

      if (!studentProjectIds.includes(validatedData.projectId)) {
        const response: ApiResponse = {
          success: false,
          error: 'No tienes permiso para crear configuraciones para este proyecto',
          code: 'FORBIDDEN'
        };
        return NextResponse.json(response, { status: 403 });
      }
    }

    // Check if key already exists for this project and environment
    const exists = await keyExistsForProject(
      validatedData.key,
      validatedData.projectId,
      validatedData.environment,
      undefined,
      validatedData.projectId === 'global' ? user.email : undefined
    );

    if (exists) {
      const response: ApiResponse = {
        success: false,
        error: `La clave "${validatedData.key}" ya existe para este proyecto`,
        code: 'KEY_EXISTS'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create environment configuration
    const envConfig = await createEnvConfig(
      validatedData,
      validatedData.projectId === 'global' ? user.email : undefined
    );

      // Convert to DTO
      const envConfigDTO: EnvConfigDTO = {
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

    const response: ApiResponse<EnvConfigDTO> = {
      success: true,
      data: envConfigDTO,
      message: 'Configuración creada correctamente'
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
      const response: ApiResponse = {
        success: false,
        error: 'No autenticado',
        code: 'UNAUTHORIZED'
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: getFirstError(error),
        code: 'VALIDATION_ERROR'
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.error('Error in POST /api/student/env-configs:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error al crear la configuración',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

