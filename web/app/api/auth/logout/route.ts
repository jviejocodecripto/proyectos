import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';
import type { ApiResponse } from '@/types';

export async function POST(req: NextRequest) {
  try {
    // Destroy session
    await destroySession();

    const response: ApiResponse = {
      success: true,
      message: 'Sesión cerrada correctamente'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in logout:', error);

    const response: ApiResponse = {
      success: false,
      error: 'Error al cerrar sesión',
      code: 'LOGOUT_ERROR'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
