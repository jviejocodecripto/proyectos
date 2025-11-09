import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { findUserByEmail, updateUserStatus } from '@/lib/db/users';
import { convertUserToDTO } from '@/types';
import { updateUserStatusSchema, getFirstError } from '@/lib/utils/validation';
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
    const { isActive } = updateUserStatusSchema.parse(body);

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

    // Check if status is already set
    if (user.isActive === isActive) {
      const response: ApiResponse = {
        success: false,
        error: `El usuario ya está ${isActive ? 'activo' : 'inactivo'}`,
        code: 'STATUS_ALREADY_SET'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Update status
    const updated = await updateUserStatus(decodedEmail, isActive);

    if (!updated) {
      const response: ApiResponse = {
        success: false,
        error: 'Error al actualizar el estado',
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
      message: `Usuario ${isActive ? 'activado' : 'desactivado'} correctamente`
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
    console.error('Error in PATCH /api/admin/users/:email/status:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
