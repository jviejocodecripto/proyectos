import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { findProjectById } from '@/lib/db/projects';
import { analyzeRepository, isAIConfigured } from '@/lib/ai/analyzer';
import type { ApiResponse } from '@/types';

/**
 * POST /api/projects/:id/ai-analysis
 * Perform AI analysis on project repository (teacher/admin only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require teacher or admin role
    await requireRole(['teacher', 'admin']);

    // Check if AI is configured
    if (!isAIConfigured()) {
      const response: ApiResponse = {
        success: false,
        error:
          'Análisis con IA no configurado. Configura ANTHROPIC_API_KEY en las variables de entorno.',
        code: 'AI_NOT_CONFIGURED'
      };
      return NextResponse.json(response, { status: 503 });
    }

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

    // Perform AI analysis
    console.log(`Starting AI analysis for project ${project.name}...`);
    const analysis = await analyzeRepository(
      project.name,
      project.repositoryUrl,
      project.submissionDate
    );

    console.log('AI analysis completed successfully');

    // Return analysis result
    const response: ApiResponse = {
      success: true,
      data: analysis,
      message: 'Análisis completado'
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
        error: 'Solo profesores y administradores pueden usar el análisis con IA',
        code: 'FORBIDDEN'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle other errors
    console.error('Error in POST /api/projects/:id/ai-analysis:', error);
    const response: ApiResponse = {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al realizar el análisis',
      code: 'ANALYSIS_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
