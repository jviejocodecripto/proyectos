import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { findProjectById, addVideoEvaluation } from '@/lib/db/projects';
import { z } from 'zod';
import { getFirstError } from '@/lib/utils/validation';
import { convertProjectToDTO } from '@/types';
import type { ApiResponse, ProjectDTO } from '@/types';

const videoEvaluationSchema = z.object({
  score: z.number().min(0).max(10),
  comments: z.string().min(10).max(2000)
});

/**
 * POST /api/projects/:id/evaluate/video
 * Evaluate video demo (teacher/admin only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require teacher or admin role
    const user = await requireRole(['teacher', 'admin']);

    // Get project ID from params
    const { id } = await params;

    // Find project
    const project = await findProjectById(id);

    if (!project) {
      const response: ApiResponse = {
        success: false,
        error: 'Proyecto no encontrado',
        code: 'PROJECT_NOT_FOUND'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Parse and validate request body
    const body = await req.json();
    const { score, comments } = videoEvaluationSchema.parse(body);

    // Add video evaluation
    const success = await addVideoEvaluation(id, {
      score,
      comments,
      evaluatedBy: user.email
    });

    if (!success) {
      const response: ApiResponse = {
        success: false,
        error: 'Error al guardar la evaluación',
        code: 'SAVE_ERROR'
      };
      return NextResponse.json(response, { status: 500 });
    }

    // Get updated project
    const updatedProject = await findProjectById(id);

    if (!updatedProject) {
      const response: ApiResponse = {
        success: false,
        error: 'Error al obtener proyecto actualizado',
        code: 'FETCH_ERROR'
      };
      return NextResponse.json(response, { status: 500 });
    }

    // Convert to DTO
    const projectDTO = convertProjectToDTO(updatedProject);

    // Return success response
    const response: ApiResponse<ProjectDTO> = {
      success: true,
      data: projectDTO,
      message: 'Evaluación de video guardada correctamente'
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
        error: 'Solo profesores y administradores pueden evaluar proyectos',
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
    console.error('Error in POST /api/projects/:id/evaluate/video:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
