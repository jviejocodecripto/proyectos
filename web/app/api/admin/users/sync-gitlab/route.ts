import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { getAllUsers } from '@/lib/db/users';
import { listGitLabUsers } from '@/lib/gitlab/client';
import { convertUserToDTO } from '@/types';
import type { ApiResponse, UserDTO } from '@/types';

export async function GET(req: NextRequest) {
  try {
    // Require admin role
    await requireRole(['admin']);

    // Get all users from database
    const dbUsers = await getAllUsers();

    // Get all users from GitLab
    const gitlabUsers = await listGitLabUsers();

    // Create a set of GitLab user emails for quick lookup
    const gitlabEmails = new Set(
      gitlabUsers.map(user => user.email.toLowerCase())
    );

    // Find users that don't exist in GitLab
    const usersNotInGitLab = dbUsers
      .filter(user => !gitlabEmails.has(user.email.toLowerCase()))
      .map(convertUserToDTO);

    // Return response
    const response: ApiResponse<{
      missingUsers: UserDTO[];
      totalDbUsers: number;
      totalGitLabUsers: number;
      missingCount: number;
    }> = {
      success: true,
      data: {
        missingUsers: usersNotInGitLab,
        totalDbUsers: dbUsers.length,
        totalGitLabUsers: gitlabUsers.length,
        missingCount: usersNotInGitLab.length
      }
    };

    return NextResponse.json(response);
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

    // Handle other errors
    console.error('Error in GET /api/admin/users/sync-gitlab:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    const response: ApiResponse = {
      success: false,
      error: `Error al sincronizar usuarios: ${errorMessage}`,
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

