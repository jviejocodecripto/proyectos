import { NextRequest, NextResponse } from 'next/server';
import { createToken } from '@/lib/db/tokens';
import { convertTokenToDTO } from '@/types';
import type { ApiResponse } from '@/types';

/**
 * POST /api/tokens
 * Generate a random 6-digit code and save it to the tokens collection
 * Public endpoint - no authentication required
 */
export async function POST(req: NextRequest) {
  try {
    // Create new token with 6-digit code
    const token = await createToken();

    // Convert to DTO
    const tokenDTO = convertTokenToDTO(token);

    // Return success response
    const response: ApiResponse = {
      success: true,
      data: tokenDTO,
      message: 'Código generado correctamente'
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tokens:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

