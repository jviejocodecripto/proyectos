import { NextRequest, NextResponse } from 'next/server';
import { verifyStudentToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import { findUserByEmail } from '@/lib/db/users';
import { z } from 'zod';
import { getFirstError } from '@/lib/utils/validation';
import type { ApiResponse } from '@/types';

const verifyTokenSchema = z.object({
  token: z.string().min(1, 'El token es requerido').optional()
});

/**
 * POST /api/tokens/verify
 * Verify a JWT token and return token information
 * Public endpoint - no authentication required
 */
export async function POST(req: NextRequest) {
  try {
    // Get token from body or Authorization header
    const body = await req.json().catch(() => ({}));
    const validatedBody = verifyTokenSchema.parse(body);
    
    // Try to get token from body first, then from Authorization header
    let token: string | null = validatedBody.token || null;
    
    if (!token) {
      const authHeader = req.headers.get('Authorization');
      token = extractTokenFromHeader(authHeader);
    }

    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: 'Token no proporcionado. Envía el token en el body { "token": "..." } o en el header Authorization: Bearer <token>',
        code: 'TOKEN_MISSING'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Verify token
    let payload;
    try {
      payload = await verifyStudentToken(token);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      // Determine error type
      let code = 'TOKEN_INVALID';
      if (errorMessage.includes('expired') || errorMessage.includes('expiration')) {
        code = 'TOKEN_EXPIRED';
      } else if (errorMessage.includes('signature')) {
        code = 'TOKEN_SIGNATURE_INVALID';
      }

      const response: ApiResponse = {
        success: false,
        error: errorMessage,
        code
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user information
    const user = await findUserByEmail(payload.email);
    
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

    // Calculate expiration date
    const expiresAt = payload.exp ? new Date(payload.exp * 1000) : null;
    const isExpired = expiresAt ? expiresAt < new Date() : false;
    const expiresIn = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : null;

    // Return success response with token information
    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        email: payload.email,
        user: {
          email: user.email,
          name: user.name,
          roles: user.roles,
          isActive: user.isActive
        },
        token: {
          issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
          expiresIn: expiresIn, // seconds until expiration
          isExpired
        }
      }
    }, { status: 200 });
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
    console.error('Error in POST /api/tokens/verify:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET /api/tokens/verify
 * Verify a JWT token from Authorization header
 * Public endpoint - no authentication required
 */
export async function GET(req: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: 'Token no proporcionado. Envía el token en el header Authorization: Bearer <token>',
        code: 'TOKEN_MISSING'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Verify token
    let payload;
    try {
      payload = await verifyStudentToken(token);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      // Determine error type
      let code = 'TOKEN_INVALID';
      if (errorMessage.includes('expired') || errorMessage.includes('expiration')) {
        code = 'TOKEN_EXPIRED';
      } else if (errorMessage.includes('signature')) {
        code = 'TOKEN_SIGNATURE_INVALID';
      }

      const response: ApiResponse = {
        success: false,
        error: errorMessage,
        code
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user information
    const user = await findUserByEmail(payload.email);
    
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

    // Calculate expiration date
    const expiresAt = payload.exp ? new Date(payload.exp * 1000) : null;
    const isExpired = expiresAt ? expiresAt < new Date() : false;
    const expiresIn = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : null;

    // Return success response with token information
    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        email: payload.email,
        user: {
          email: user.email,
          name: user.name,
          roles: user.roles,
          isActive: user.isActive
        },
        token: {
          issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
          expiresIn: expiresIn, // seconds until expiration
          isExpired
        }
      }
    }, { status: 200 });
  } catch (error) {
    // Handle other errors
    console.error('Error in GET /api/tokens/verify:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

