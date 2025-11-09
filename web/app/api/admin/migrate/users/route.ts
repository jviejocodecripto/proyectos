import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { getCollection } from '@/lib/db/mongodb';
import type { ApiResponse } from '@/types';

/**
 * POST /api/admin/migrate/users
 * Migrate users from single 'role' field to 'roles' array
 */
export async function POST(req: NextRequest) {
  try {
    // Require admin role
    await requireRole(['admin']);

    const collection = await getCollection('users');

    // Find all users with 'role' field (legacy format)
    const legacyUsers = await collection
      .find({ role: { $exists: true } })
      .toArray();

    let migratedCount = 0;
    let errorCount = 0;

    for (const user of legacyUsers) {
      try {
        // @ts-ignore - accessing legacy field
        const legacyRole = user.role;

        // Update to new format
        await collection.updateOne(
          { _id: user._id },
          {
            $set: {
              roles: [legacyRole],
              updatedAt: new Date()
            },
            $unset: { role: '' }
          }
        );

        migratedCount++;
      } catch (err) {
        console.error(`Error migrating user ${user.email}:`, err);
        errorCount++;
      }
    }

    const response: ApiResponse = {
      success: true,
      message: `Migración completada. ${migratedCount} usuarios migrados, ${errorCount} errores.`,
      data: {
        total: legacyUsers.length,
        migrated: migratedCount,
        errors: errorCount
      }
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

    // Handle other errors
    console.error('Error in POST /api/admin/migrate/users:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
