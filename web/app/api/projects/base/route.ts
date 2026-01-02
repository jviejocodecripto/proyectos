import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getGitlabClient } from '@/lib/gitlab/client';
import type { ApiResponse } from '@/types';

/**
 * GET /api/projects/base
 * Get projects from GitLab that contain "eth-ejercicios" or "rust-ejercicios"
 * Requires admin authentication
 */
export async function GET() {
  try {
    // Require admin authentication
    await requireAuth();

    // Get GitLab client
    const gitlab = getGitlabClient();
    if (!gitlab) {
      const response: ApiResponse = {
        success: false,
        error: 'GITLAB_TOKEN_ROOT no configurado',
        code: 'GITLAB_NOT_CONFIGURED'
      };
      return NextResponse.json(response, { status: 500 });
    }

    // Get GitLab URL from environment
    const GITLAB_URL = process.env.GITLAB_URL || 'https://gitlab.codecrypto.academy';

    // Get all projects from GitLab
    const projects = await gitlab.Projects.all({});

    // Filter projects to only include those with "eth-ejercicios" or "rust-ejercicios" in path_with_namespace
    const filteredProjects = projects
      .filter((project: { path_with_namespace?: string }) =>
       ( project.path_with_namespace?.includes('/eth-ejercicios/') ||
        project.path_with_namespace?.includes('/rust-ejercicios/') ) &&
        !project.path_with_namespace?.includes('deletion') 
      )
      .map((project: {
        id: number;
        name?: string;
        path_with_namespace?: string;
      }) => ({
        _id: project.id.toString(), // Use GitLab ID as _id (string)
        name: project.name || '',
        repositoryUrl: `${GITLAB_URL}/${project.path_with_namespace || ''}`
      })).sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    // Return response in the format expected by the frontend
    const response: ApiResponse<{ items: typeof filteredProjects; total: number }> = {
      success: true,
      data: {
        items: filteredProjects,
        total: filteredProjects.length
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
    console.error('Error in GET /api/projects/base:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

