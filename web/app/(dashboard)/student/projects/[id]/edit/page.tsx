'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProjectForm from '@/components/projects/ProjectForm';
import type { ProjectDTO } from '@/types';

export default function EditProjectPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
    null
  );

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (resolvedParams) {
      fetchProject();
    }
  }, [resolvedParams]);

  const fetchProject = async () => {
    if (!resolvedParams) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${resolvedParams.id}`);

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (response.status === 404) {
          router.push('/student/projects');
          return;
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Error al cargar proyecto');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar proyecto');
      }

      if (data.success) {
        // Check if project can be edited
        if (data.data.status === 'evaluated') {
          setError('Este proyecto ya ha sido evaluado y no puede editarse');
          setTimeout(() => {
            router.push('/student/projects');
          }, 3000);
          return;
        }
        setProject(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Cargando proyecto...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg
              className="w-6 h-6 text-red-600 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Editar Proyecto</h1>
        <p className="mt-1 text-sm text-gray-600">
          Actualiza la información de tu proyecto
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <ProjectForm mode="edit" project={project} />
      </div>
    </div>
  );
}
