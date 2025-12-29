import { NextRequest, NextResponse } from 'next/server';
import { validateCodeAndCreateToken, findTokenByCode } from '@/lib/db/tokens';
import { generateStudentToken } from '@/lib/auth/jwt';
import { findUserByEmail } from '@/lib/db/users';
import { findAdminGlobalEnvConfigs, findGlobalEnvConfigsByEmailAndEnvironment } from '@/lib/db/envconfigs';
import { z } from 'zod';
import { getFirstError } from '@/lib/utils/validation';
import type { ApiResponse, EnvConfigDTO } from '@/types';
import { convertEnvConfigToDTO } from '@/types';

const validateCodeSchema = z.object({
  code: z.string().length(6, 'El código debe tener 6 dígitos').regex(/^\d+$/, 'El código debe contener solo números'),
  email: z.string().email('Email inválido').toLowerCase()
});

/**
 * POST /api/tokens/validate
 * Validate a 6-digit code and generate a JWT token
 * Public endpoint - no authentication required
 */
export async function POST(req: NextRequest) {
  try {
    // Get and validate request body
    const body = await req.json();
    const { code, email } = validateCodeSchema.parse(body);

    // Check if user exists
    const user = await findUserByEmail(email);
    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is active
    if (!user.isActive) {
      const response: ApiResponse = {
        success: false,
        error: 'Usuario inactivo',
        code: 'USER_INACTIVE'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Find token by code
    const token = await findTokenByCode(code);
    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: 'Código inválido',
        code: 'INVALID_CODE'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if code already used
    if (token.used) {
      const response: ApiResponse = {
        success: false,
        error: 'Código ya utilizado',
        code: 'CODE_ALREADY_USED'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Generate JWT token (12 months expiration)
    const expiresIn = 31536000; // 12 months in seconds
    const jwt = await generateStudentToken(email, expiresIn);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 12);

    // Update token with email, JWT and expiration
    const updatedToken = await validateCodeAndCreateToken(code, email, jwt, expiresAt);

    if (!updatedToken) {
      const response: ApiResponse = {
        success: false,
        error: 'Error al actualizar el token',
        code: 'UPDATE_ERROR'
      };
      return NextResponse.json(response, { status: 500 });
    }

    // Get server URL from environment or request
    const serverUrl = process.env.NEXT_PUBLIC_APP_URL || 
                      `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    // Get global environment variables
    // 1. Admin global variables (without studentEmail) - all environments
    const adminGlobals = await findAdminGlobalEnvConfigs();
    
    // 2. Student global variables (with the user's email)
    // Get both dev and pro environments (includes 'all' environment configs)
    const studentGlobalsAll = await findGlobalEnvConfigsByEmailAndEnvironment(email, ['dev', 'all', 'pro'], 'global');
  
    const resultado ={
      token: jwt,
      email,
      serverUrl,
      createdAt: updatedToken.createdAt.toISOString(),
      studentGlobalsAll,
      adminGlobals
    }
    console.log('resultado', resultado);
    // Return success response with JWT and environment variables
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
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
    console.error('Error in POST /api/tokens/validate:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

