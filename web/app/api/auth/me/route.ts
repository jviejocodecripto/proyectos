import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { findUserByEmail } from '@/lib/db/users';
import { convertUserToDTO } from '@/types';
import type { ApiResponse, UserDTO } from '@/types';

export async function GET(req: NextRequest) {
  try {
    // Get current user from session
    const sessionUser = await getCurrentUser();

    if (!sessionUser) {
      const response: ApiResponse = {
        success: false,
        error: 'No autenticado',
        code: 'UNAUTHORIZED'
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get full user data from database
    const user = await findUserByEmail(sessionUser.email);

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Convert to DTO
    const userDTO = convertUserToDTO(user);

    const response: ApiResponse<UserDTO> = {
      success: true,
      data: userDTO
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/auth/me:', error);

    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
