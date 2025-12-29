import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getEmailFromRequest } from '@/lib/auth/session';
import { extractTokenFromHeader, verifyStudentToken } from '@/lib/auth/jwt';
import { createProject, findProjects } from '@/lib/db/projects';
import { createProjectSchema, createProjectAsTeacherSchema, getFirstError } from '@/lib/utils/validation';
import { findUserByEmail } from '@/lib/db/users';
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

    // Students can only see their own projects (even if they have other roles)
    // If user has student role, filter by their email
    if (user.roles.includes('student')) {
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
    // Get email from JWT token or session
    let userEmail: string | null = null;
    
    // Try JWT token first
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = extractTokenFromHeader(authHeader);
      if (token) {
        try {
          const payload = await verifyStudentToken(token);
          userEmail = payload.email;
        } catch (error: any) {
          // JWT verification failed, try session
          try {
            const user = await requireAuth();
            userEmail = user.email;
          } catch (sessionError: any) {
            // Both failed
            const response: ApiResponse = {
              success: false,
              error: 'No autenticado. Proporciona un token JWT válido en el header Authorization o inicia sesión',
              code: 'UNAUTHORIZED'
            };
            return NextResponse.json(response, { status: 401 });
          }
        }
      } else {
        // No token in header, try session
        try {
          const user = await requireAuth();
          userEmail = user.email;
        } catch (sessionError: any) {
          const response: ApiResponse = {
            success: false,
            error: 'No autenticado',
            code: 'UNAUTHORIZED'
          };
          return NextResponse.json(response, { status: 401 });
        }
      }
    } else {
      // No Authorization header, try session
      try {
        const user = await requireAuth();
        userEmail = user.email;
      } catch (sessionError: any) {
        const response: ApiResponse = {
          success: false,
          error: 'No autenticado',
          code: 'UNAUTHORIZED'
        };
        return NextResponse.json(response, { status: 401 });
      }
    }

    if (!userEmail) {
      console.error('POST /api/projects - No userEmail found after authentication');
      const response: ApiResponse = {
        success: false,
        error: 'No autenticado - no se pudo obtener el email del usuario',
        code: 'UNAUTHORIZED'
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.log('POST /api/projects - User email:', userEmail);

    // Get user from database to check roles
    const user = await findUserByEmail(userEmail);
    if (!user || !user.isActive) {
      console.error('POST /api/projects - User not found or inactive:', { userEmail, user: user ? { email: user.email, isActive: user.isActive } : null });
      const response: ApiResponse = {
        success: false,
        error: 'Usuario no encontrado o inactivo',
        code: 'USER_NOT_FOUND'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle legacy users with 'role' field instead of 'roles'
    // @ts-ignore - handle legacy field
    const roles = user.roles || (user.role ? [user.role] : []);

    // Parse request body
    const body = await req.json();
    console.log('POST /api/projects - Body received:', JSON.stringify(body, null, 2));

    // Determine student email and validate based on role
    let studentEmail: string;
    let validatedData: any;

    // If user has student role, they create projects for themselves
    // Even if they also have teacher/admin roles, if they have student role, use student flow
    const hasStudentRole = roles.includes('student');
    const isTeacherOrAdmin = roles.includes('teacher') || roles.includes('admin');

    if (hasStudentRole) {
      // Students (or users with student role) create projects for themselves
      validatedData = createProjectSchema.parse(body);
      studentEmail = userEmail;
      console.log('POST /api/projects - Student creating project, studentEmail:', studentEmail, 'roles:', roles);
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

    // Validate studentEmail before creating project
    if (!studentEmail || typeof studentEmail !== 'string') {
      console.error('POST /api/projects - Invalid studentEmail:', { studentEmail, type: typeof studentEmail, userEmail, hasStudentRole, isTeacherOrAdmin, roles });
      const response: ApiResponse = {
        success: false,
        error: `studentEmail inválido: se esperaba string, se recibió ${typeof studentEmail}`,
        code: 'VALIDATION_ERROR'
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log('POST /api/projects - Creating project with studentEmail:', studentEmail, 'data:', JSON.stringify(validatedData, null, 2));

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
