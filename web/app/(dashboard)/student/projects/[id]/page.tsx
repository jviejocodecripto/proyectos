'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ProjectDTO } from '@/types';

export default function ProjectDetailsPage({
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
        setProject(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto">
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
            <p className="text-red-800">{error || 'Proyecto no encontrado'}</p>
          </div>
        </div>
      </div>
    );
  }

  const hasEvaluations =
    project.evaluations?.videoDemo || project.evaluations?.repository;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/student/projects"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Volver a proyectos
        </Link>
        {project.status !== 'evaluated' && (
          <Link
            href={`/student/projects/${project._id}/edit`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Editar Proyecto
          </Link>
        )}
      </div>

      {/* Project Info Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {project.name}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Repositorio</p>
              <a
                href={project.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Ver en GitHub
              </a>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Video Demo</p>
              <a
                href={project.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Ver Video
              </a>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Curso</p>
              <p className="text-gray-900 font-medium">{project.course}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Edición</p>
              <p className="text-gray-900 font-medium">{project.edition}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Fecha de entrega</p>
              <p className="text-gray-900 font-medium">
                {formatDate(project.submissionDate)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Estado</p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  project.status === 'evaluated'
                    ? 'bg-green-100 text-green-800'
                    : project.status === 'submitted'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {project.status === 'evaluated'
                  ? '✅ Evaluado'
                  : project.status === 'submitted'
                  ? '📝 Entregado'
                  : '⏳ Pendiente'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Creado el</p>
              <p className="text-gray-900">{formatDate(project.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluations */}
      {hasEvaluations ? (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Evaluaciones</h2>

          {/* Video Demo Evaluation */}
          {project.evaluations?.videoDemo && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Video Demo
                  </h3>
                  <span className="text-3xl font-bold text-blue-600">
                    {project.evaluations.videoDemo.score}/10
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Comentarios</p>
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {project.evaluations.videoDemo.comments}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Evaluado el{' '}
                      {formatDate(project.evaluations.videoDemo.evaluatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Repository Evaluation */}
          {project.evaluations?.repository && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Repositorio
                  </h3>
                  <span className="text-3xl font-bold text-green-600">
                    {project.evaluations.repository.score}/10
                  </span>
                </div>

                {/* Detailed Scores */}
                {(project.evaluations.repository.codeQuality ||
                  project.evaluations.repository.documentation ||
                  project.evaluations.repository.functionality ||
                  project.evaluations.repository.gitUsage) && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {project.evaluations.repository.codeQuality && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">
                          Calidad del Código
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {project.evaluations.repository.codeQuality}/10
                        </p>
                      </div>
                    )}
                    {project.evaluations.repository.documentation && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">
                          Documentación
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {project.evaluations.repository.documentation}/10
                        </p>
                      </div>
                    )}
                    {project.evaluations.repository.functionality && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">
                          Funcionalidad
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {project.evaluations.repository.functionality}/10
                        </p>
                      </div>
                    )}
                    {project.evaluations.repository.gitUsage && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">
                          Uso de Git
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {project.evaluations.repository.gitUsage}/10
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  {project.evaluations.repository.aiAnalysis && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Análisis con IA
                      </p>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {project.evaluations.repository.aiAnalysis}
                        </p>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Comentarios del Profesor
                    </p>
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {project.evaluations.repository.comments}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Evaluado el{' '}
                      {formatDate(project.evaluations.repository.evaluatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg
              className="w-6 h-6 text-yellow-600 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium text-yellow-900">
                Pendiente de evaluación
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                Tu proyecto aún no ha sido evaluado por un profesor.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
