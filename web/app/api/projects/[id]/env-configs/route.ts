import { NextRequest, NextResponse } from 'next/server';
import { getEmailFromRequest } from '@/lib/auth/session';
import { extractTokenFromHeader, verifyStudentToken } from '@/lib/auth/jwt';
import { findEnvConfigsByProjectAndEnvironment } from '@/lib/db/envconfigs';
import { findProjectById } from '@/lib/db/projects';
import { findUserByEmail } from '@/lib/db/users';
import type { ApiResponse, EnvConfigDTO } from '@/types';
import { dateToISOString } from '@/types';

/**
 * GET /api/projects/:id/env-configs
 * Get environment configurations for a specific project and environment
 * Query params: environment (required) - 'dev' or 'pro'
 * Authentication: JWT token in Authorization header (Bearer <token>) or session
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get email from JWT token or session
    let studentEmail: string | null = null;
    
    // Try JWT token first
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = extractTokenFromHeader(authHeader);
        if (token) {
          const payload = await verifyStudentToken(token);
          studentEmail = payload.email;
        }
      } catch (error: any) {
        // JWT verification failed, try session
        studentEmail = await getEmailFromRequest(req);
      }
    } else {
      // No Authorization header, try session
      studentEmail = await getEmailFromRequest(req);
    }

    if (!studentEmail) {
      // Try to get JWT error details
      let jwtError: string | null = null;
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        try {
          const token = extractTokenFromHeader(authHeader);
          if (token) {
            await verifyStudentToken(token);
          }
        } catch (error: any) {
          jwtError = error.message || 'Unknown JWT error';
        }
      }
      
      const errorMessage = jwtError 
        ? `Token JWT inválido: ${jwtError}. Proporciona un token JWT válido en el header Authorization o inicia sesión`
        : 'No autenticado. Proporciona un token JWT válido en el header Authorization o inicia sesión';
      const response: ApiResponse & { jwtError?: string } = {
        success: false,
        error: errorMessage,
        code: 'UNAUTHORIZED',
        jwtError: jwtError || undefined
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Verify user exists and is active
    const user = await findUserByEmail(studentEmail);
    if (!user || !user.isActive) {
      const response: ApiResponse = {
        success: false,
        error: 'Usuario no encontrado o inactivo',
        code: 'USER_NOT_FOUND'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Get project ID from params
    const { id } = await params;

    // Get environment from query params
    const { searchParams } = new URL(req.url);
    const environment = searchParams.get('environment');

    if (!environment || (environment !== 'dev' && environment !== 'pro')) {
      const response: ApiResponse = {
        success: false,
        error: 'El parámetro "environment" es requerido y debe ser "dev" o "pro"',
        code: 'VALIDATION_ERROR'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Find project to verify it exists and check permissions
    const project = await findProjectById(id);

    if (!project) {
      const response: ApiResponse = {
        success: false,
        error: 'Proyecto no encontrado',
        code: 'PROJECT_NOT_FOUND'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check permissions: students can only view their own projects
    // Handle legacy users with 'role' field instead of 'roles'
    // @ts-ignore - handle legacy field
    const roles = user.roles || (user.role ? [user.role] : []);
    const isStudent = roles.includes('student') &&
                      !roles.includes('teacher') &&
                      !roles.includes('admin');

    if (isStudent && project.studentEmail !== studentEmail) {
      const response: ApiResponse = {
        success: false,
        error: 'No tienes permiso para ver las variables de entorno de este proyecto',
        code: 'FORBIDDEN'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Get environment configurations for this project and environment
    const configs = await findEnvConfigsByProjectAndEnvironment(
      id,
      environment as 'dev' | 'pro'
    );

        // Convert to DTOs
        const items: EnvConfigDTO[] = configs.map(config => ({
          _id: config._id!.toString(),
          projectId: config.projectId,
          studentEmail: config.studentEmail,
          environment: config.environment,
          scope: config.scope,
          key: config.key,
          value: config.value,
          createdAt: dateToISOString(config.createdAt),
          updatedAt: dateToISOString(config.updatedAt)
        }));

    const response: ApiResponse<EnvConfigDTO[]> = {
      success: true,
      data: items
    };

    return NextResponse.json(response);
  } catch (error: any) {
    if (error.message === 'Token expired' || error.message === 'Invalid token' || error.message === 'Token verification failed' || error.message?.includes('Token')) {
      const response: ApiResponse & { jwtError?: string; errorDetails?: any } = {
        success: false,
        error: `Token inválido: ${error.message}`,
        code: 'UNAUTHORIZED',
        jwtError: error.message,
        errorDetails: {
          code: error.code,
          name: error.name,
          message: error.message
        }
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.error('Error in GET /api/projects/:id/env-configs:', error);
    const response: ApiResponse & { errorDetails?: any } = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR',
      errorDetails: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    };
    return NextResponse.json(response, { status: 500 });
  }
}

