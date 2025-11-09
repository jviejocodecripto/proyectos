import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import {
  findAllPrompts,
  createPrompt
} from '@/lib/db/prompts';
import { convertPromptToDTO } from '@/types';

// Validation schema for creating prompts
const createPromptSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
  prompt: z.string().min(50, 'El prompt debe tener al menos 50 caracteres').max(10000),
  isActive: z.boolean().default(false)
});

/**
 * GET /api/admin/prompts
 * List all AI prompts (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    // Only admins can manage prompts
    await requireRole(['admin']);

    const prompts = await findAllPrompts();
    const promptDTOs = prompts.map(convertPromptToDTO);

    return NextResponse.json({
      success: true,
      data: promptDTOs
    });
  } catch (error) {
    console.error('Error fetching prompts:', error);

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
      { success: false, error: 'Error al obtener prompts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/prompts
 * Create a new AI prompt (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    // Only admins can create prompts
    const user = await requireRole(['admin']);

    const body = await req.json();
    const validatedData = createPromptSchema.parse(body);

    const prompt = await createPrompt(user.email, validatedData);
    const promptDTO = convertPromptToDTO(prompt);

    return NextResponse.json(
      {
        success: true,
        data: promptDTO,
        message: 'Prompt creado exitosamente'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating prompt:', error);

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
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error al crear prompt' },
      { status: 500 }
    );
  }
}
