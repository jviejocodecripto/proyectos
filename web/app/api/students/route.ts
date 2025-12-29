import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { findUsers, createUserWithRoles, findUserByEmail } from '@/lib/db/users';
import { convertUserToDTO } from '@/types';
import { createUserSchema, getFirstError } from '@/lib/utils/validation';
import { z } from 'zod';
import type { ApiResponse, UserDTO } from '@/types';

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

/**
 * POST /api/students
 * Create a new student (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    // Require admin role
    await requireRole(['admin']);

    // Get and validate request body
    const body = await req.json();
    
    // Schema for creating a student (always with student role)
    const createStudentSchema = z.object({
      email: z.string().email('Email inválido').toLowerCase(),
      name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
      isActive: z.boolean().default(true).optional()
    });

    const { email, name, isActive = true } = createStudentSchema.parse(body);

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

    // Create user with student role
    const newUser = await createUserWithRoles(email, name, ['student'], isActive);

    // Return success response
    const response: ApiResponse<UserDTO> = {
      success: true,
      data: convertUserToDTO(newUser),
      message: 'Estudiante creado correctamente'
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
    console.error('Error in POST /api/students:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

