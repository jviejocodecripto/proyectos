import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import {
  findProjectById,
  updateProject,
  deleteProject
} from '@/lib/db/projects';
import { updateProjectSchema, getFirstError } from '@/lib/utils/validation';
import { convertProjectToDTO } from '@/types';
import { z } from 'zod';
import type { ApiResponse, ProjectDTO } from '@/types';

/**
 * GET /api/projects/:id
 * Get project by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await requireAuth();

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

    // Check permissions
    // Students can only view their own projects
    // Teachers and admins can view all projects
    if (
      user.role === 'student' &&
      project.studentEmail !== user.email
    ) {
      const response: ApiResponse = {
        success: false,
        error: 'No tienes permiso para ver este proyecto',
        code: 'FORBIDDEN'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Convert to DTO
    const projectDTO = convertProjectToDTO(project);

    // Return success response
    const response: ApiResponse<ProjectDTO> = {
      success: true,
      data: projectDTO
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

    // Handle other errors
    console.error('Error in GET /api/projects/:id:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PATCH /api/projects/:id
 * Update project (students can only update their own before evaluation, teachers and admins can update any)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await requireAuth();

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

    // Check permissions based on role
    if (user.role === 'student') {
      // Students can only update their own projects
      if (project.studentEmail !== user.email) {
        const response: ApiResponse = {
          success: false,
          error: 'No tienes permiso para editar este proyecto',
          code: 'FORBIDDEN'
        };
        return NextResponse.json(response, { status: 403 });
      }

      // Students cannot edit evaluated projects
      if (project.status === 'evaluated') {
        const response: ApiResponse = {
          success: false,
          error: 'No puedes editar un proyecto que ya ha sido evaluado',
          code: 'PROJECT_EVALUATED'
        };
        return NextResponse.json(response, { status: 400 });
      }
    }
    // Teachers and admins can edit any project without restrictions

    // Parse and validate request body
    const body = await req.json();
    const validatedData = updateProjectSchema.parse(body);

    // Update project
    const updated = await updateProject(id, validatedData);

    if (!updated) {
      const response: ApiResponse = {
        success: false,
        error: 'Error al actualizar el proyecto',
        code: 'UPDATE_ERROR'
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
      message: 'Proyecto actualizado correctamente'
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
    console.error('Error in PATCH /api/projects/:id:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/projects/:id
 * Delete project (students can only delete their own before evaluation, teachers and admins can delete any)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await requireAuth();

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

    // Check permissions based on role
    if (user.role === 'student') {
      // Students can only delete their own projects
      if (project.studentEmail !== user.email) {
        const response: ApiResponse = {
          success: false,
          error: 'No tienes permiso para eliminar este proyecto',
          code: 'FORBIDDEN'
        };
        return NextResponse.json(response, { status: 403 });
      }

      // Students cannot delete evaluated projects
      if (project.status === 'evaluated') {
        const response: ApiResponse = {
          success: false,
          error: 'No puedes eliminar un proyecto que ya ha sido evaluado',
          code: 'PROJECT_EVALUATED'
        };
        return NextResponse.json(response, { status: 400 });
      }
    }
    // Teachers and admins can delete any project without restrictions

    // Delete project
    const deleted = await deleteProject(id);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Error al eliminar el proyecto',
        code: 'DELETE_ERROR'
      };
      return NextResponse.json(response, { status: 500 });
    }

    // Return success response
    const response: ApiResponse = {
      success: true,
      message: 'Proyecto eliminado correctamente'
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

    // Handle other errors
    console.error('Error in DELETE /api/projects/:id:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
