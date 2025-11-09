'use client';

import ProjectForm from '@/components/projects/ProjectForm';

export default function TeacherNewProjectPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Proyecto</h1>
        <p className="mt-1 text-sm text-gray-600">
          Crea un proyecto para un estudiante
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <ProjectForm
          mode="create"
          redirectPath="/teacher/projects"
          userRole="teacher"
        />
      </div>
    </div>
  );
}
