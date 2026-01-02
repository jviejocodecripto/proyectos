import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { findUserByEmail, getAllUsers } from '@/lib/db/users';
import { createGitLabUser, listGitLabUsers } from '@/lib/gitlab/client';
import { z } from 'zod';
import { getFirstError } from '@/lib/utils/validation';
import type { ApiResponse } from '@/types';

const createGitLabBulkSchema = z.object({
  emails: z.array(z.string().email('Email inválido')).min(1, 'Debe proporcionar al menos un email')
});

export async function POST(req: NextRequest) {
  try {
    // Require admin role
    await requireRole(['admin']);

    // Get and validate request body
    const body = await req.json();
    const validatedData = createGitLabBulkSchema.parse(body);

    const results: Array<{
      email: string;
      success: boolean;
      error?: string;
      gitlabUser?: {
        id: number;
        username: string;
        email: string;
        name: string;
        state: string;
      };
    }> = [];

    // Process each email
    for (const email of validatedData.emails) {
      try {
        // Check if user exists in database
        const dbUser = await findUserByEmail(email);
        if (!dbUser) {
          results.push({
            email,
            success: false,
            error: 'El usuario no existe en la base de datos'
          });
          continue;
        }

        // Create user in GitLab
        const gitlabUser = await createGitLabUser({
          email,
          name: dbUser.name,
          admin: false,
          canCreateGroup: false,
          skipConfirmation: true
        });

        results.push({
          email,
          success: true,
          gitlabUser
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        results.push({
          email,
          success: false,
          error: errorMessage
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    // Return response
    const response: ApiResponse<{
      results: typeof results;
      successCount: number;
      errorCount: number;
      total: number;
    }> = {
      success: true,
      data: {
        results,
        successCount,
        errorCount,
        total: results.length
      },
      message: `Se crearon ${successCount} de ${results.length} usuarios en GitLab${errorCount > 0 ? ` (${errorCount} errores)` : ''}`
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Handle authorization errors
    if (error instanceof Error && error.message === 'Authentication required') {
      const response: ApiResponse = {
        success: false,
        error: 'No autenticado',
        code: 'UNAUTHORIZED'
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (error instanceof Error && error.message === 'Insufficient permissions') {
      const response: ApiResponse = {
        success: false,
        error: 'No autorizado. Se requiere rol de administrador.',
        code: 'FORBIDDEN'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: getFirstError(error),
        code: 'VALIDATION_ERROR'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle other errors
    console.error('Error in POST /api/admin/users/create-gitlab-bulk:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    const response: ApiResponse = {
      success: false,
      error: `Error al crear usuarios en GitLab: ${errorMessage}`,
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

