import { NextRequest, NextResponse } from 'next/server';
import { getEmailFromRequest, getCurrentUser } from '@/lib/auth/session';
import { extractTokenFromHeader, verifyStudentToken } from '@/lib/auth/jwt';
import { findGlobalEnvConfigsByEmailAndEnvironment } from '@/lib/db/envconfigs';
import { findUserByEmail } from '@/lib/db/users';
import type { ApiResponse, EnvConfigDTO } from '@/types';
import { dateToISOString } from '@/types';

/**
 * GET /api/student/env-configs/global
 * Get global environment configurations for the authenticated student and environment
 * Query params: 
 *   - environment (required) - 'dev' or 'pro'
 * Authentication: JWT token in Authorization header (Bearer <token>) or session
 */
export async function GET(req: NextRequest) {
  try {
    // Get email from JWT token or session
    let studentEmail: string | null = null;
    let jwtError: string | null = null;
    
    // Try JWT token first
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header received:', authHeader ? 'YES' : 'NO', authHeader ? authHeader.substring(0, 30) + '...' : '');
    
    if (authHeader) {
      const token = extractTokenFromHeader(authHeader);
      console.log('Token extracted:', token ? 'YES' : 'NO', token ? token.substring(0, 30) + '...' : '');
      
      if (token) {
        try {
          const payload = await verifyStudentToken(token);
          console.log('JWT verification successful, email:', payload.email);
          studentEmail = payload.email;
        } catch (error: any) {
          // Store JWT error for debugging
          jwtError = error.message || 'Unknown JWT error';
          console.error('JWT verification failed:', {
            message: error.message,
            code: error.code,
            name: error.name,
            tokenPreview: token.substring(0, 20) + '...',
            fullError: error
          });
          // JWT verification failed, try session
          try {
            const sessionEmail = await getEmailFromRequest(req);
            if (sessionEmail) {
              console.log('Session authentication successful, email:', sessionEmail);
              studentEmail = sessionEmail;
            } else {
              console.log('Session authentication failed: no email');
            }
          } catch (sessionError: any) {
            // Session also failed, will return 401 below
            console.error('Session authentication also failed:', sessionError);
          }
        }
      } else {
        console.log('No token extracted from header, trying session');
        // No token in header, try session
        studentEmail = await getEmailFromRequest(req);
      }
    } else {
      console.log('No Authorization header, trying session');
      // No Authorization header, try session
      studentEmail = await getEmailFromRequest(req);
    }
    
    console.log('Final studentEmail:', studentEmail, 'jwtError:', jwtError);

    if (!studentEmail) {
      const errorMessage = jwtError 
        ? `Token JWT inválido: ${jwtError}. Proporciona un token JWT válido en el header Authorization o inicia sesión`
        : 'No autenticado. Proporciona un token JWT válido en el header Authorization o inicia sesión';
      const response: ApiResponse & { jwtError?: string; debug?: any } = {
        success: false,
        error: errorMessage,
        code: 'UNAUTHORIZED',
        jwtError: jwtError || undefined,
        debug: {
          hasAuthHeader: !!authHeader,
          authHeaderPreview: authHeader ? authHeader.substring(0, 50) + '...' : null,
          hasJwtError: !!jwtError,
          jwtErrorValue: jwtError
        }
      };
      console.log('Returning 401 response:', JSON.stringify(response, null, 2));
      return NextResponse.json(response, { status: 401 });
    }

    // Verify user exists and is active
    console.log('Looking for user with email:', studentEmail);
    const user = await findUserByEmail(studentEmail);
    console.log('User found:', user ? 'YES' : 'NO', user ? { email: user.email, isActive: user.isActive, roles: user.roles } : '');
    
    if (!user || !user.isActive) {
      const response: ApiResponse = {
        success: false,
        error: 'Usuario no encontrado o inactivo',
        code: 'USER_NOT_FOUND'
      };
      console.log('Returning 403 - User not found or inactive');
      return NextResponse.json(response, { status: 403 });
    }

    // Get environment from query params
    const { searchParams } = new URL(req.url);
    const environment = searchParams.get('environment');
    const emailParam = searchParams.get('email');

    if (!environment || (environment !== 'dev' && environment !== 'pro')) {
      const response: ApiResponse = {
        success: false,
        error: 'El parámetro "environment" es requerido y debe ser "dev" o "pro"',
        code: 'VALIDATION_ERROR'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Determine which email to use
    // Handle legacy users with 'role' field instead of 'roles'
    // @ts-ignore - handle legacy field
    const roles = user.roles || (user.role ? [user.role] : []);
    
    let targetEmail: string;

    // If email param is provided and user is admin or teacher, use that email
    // Otherwise, use the authenticated user's email
    if (emailParam && (roles.includes('admin') || roles.includes('teacher'))) {
      targetEmail = emailParam;
    } else {
      // Students can only get their own global configs
      if (!roles.includes('student')) {
        const response: ApiResponse = {
          success: false,
          error: 'Debes tener el rol de estudiante para acceder a este endpoint sin especificar email',
          code: 'FORBIDDEN'
        };
        return NextResponse.json(response, { status: 403 });
      }
      targetEmail = studentEmail;
    }

    // Get global environment configurations for the target email and environment
    console.log('Fetching configs for email:', targetEmail, 'environment:', environment);
    const configs = await findGlobalEnvConfigsByEmailAndEnvironment(
      targetEmail,
      environment as 'dev' | 'pro' | 'all',
      'global'
    );
    console.log('Configs found:', configs.length);

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

    console.log('Returning success response with', items.length, 'items');
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

    console.error('Error in GET /api/student/env-configs/global:', error);
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

