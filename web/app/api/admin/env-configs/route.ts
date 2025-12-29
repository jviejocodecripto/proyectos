import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import {
  createEnvConfig,
  findAdminGlobalEnvConfigs,
  keyExistsForProject
} from '@/lib/db/envconfigs';
import { getFirstError } from '@/lib/utils/validation';
import type { ApiResponse, EnvConfigDTO } from '@/types';
import { dateToISOString } from '@/types';

const createEnvConfigSchema = z.object({
  environment: z.enum(['dev', 'pro', 'all']),
  scope: z.enum(['client', 'server']),
  key: z.string().min(1, 'La clave es requerida').max(100, 'La clave es demasiado larga'),
  value: z.string().min(1, 'El valor es requerido')
});

/**
 * GET /api/admin/env-configs
 * List all admin global environment configurations
 * Query params: environment (required) - 'dev' or 'pro'
 */
export async function GET(req: NextRequest) {
  try {
    // Only admins can access this endpoint
    await requireRole(['admin']);

    // Get environment from query params (optional, defaults to all)
    const { searchParams } = new URL(req.url);
    const environment = searchParams.get('environment') as 'dev' | 'pro' | 'all' | null;

    // Get admin global environment configurations
    // If environment is specified, filter by that environment or 'all'
    const configs = await findAdminGlobalEnvConfigs(environment || undefined);

    // Convert to DTOs
    const items: EnvConfigDTO[] = configs.map(config => ({
      _id: config._id!.toString(),
      projectId: config.projectId,
      studentEmail: config.studentEmail,
      environment: config.environment,
      scope: config.scope,
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
        error: 'No autenticado o no autorizado',
        code: 'UNAUTHORIZED'
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.error('Error in GET /api/admin/env-configs:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/admin/env-configs
 * Create a new admin global environment configuration
 */
export async function POST(req: NextRequest) {
  try {
    // Only admins can access this endpoint
    await requireRole(['admin']);

    const body = await req.json();
    const validatedData = createEnvConfigSchema.parse(body);

    // Check if key already exists for admin global configs
    const exists = await keyExistsForProject(
      validatedData.key,
      'global',
      validatedData.environment,
      undefined,
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

    // Create admin global environment configuration (no studentEmail)
    const envConfig = await createEnvConfig(
      {
        projectId: 'global',
        environment: validatedData.environment,
        scope: validatedData.scope,
        key: validatedData.key,
        value: validatedData.value
      },
      undefined // No studentEmail for admin globals
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
      message: 'Configuración global de administrador creada correctamente'
    };

    return NextResponse.json(response, { status: 201 });
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

    console.error('Error in POST /api/admin/env-configs:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error al crear la configuración',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

