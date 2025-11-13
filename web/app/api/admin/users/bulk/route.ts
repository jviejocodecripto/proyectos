import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { findUserByEmail, createUserWithRoles } from '@/lib/db/users';
import type { ApiResponse } from '@/types';

interface BulkResult {
  email: string;
  name: string;
  status: 'created' | 'exists' | 'error';
  message?: string;
}

/**
 * POST /api/admin/users/bulk
 * Create multiple students at once from text input
 */
export async function POST(req: NextRequest) {
  try {
    // Require admin role
    await requireRole(['admin']);

    // Get request body
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'Texto es requerido',
        code: 'VALIDATION_ERROR'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Parse lines
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'No se encontraron líneas válidas',
        code: 'VALIDATION_ERROR'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const results: BulkResult[] = [];

    // Process each line
    for (const line of lines) {
      try {
        // Parse line: "email" or "email Name Surname"
        const parts = line.split(/\s+/);
        const email = parts[0].toLowerCase().trim();
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          results.push({
            email: line,
            name: '',
            status: 'error',
            message: 'Email inválido'
          });
          continue;
        }

        // Extract name
        let name: string;
        if (parts.length > 1) {
          // Use provided name
          name = parts.slice(1).join(' ').trim();
        } else {
          // Extract name from email (part before @)
          name = email.split('@')[0];
          // Capitalize first letter and replace dots/underscores with spaces
          name = name
            .replace(/[._]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }

        // Check if user already exists
        const existingUser = await findUserByEmail(email);

        if (existingUser) {
          results.push({
            email,
            name,
            status: 'exists',
            message: 'Usuario ya existe'
          });
          continue;
        }

        // Create user with student role
        await createUserWithRoles(email, name, ['student'], true);

        results.push({
          email,
          name,
          status: 'created',
          message: 'Usuario creado correctamente'
        });

      } catch (error) {
        results.push({
          email: line,
          name: '',
          status: 'error',
          message: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // Summary
    const created = results.filter(r => r.status === 'created').length;
    const existing = results.filter(r => r.status === 'exists').length;
    const errors = results.filter(r => r.status === 'error').length;

    const response: ApiResponse = {
      success: true,
      data: {
        results,
        summary: {
          total: lines.length,
          created,
          existing,
          errors
        }
      },
      message: `Procesados ${lines.length} estudiantes: ${created} creados, ${existing} ya existían, ${errors} errores`
    };

    return NextResponse.json(response, { status: 201 });

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

    // Handle other errors
    console.error('Error in POST /api/admin/users/bulk:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

