import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import {
  findEnvConfigById,
  updateEnvConfig,
  deleteEnvConfig,
  keyExistsForProject
} from '@/lib/db/envconfigs';
import { getFirstError } from '@/lib/utils/validation';
import type { ApiResponse, EnvConfigDTO, UpdateEnvConfigInput } from '@/types';
import { dateToISOString } from '@/types';

const updateEnvConfigSchema = z.object({
  environment: z.enum(['dev', 'pro', 'all']).optional(),
  scope: z.enum(['client', 'server']).optional(),
  key: z.string().min(1, 'La clave es requerida').max(100, 'La clave es demasiado larga').optional(),
  value: z.string().min(1, 'El valor es requerido').optional()
});

/**
 * GET /api/admin/env-configs/:id
 * Get admin global environment configuration by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only admins can access this endpoint
    await requireRole(['admin']);

    const { id } = await params;
    const config = await findEnvConfigById(id);

    if (!config) {
      const response: ApiResponse = {
        success: false,
        error: 'Configuración no encontrada',
        code: 'NOT_FOUND'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Verify it's an admin global config (projectId is 'global' and no studentEmail)
    if (config.projectId !== 'global' || config.studentEmail) {
      const response: ApiResponse = {
        success: false,
        error: 'Esta no es una configuración global de administrador',
        code: 'FORBIDDEN'
      };
      return NextResponse.json(response, { status: 403 });
    }

    const configDTO: EnvConfigDTO = {
      _id: config._id!.toString(),
      projectId: config.projectId,
      studentEmail: config.studentEmail,
      environment: config.environment,
      scope: config.scope,
      key: config.key,
      value: config.value,
      createdAt: dateToISOString(config.createdAt),
      updatedAt: dateToISOString(config.updatedAt)
    };

    const response: ApiResponse<EnvConfigDTO> = {
      success: true,
      data: configDTO
    };

    return NextResponse.json(response);
  } catch (error: any) {
    if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
      const response: ApiResponse = {
        success: false,
        error: 'No autenticado o no autorizado',
        code: 'UNAUTHORIZED'
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.error('Error in GET /api/admin/env-configs/[id]:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PATCH /api/admin/env-configs/:id
 * Update admin global environment configuration
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only admins can access this endpoint
    await requireRole(['admin']);

    const { id } = await params;
    const body = await req.json();
    const validatedData = updateEnvConfigSchema.parse(body);

    const existingConfig = await findEnvConfigById(id);

    if (!existingConfig) {
      const response: ApiResponse = {
        success: false,
        error: 'Configuración no encontrada',
        code: 'NOT_FOUND'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Verify it's an admin global config
    if (existingConfig.projectId !== 'global' || existingConfig.studentEmail) {
      const response: ApiResponse = {
        success: false,
        error: 'Esta no es una configuración global de administrador',
        code: 'FORBIDDEN'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // If key is being updated, check if it already exists for admin globals
    if (validatedData.key && validatedData.key !== existingConfig.key) {
      const environmentToCheck = validatedData.environment !== undefined 
        ? validatedData.environment 
        : existingConfig.environment;

      const exists = await keyExistsForProject(
        validatedData.key,
        'global',
        environmentToCheck,
        id,
        undefined // No studentEmail for admin globals
      );

      if (exists) {
        const response: ApiResponse = {
          success: false,
          error: `La clave "${validatedData.key}" ya existe para las configuraciones globales de administrador`,
          code: 'KEY_EXISTS'
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    const updated = await updateEnvConfig(id, validatedData);

    if (!updated) {
      const response: ApiResponse = {
        success: false,
        error: 'Error al actualizar la configuración',
        code: 'SERVER_ERROR'
      };
      return NextResponse.json(response, { status: 500 });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Configuración actualizada correctamente'
    };

    return NextResponse.json(response);
  } catch (error: any) {
    if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
      const response: ApiResponse = {
        success: false,
        error: 'No autenticado o no autorizado',
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

    console.error('Error in PATCH /api/admin/env-configs/[id]:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error al actualizar la configuración',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/admin/env-configs/:id
 * Delete admin global environment configuration
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only admins can access this endpoint
    await requireRole(['admin']);

    const { id } = await params;
    const existingConfig = await findEnvConfigById(id);

    if (!existingConfig) {
      const response: ApiResponse = {
        success: false,
        error: 'Configuración no encontrada',
        code: 'NOT_FOUND'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Verify it's an admin global config
    if (existingConfig.projectId !== 'global' || existingConfig.studentEmail) {
      const response: ApiResponse = {
        success: false,
        error: 'Esta no es una configuración global de administrador',
        code: 'FORBIDDEN'
      };
      return NextResponse.json(response, { status: 403 });
    }

    const deleted = await deleteEnvConfig(id);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Error al eliminar la configuración',
        code: 'SERVER_ERROR'
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
        error: 'No autenticado o no autorizado',
        code: 'UNAUTHORIZED'
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.error('Error in DELETE /api/admin/env-configs/[id]:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

