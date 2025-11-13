import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { findUsers, findUserByEmail, createUserWithRoles } from '@/lib/db/users';
import { convertUserToDTO } from '@/types';
import { userQuerySchema, createUserSchema, getFirstError } from '@/lib/utils/validation';
import { z } from 'zod';
import type { ApiResponse, UserDTO, PaginatedResponse } from '@/types';

export async function GET(req: NextRequest) {
  try {
    // Require admin role
    await requireRole(['admin']);

    // Get query params
    const { searchParams } = new URL(req.url);
    const queryParams = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      roles: searchParams.get('roles') || searchParams.get('role') || undefined,
      search: searchParams.get('search') || undefined
    };

    // Validate query params
    const validatedParams = userQuerySchema.parse(queryParams);

    // Get users from database
    const result = await findUsers(validatedParams);

    // Convert to DTOs
    const users = result.items.map(convertUserToDTO);

    // Return response
    const response: ApiResponse<PaginatedResponse<UserDTO>> = {
      success: true,
      data: {
        items: users,
        pagination: result.pagination
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
    console.error('Error in GET /api/admin/users:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Require admin role
    await requireRole(['admin']);

    // Get and validate request body
    const body = await req.json();
    const { email, name, roles, isActive } = createUserSchema.parse(body);

    // Check if user already exists
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      const response: ApiResponse = {
        success: false,
        error: 'El usuario ya existe',
        code: 'USER_EXISTS'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create user
    const newUser = await createUserWithRoles(email, name, roles, isActive);

    // Return success response
    const response: ApiResponse<UserDTO> = {
      success: true,
      data: convertUserToDTO(newUser),
      message: 'Usuario creado correctamente'
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error(error.message);
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
    console.error('Error in POST /api/admin/users:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
