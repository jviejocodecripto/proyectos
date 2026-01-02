import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { findUsers } from '@/lib/db/users';
import type { ApiResponse } from '@/types';

/**
 * GET /api/students/list
 * Get list of students (only name and email)
 * Requires admin authentication
 */
export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    await requireAuth();

    // Get query params
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // Build query for students
    const queryParams: any = {
      roles: ['student'],
      page: 1,
      limit: 1000 // Get all students
    };

    if (search) {
      queryParams.search = search;
    }

    // Get students from database
    const result = await findUsers(queryParams);

    // Return only name and email
    const students = result.items.map(user => ({
      email: user.email,
      name: user.name
    }));

    // Return response
    const response: ApiResponse<{ items: Array<{ email: string; name: string }> }> = {
      success: true,
      data: {
        items: students
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

    // Handle other errors
    console.error('Error in GET /api/students/list:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

