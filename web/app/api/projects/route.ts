import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createProject, findProjects } from '@/lib/db/projects';
import { createProjectSchema, createProjectAsTeacherSchema, getFirstError } from '@/lib/utils/validation';
import { convertProjectToDTO } from '@/types';
import { z } from 'zod';
import type { ApiResponse, ProjectDTO, PaginatedResponse } from '@/types';

/**
 * GET /api/projects
 * List projects (filtered by user role)
 */
export async function GET(req: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();

    // Get query params
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;

    // Build query based on role
    const queryParams: any = { page, limit };

    // Students can only see their own projects
    const isStudent = user.roles.includes('student') &&
                      !user.roles.includes('teacher') &&
                      !user.roles.includes('admin');

    if (isStudent) {
      queryParams.studentEmail = user.email;
    }

    if (status) {
      queryParams.status = status;
    }

    // Get projects from database
    const result = await findProjects(queryParams);

    // Convert to DTOs
    const projects = result.items.map(convertProjectToDTO);

    // Return response
    const response: ApiResponse<PaginatedResponse<ProjectDTO>> = {
      success: true,
      data: {
        items: projects,
        pagination: result.pagination
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

    // Handle other errors
    console.error('Error in GET /api/projects:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/projects
 * Create new project (student, teacher, or admin)
 */
export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();

    // Parse request body
    const body = await req.json();
    console.log('POST /api/projects - Body received:', JSON.stringify(body, null, 2));

    // Determine student email and validate based on role
    let studentEmail: string;
    let validatedData: any;

    const isStudent = user.roles.includes('student') &&
                      !user.roles.includes('teacher') &&
                      !user.roles.includes('admin');
    const isTeacherOrAdmin = user.roles.includes('teacher') || user.roles.includes('admin');

    if (isStudent) {
      // Students create projects for themselves
      validatedData = createProjectSchema.parse(body);
      studentEmail = user.email;
    } else if (isTeacherOrAdmin) {
      // Teachers and admins must specify student email
      validatedData = createProjectAsTeacherSchema.parse(body);
      studentEmail = validatedData.studentEmail;

      // Remove studentEmail from project data
      const { studentEmail: _, ...projectData } = validatedData;
      validatedData = projectData;
    } else {
      const response: ApiResponse = {
        success: false,
        error: 'No tienes permiso para crear proyectos',
        code: 'FORBIDDEN'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Create project
    const project = await createProject(studentEmail, validatedData);

    // Convert to DTO
    const projectDTO = convertProjectToDTO(project);

    // Return success response
    const response: ApiResponse<ProjectDTO> = {
      success: true,
      data: projectDTO,
      message: 'Proyecto creado correctamente'
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

    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.error('Validation error details:', JSON.stringify(error.issues, null, 2));
      const firstIssue = error.issues[0];
      const fieldPath = firstIssue.path.join('.');
      const errorMessage = fieldPath ? `${fieldPath}: ${firstIssue.message}` : firstIssue.message;
      
      const response: ApiResponse = {
        success: false,
        error: errorMessage,
        code: 'VALIDATION_ERROR'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle other errors
    console.error('Error in POST /api/projects:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
