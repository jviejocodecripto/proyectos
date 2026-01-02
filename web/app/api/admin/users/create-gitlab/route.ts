import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { findUserByEmail } from '@/lib/db/users';
import { createGitLabUser } from '@/lib/gitlab/client';
import { z } from 'zod';
import { getFirstError } from '@/lib/utils/validation';
import type { ApiResponse } from '@/types';

const createGitLabUserSchema = z.object({
  email: z.string().email('Email inválido'),
  username: z.string().optional(),
  name: z.string().optional(),
  admin: z.boolean().optional(),
  canCreateGroup: z.boolean().optional()
});

export async function POST(req: NextRequest) {
  try {
    // Require admin role
    await requireRole(['admin']);

    // Get and validate request body
    const body = await req.json();
    const validatedData = createGitLabUserSchema.parse(body);

    // Check if user exists in database
    const dbUser = await findUserByEmail(validatedData.email);
    if (!dbUser) {
      const response: ApiResponse = {
        success: false,
        error: 'El usuario no existe en la base de datos',
        code: 'USER_NOT_FOUND'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Create user in GitLab
    const gitlabUser = await createGitLabUser({
      email: validatedData.email,
      username: validatedData.username,
      name: validatedData.name || dbUser.name,
      admin: validatedData.admin || false,
      canCreateGroup: validatedData.canCreateGroup || false,
      skipConfirmation: true
    });

    // Return success response
    const response: ApiResponse<{
      id: number;
      username: string;
      email: string;
      name: string;
      state: string;
    }> = {
      success: true,
      data: gitlabUser,
      message: 'Usuario creado en GitLab correctamente'
    };

    return NextResponse.json(response, { status: 201 });
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
    console.error('Error in POST /api/admin/users/create-gitlab:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    const response: ApiResponse = {
      success: false,
      error: `Error al crear usuario en GitLab: ${errorMessage}`,
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

