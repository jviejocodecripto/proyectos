import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { findUserByEmail, updateUser, deleteUser } from '@/lib/db/users';
import { convertUserToDTO } from '@/types';
import { updateUserSchema, getFirstError } from '@/lib/utils/validation';
import { z } from 'zod';
import type { ApiResponse, UserDTO } from '@/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Require admin role
    await requireRole(['admin']);

    // Get email from params
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);

    // Get and validate request body
    const body = await req.json();
    const updates = updateUserSchema.parse(body);

    // Find user
    const user = await findUserByEmail(decodedEmail);

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Update user
    const updated = await updateUser(decodedEmail, updates);

    if (!updated) {
      const response: ApiResponse = {
        success: false,
        error: 'Error al actualizar el usuario',
        code: 'UPDATE_ERROR'
      };
      return NextResponse.json(response, { status: 500 });
    }

    // Get updated user
    const updatedUser = await findUserByEmail(decodedEmail);

    if (!updatedUser) {
      const response: ApiResponse = {
        success: false,
        error: 'Error al obtener usuario actualizado',
        code: 'FETCH_ERROR'
      };
      return NextResponse.json(response, { status: 500 });
    }

    // Return success response
    const response: ApiResponse<UserDTO> = {
      success: true,
      data: convertUserToDTO(updatedUser),
      message: 'Usuario actualizado correctamente'
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
    console.error('Error in PATCH /api/admin/users/:email:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Require admin role
    await requireRole(['admin']);

    // Get email from params
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);

    // Find user
    const user = await findUserByEmail(decodedEmail);

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Delete user
    const deleted = await deleteUser(decodedEmail);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Error al eliminar el usuario',
        code: 'DELETE_ERROR'
      };
      return NextResponse.json(response, { status: 500 });
    }

    // Return success response
    const response: ApiResponse = {
      success: true,
      message: 'Usuario eliminado correctamente'
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
    console.error('Error in DELETE /api/admin/users/:email:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
