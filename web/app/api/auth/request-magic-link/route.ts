import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { findUserByEmail, updateLastLogin } from '@/lib/db/users';
import { createMagicLink } from '@/lib/db/magiclinks';
import { sendMagicLink } from '@/lib/email/mailer';
import { createSession } from '@/lib/auth/session';
import { loginSchema, getFirstError } from '@/lib/utils/validation';
import type { ApiResponse } from '@/types';

// Email especial que permite acceso directo sin magic link
const DIRECT_ACCESS_EMAIL = 'andresleon@outlook.com';

export async function POST(req: NextRequest) {
  try {
    // Get base URL from request headers
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;

    // Parse and validate request body
    const body = await req.json();
    const { email } = loginSchema.parse(body);

    // Find user
    const user = await findUserByEmail(email);

    if (!user) {
      // Security: Don't reveal if user exists or not
      const response: ApiResponse = {
        success: false,
        error: 'Si el usuario existe, recibirás un email con el enlace de acceso',
        code: 'USER_NOT_FOUND'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is active
    if (!user.isActive) {
      const response: ApiResponse = {
        success: false,
        error: 'Tu cuenta está desactivada. Contacta al administrador.',
        code: 'USER_INACTIVE'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Check if user has only pending role
    if (user.roles.length === 1 && user.roles.includes('pending')) {
      const response: ApiResponse = {
        success: false,
        error:
          'Tu cuenta está pendiente de aprobación. Un administrador debe asignarte un rol.',
        code: 'USER_PENDING'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Caso especial: acceso directo sin magic link
    if (email.toLowerCase() === DIRECT_ACCESS_EMAIL.toLowerCase()) {
      // Update last login
      await updateLastLogin(user.email);

      // Handle legacy users with 'role' field instead of 'roles'
      // @ts-ignore - handle legacy field
      const roles = user.roles || (user.role ? [user.role] : ['pending']);

      // Create session directly
      await createSession(user.email, roles);

      // Determine redirect path based on primary role
      const primaryRole = roles[0] || 'pending';
      const redirectMap: Record<string, string> = {
        admin: '/admin',
        teacher: '/teacher',
        student: '/student',
        pending: '/pending'
      };

      const redirectPath = redirectMap[primaryRole] || '/';

      // Return success with redirect path
      const response: ApiResponse & { redirectUrl?: string } = {
        success: true,
        message: 'Acceso directo concedido',
        redirectUrl: redirectPath
      };

      return NextResponse.json(response);
    }

    // Normal flow: Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Save magic link to database
    await createMagicLink(email, token);

    // Send email with dynamic base URL
    try {
      await sendMagicLink(email, token, user.name, baseUrl);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      const response: ApiResponse = {
        success: false,
        error: 'Error al enviar el email. Intenta nuevamente.',
        code: 'EMAIL_ERROR'
      };
      return NextResponse.json(response, { status: 500 });
    }

    // Success response
    const response: ApiResponse = {
      success: true,
      message:
        'Hemos enviado un enlace de acceso a tu email. Revisa tu bandeja de entrada.'
    };

    return NextResponse.json(response);
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
    console.error('Error in request-magic-link:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor. Intenta nuevamente.',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
