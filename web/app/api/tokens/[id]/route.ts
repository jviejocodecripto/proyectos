import { NextRequest, NextResponse } from 'next/server';
import { findTokenById } from '@/lib/db/tokens';
import { convertTokenToDTO } from '@/types';
import type { ApiResponse } from '@/types';
import { findGlobalEnvConfigsByEmailAndEnvironment } from '@/lib/db/envconfigs';
import { findAdminGlobalEnvConfigs } from '@/lib/db/envconfigs';
import { convertEnvConfigToDTO } from '@/types';

/**
 * GET /api/tokens/[id]
 * Get token by ID
 * Public endpoint - no authentication required
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find token by ID
    const token = await findTokenById(id);

    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: 'Token no encontrado',
        code: 'TOKEN_NOT_FOUND'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Convert to DTO
    const tokenDTO = convertTokenToDTO(token);

    const studentGlobalAll = await findGlobalEnvConfigsByEmailAndEnvironment(tokenDTO.email || '', ['dev', 'all', 'pro'], 'global');
    const adminGlobals = await findAdminGlobalEnvConfigs();
    // Return success response
    const response: ApiResponse = {
      success: true,
      "globals": {
        "studentGlobalsAll": studentGlobalAll.map(convertEnvConfigToDTO),
        "adminGlobals": adminGlobals.map(convertEnvConfigToDTO)
      },
      data: tokenDTO
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/tokens/[id]:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

