import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import {
  findEnvConfigById,
  updateEnvConfig,
  deleteEnvConfig,
  keyExistsForProject
} from '@/lib/db/envconfigs';
import { findProjects } from '@/lib/db/projects';
import { getFirstError } from '@/lib/utils/validation';
import type { ApiResponse, EnvConfigDTO, UpdateEnvConfigInput } from '@/types';
import { dateToISOString } from '@/types';

const updateEnvConfigSchema = z.object({
  environment: z.enum(['dev', 'pro']).optional(),
  scope: z.enum(['client', 'server']).optional(),
  key: z.string().min(1, 'La clave es requerida').max(100, 'La clave es demasiado larga').optional(),
  value: z.string().min(1, 'El valor es requerido').optional()
});

/**
 * PATCH /api/student/env-configs/:id
 * Update environment configuration
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await req.json();
    const validatedData = updateEnvConfigSchema.parse(body);

    // Get existing config to verify ownership
    const existingConfig = await findEnvConfigById(id);
    if (!existingConfig) {
      const response: ApiResponse = {
        success: false,
        error: 'Configuración no encontrada',
        code: 'NOT_FOUND'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Verify the config belongs to the student
    if (existingConfig.projectId === 'global') {
      // For global configs, verify it belongs to this student
      if (existingConfig.studentEmail !== user.email) {
        const response: ApiResponse = {
          success: false,
          error: 'No tienes permiso para modificar esta configuración',
          code: 'FORBIDDEN'
        };
        return NextResponse.json(response, { status: 403 });
      }
    } else {
      // For project-specific configs, verify the project belongs to the student
      const studentProjects = await findProjects({
        studentEmail: user.email,
        limit: 1000
      });

      const studentProjectIds = studentProjects.items.map(p => p._id!.toString());

      if (!studentProjectIds.includes(existingConfig.projectId)) {
        const response: ApiResponse = {
          success: false,
          error: 'No tienes permiso para modificar esta configuración',
          code: 'FORBIDDEN'
        };
        return NextResponse.json(response, { status: 403 });
      }
    }

    // Determine the environment to check (use updated value if provided, otherwise existing)
    const environmentToCheck = validatedData.environment !== undefined 
      ? validatedData.environment 
      : existingConfig.environment;

    // If key or environment is being updated, check if it already exists for this project and environment
    if ((validatedData.key && validatedData.key !== existingConfig.key) || 
        (validatedData.environment && validatedData.environment !== existingConfig.environment)) {
      const keyToCheck = validatedData.key || existingConfig.key;
      const exists = await keyExistsForProject(
        keyToCheck,
        existingConfig.projectId,
        environmentToCheck,
        id,
        existingConfig.projectId === 'global' ? user.email : undefined
      );

      if (exists) {
        const response: ApiResponse = {
          success: false,
          error: `La clave "${keyToCheck}" ya existe para este proyecto y environment`,
          code: 'KEY_EXISTS'
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Update configuration
    const updated = await updateEnvConfig(id, validatedData);

    if (!updated) {
      const response: ApiResponse = {
        success: false,
        error: 'Error al actualizar la configuración',
        code: 'UPDATE_ERROR'
      };
      return NextResponse.json(response, { status: 500 });
    }

    // Get updated config
    const envConfig = await findEnvConfigById(id);

    // Convert to DTO
    const envConfigDTO: EnvConfigDTO = {
      _id: envConfig!._id!.toString(),
      projectId: envConfig!.projectId,
      studentEmail: envConfig!.studentEmail,
      environment: envConfig!.environment,
      scope: envConfig!.scope,
      key: envConfig!.key,
      value: envConfig!.value,
      createdAt: dateToISOString(envConfig!.createdAt),
      updatedAt: dateToISOString(envConfig!.updatedAt)
    };

    const response: ApiResponse<EnvConfigDTO> = {
      success: true,
      data: envConfigDTO,
      message: 'Configuración actualizada correctamente'
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

    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: getFirstError(error),
        code: 'VALIDATION_ERROR'
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.error('Error in PATCH /api/student/env-configs/:id:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error al actualizar la configuración',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/student/env-configs/:id
 * Delete environment configuration
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Get existing config to verify ownership
    const existingConfig = await findEnvConfigById(id);
    if (!existingConfig) {
      const response: ApiResponse = {
        success: false,
        error: 'Configuración no encontrada',
        code: 'NOT_FOUND'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Verify the config belongs to the student
    if (existingConfig.projectId === 'global') {
      // For global configs, verify it belongs to this student
      if (existingConfig.studentEmail !== user.email) {
        const response: ApiResponse = {
          success: false,
          error: 'No tienes permiso para eliminar esta configuración',
          code: 'FORBIDDEN'
        };
        return NextResponse.json(response, { status: 403 });
      }
    } else {
      // For project-specific configs, verify the project belongs to the student
      const studentProjects = await findProjects({
        studentEmail: user.email,
        limit: 1000
      });

      const studentProjectIds = studentProjects.items.map(p => p._id!.toString());

      if (!studentProjectIds.includes(existingConfig.projectId)) {
        const response: ApiResponse = {
          success: false,
          error: 'No tienes permiso para eliminar esta configuración',
          code: 'FORBIDDEN'
        };
        return NextResponse.json(response, { status: 403 });
      }
    }

    const deleted = await deleteEnvConfig(id);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Error al eliminar la configuración',
        code: 'DELETE_ERROR'
      };
      return NextResponse.json(response, { status: 500 });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Configuración eliminada correctamente'
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

    console.error('Error in DELETE /api/student/env-configs/:id:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

