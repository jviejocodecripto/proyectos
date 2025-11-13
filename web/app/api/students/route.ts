import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { findUsers } from '@/lib/db/users';
import { convertUserToDTO } from '@/types';
import type { ApiResponse } from '@/types';

/**
 * GET /api/students
 * Get list of students (teachers and admins only)
 */
export async function GET(req: NextRequest) {
  try {
    // Require teacher or admin role
    await requireRole(['teacher', 'admin']);

    // Get all students
    const result = await findUsers({
      roles: ['student'],
      page: 1,
      limit: 1000 // Get all students
    });

    // Convert to DTOs and sort by name
    const students = result.items
      .map(convertUserToDTO)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Return response
    const response: ApiResponse = {
      success: true,
      data: students
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
        error: 'No autorizado. Se requiere rol de profesor o administrador.',
        code: 'FORBIDDEN'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle other errors
    console.error('Error in GET /api/students:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

