import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { findUserByEmail, updateUserRoles } from '@/lib/db/users';
import { sendWelcomeEmail } from '@/lib/email/mailer';
import { convertUserToDTO } from '@/types';
import { updateUserRolesSchema, getFirstError } from '@/lib/utils/validation';
import { z } from 'zod';
import type { ApiResponse, UserDTO } from '@/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Get base URL from request headers
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;

    // Require admin role
    await requireRole(['admin']);

    // Get email from params
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);

    // Get and validate request body
    const body = await req.json();
    const { roles } = updateUserRolesSchema.parse(body);

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

    // Check if roles are already assigned
    const rolesEqual = JSON.stringify(user.roles.sort()) === JSON.stringify(roles.sort());
    if (rolesEqual) {
      const response: ApiResponse = {
        success: false,
        error: `El usuario ya tiene los roles asignados`,
        code: 'ROLES_ALREADY_ASSIGNED'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Update roles
    const updated = await updateUserRoles(decodedEmail, roles);

    if (!updated) {
      const response: ApiResponse = {
        success: false,
        error: 'Error al actualizar los roles',
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

    // Send welcome email if user changed from pending to active roles with dynamic base URL
    const wasPending = user.roles.includes('pending') && user.roles.length === 1;
    const isNowActive = !roles.includes('pending') || roles.length > 1;

    if (wasPending && isNowActive) {
      try {
        // Send email with primary role (first non-pending role)
        const primaryRole = roles.find(r => r !== 'pending') || roles[0];
        await sendWelcomeEmail(updatedUser.email, updatedUser.name, primaryRole, baseUrl);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Return success response
    const response: ApiResponse<UserDTO> = {
      success: true,
      data: convertUserToDTO(updatedUser),
      message: `Roles actualizados correctamente`
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
    console.error('Error in PATCH /api/admin/users/:email/role:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
