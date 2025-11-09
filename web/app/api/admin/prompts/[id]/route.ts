import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import {
  findPromptById,
  updatePrompt,
  deletePrompt
} from '@/lib/db/prompts';
import { convertPromptToDTO } from '@/types';
import { getFirstError } from '@/lib/utils/validation';

// Validation schema for updating prompts
const updatePromptSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  prompt: z.string().min(50).max(10000).optional(),
  isActive: z.boolean().optional()
});

/**
 * PATCH /api/admin/prompts/[id]
 * Update an AI prompt (admin only)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(['admin']);

    const { id } = await params;
    const body = await req.json();
    const validatedData = updatePromptSchema.parse(body);

    // Check if prompt exists
    const existingPrompt = await findPromptById(id);
    if (!existingPrompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt no encontrado' },
        { status: 404 }
      );
    }

    const success = await updatePrompt(id, validatedData);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Error al actualizar prompt' },
        { status: 500 }
      );
    }

    // Fetch updated prompt
    const updatedPrompt = await findPromptById(id);
    if (!updatedPrompt) {
      return NextResponse.json(
        { success: false, error: 'Error al obtener prompt actualizado' },
        { status: 500 }
      );
    }

    const promptDTO = convertPromptToDTO(updatedPrompt);

    return NextResponse.json({
      success: true,
      data: promptDTO,
      message: 'Prompt actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error updating prompt:', error);

    if (error instanceof Error && error.message.includes('No autenticado')) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message.includes('No autorizado')) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: getFirstError(error) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error al actualizar prompt' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/prompts/[id]
 * Delete an AI prompt (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(['admin']);

    const { id } = await params;

    // Check if prompt exists
    const existingPrompt = await findPromptById(id);
    if (!existingPrompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt no encontrado' },
        { status: 404 }
      );
    }

    // Prevent deletion of active prompt
    if (existingPrompt.isActive) {
      return NextResponse.json(
        { success: false, error: 'No puedes eliminar el prompt activo' },
        { status: 400 }
      );
    }

    const success = await deletePrompt(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Error al eliminar prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Prompt eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting prompt:', error);

    if (error instanceof Error && error.message.includes('No autenticado')) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message.includes('No autorizado')) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error al eliminar prompt' },
      { status: 500 }
    );
  }
}
