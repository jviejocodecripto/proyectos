import { NextRequest, NextResponse } from 'next/server';
import { ExpandedGroupSchema } from '@gitbeaker/core';
import { z } from 'zod';
import {
  findGitLabUser,
  findGitLabGroup,
  addProjectMember,
  getGitlabClient
} from '@/lib/gitlab/client';
import { findUserByEmail } from '@/lib/db/users';
import type { ApiResponse } from '@/types';

const forkProjectsSchema = z.object({
  projectIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un proyecto'),
  studentEmails: z.array(z.string().email()).min(1, 'Debe seleccionar al menos un estudiante'),
  subgroup: z.enum(['eth-rust', 'ia4devs'], {
    message: 'El subgrupo debe ser "eth-rust" o "ia4devs"'
  })
});

/**
 * POST /api/projects/fork
 * Fork projects to GitLab subgroup for selected students
 * Requires admin authentication
 */
export async function POST(req: NextRequest) {
  // Parse and validate request body
  const body = await req.json();
  const validatedData = forkProjectsSchema.parse(body);

  const { projectIds, studentEmails, subgroup } = validatedData;
  console.log(projectIds, studentEmails, subgroup);

  // Get students from database
  const students = await Promise.all(
    studentEmails.map(email => findUserByEmail(email))
  );
  console.log(students);

  // Process each project-student combination
  // Note: projectIds are now GitLab project IDs (strings)
  const results: Array<{
    projectId: string;
    projectName: string;
    studentEmail: string;
    studentName: string;
    success: boolean;
    message: string;
    forkUrl?: string;
    forkId: string;
    forkName: string;
    forkPath: string;
    forkPathWithNamespace: string;
    forkWebUrl: string;
  }> = [];

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
  const allGroups = await gitlab.Groups.all({ allAvailable: true,
    search: "codecrypto/eth-rust",
   })
   

  console.log('allGroups: ', allGroups.length);
   const filteredGroups = allGroups.filter((g: { full_path?: string; path?: string }) => 
    g.full_path == 'codecrypto/eth-rust' && !g.full_path?.includes('deletion') );

  console.log('allGroups: ', filteredGroups);
  // Process each selected project (though we'll fork the same template for all)
  for (const projectId of projectIds) {
    const project = await gitlab.Projects.show(projectId);
    // console.log(project);
    for (const student of students) {
      if (!student) continue;
      const gitlabUser = await findGitLabUser(student.email)
      const studentUsername = student.email.split('@')[0];

      console.log('Searching group...', `codecrypto/eth-rust/${studentUsername}`);
      const allGroups2 = await gitlab.Groups.all({ allAvailable: true});
      const filteredGroups2 = allGroups2.filter(
        (g: { full_path?: string; path?: string }) => 
        g.full_path?.includes(`codecrypto/eth-rust/${studentUsername}`) && !g.full_path?.includes('deletion')
      );
      if (filteredGroups2.length == 0) {
         const newGroup = await gitlab.Groups.create(
          `${studentUsername}`,
          `${studentUsername}`,
          {
            parentId: filteredGroups[0]!.id
          }
         );
         filteredGroups2.push(newGroup);
      }
      // Expected fork path
      const expectedForkPath = `${filteredGroups2[0]!.full_path}/${project.name}`;
      let forkedProject;
      let forkAlreadyExists = false;
      console.log('Forking project...', project.id, filteredGroups2[0]!.full_path, project.name, student.email.split('@')[0]);
      try {
        // Try to create the fork 
        forkedProject = await gitlab.Projects.fork(
          project.id, {
          namespace: filteredGroups2[0]!.full_path, // Use group full_path instead of subgroup name
          name: project.name,
          visibility: 'internal',
          description: 'Fork del proyecto ' + project.name
        });
      } catch (forkError) {
        console.error('Error al hacer fork:', forkError);
        forkAlreadyExists = true;
        const existingFork = await gitlab.Projects.show(expectedForkPath);
        forkedProject = existingFork;
      }


      // Validate that we have a valid fork project
      if (!forkedProject || !forkedProject.id) {
        throw new Error(`No se pudo obtener información del fork: ${expectedForkPath}`);
      }

      const forkResult = {
        id: forkedProject.id,
        name: forkedProject.name || project.name,
        path: forkedProject.path || '',
        path_with_namespace: forkedProject.path_with_namespace || expectedForkPath,
        web_url: forkedProject.web_url || `https://gitlab.codecrypto.academy/${expectedForkPath}`
      };

      // Add the student as a member to the forked project with maintainer role
      try {
        console.log('Adding member to fork...');
        await addProjectMember(forkResult.id, gitlabUser.id, 'maintainer');
      } catch (memberError) {
        // Log but don't fail - the fork exists (newly created or already existed)
        console.warn('Error al agregar miembro al fork:', {
          forkId: forkResult.id,
          userId: gitlabUser.id,
          error: memberError instanceof Error ? memberError.message : memberError
        });
      }

      results.push({
        projectId,
        forkId: forkResult.id.toString(),
        forkName: forkResult.name,
        forkPath: forkResult.path,
        forkPathWithNamespace: forkResult.path_with_namespace,
        forkWebUrl: forkResult.web_url,
        projectName: project.name,
        studentEmail: student.email,
        studentName: student.name,
        success: true,
        message: forkAlreadyExists
          ? `Fork ya existía en GitLab, usuario agregado como maintainer`
          : `Fork creado exitosamente en GitLab y usuario agregado como maintainer`,
        forkUrl: forkResult.web_url
      });
    }
  }

  console.log(results);
  return NextResponse.json(results);

}

