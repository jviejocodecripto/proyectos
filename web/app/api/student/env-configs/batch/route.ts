import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import {
  createEnvConfig,
  keyExistsForProject
} from '@/lib/db/envconfigs';
import { findProjects } from '@/lib/db/projects';
import type { ApiResponse, EnvConfigDTO } from '@/types';
import { dateToISOString } from '@/types';

const batchCreateSchema = z.object({
  projectId: z.union([
    z.literal('global'),
    z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de proyecto inválido')
  ]),
  environment: z.enum(['dev', 'pro']),
  scope: z.enum(['client', 'server']),
  variables: z.array(z.object({
    key: z.string().min(1, 'La clave es requerida').max(100, 'La clave es demasiado larga'),
    value: z.string().min(1, 'El valor es requerido')
  })).min(1, 'Debe haber al menos una variable')
});

/**
 * POST /api/student/env-configs/batch
 * Create multiple environment configurations at once
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
    const validatedData = batchCreateSchema.parse(body);

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

    const studentEmail = validatedData.projectId === 'global' ? user.email : undefined;
    const created: EnvConfigDTO[] = [];
    const errors: Array<{ key: string; error: string }> = [];

    // Process each variable
    for (const variable of validatedData.variables) {
      try {
        // Check if key already exists for this project and environment
        const exists = await keyExistsForProject(
          variable.key,
          validatedData.projectId,
          validatedData.environment,
          undefined,
          studentEmail
        );

        if (exists) {
          errors.push({
            key: variable.key,
            error: `La clave "${variable.key}" ya existe para este proyecto`
          });
          continue;
        }

        // Create environment configuration
        const envConfig = await createEnvConfig(
          {
            projectId: validatedData.projectId,
            environment: validatedData.environment,
            scope: validatedData.scope,
            key: variable.key,
            value: variable.value
          },
          studentEmail
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

        created.push(envConfigDTO);
      } catch (error) {
        errors.push({
          key: variable.key,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // Return response with created items and errors
    const response: ApiResponse<{
      created: EnvConfigDTO[];
      errors: Array<{ key: string; error: string }>;
    }> = {
      success: true,
      data: {
        created,
        errors
      },
      message: `${created.length} variable(s) creada(s) correctamente${errors.length > 0 ? `. ${errors.length} error(es)` : ''}`
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
        error: error.issues[0]?.message || 'Datos inválidos',
        code: 'VALIDATION_ERROR'
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.error('Error in POST /api/student/env-configs/batch:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error al crear las configuraciones',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

