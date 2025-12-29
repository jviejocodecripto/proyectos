'use client';

import Link from 'next/link';
import type { ProjectDTO } from '@/types';

interface ProjectCardProps {
  project: ProjectDTO;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  basePath?: string;
  userRole?: 'student' | 'teacher' | 'admin';
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    color: 'bg-gray-100 text-gray-800',
    icon: '⏳'
  },
  submitted: {
    label: 'Entregado',
    color: 'bg-blue-100 text-blue-800',
    icon: '📝'
  },
  evaluated: {
    label: 'Evaluado',
    color: 'bg-green-100 text-green-800',
    icon: '✅'
  }
};

export default function ProjectCard({
  project,
  onDelete,
  showActions = true,
  basePath = '/student/projects',
  userRole = 'student'
}: ProjectCardProps) {
  const statusConfig = STATUS_CONFIG[project.status];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRepositoryName = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1] || url;
  };

  const hasEvaluations =
    project.evaluations?.videoDemo || project.evaluations?.repository;

  const getAverageScore = (): number | null => {
    const scores: number[] = [];
    if (project.evaluations?.videoDemo?.score) {
      scores.push(project.evaluations.videoDemo.score);
    }
    if (project.evaluations?.repository?.score) {
      scores.push(project.evaluations.repository.score);
    }
    return scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;
  };

  const averageScore = getAverageScore();

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition border border-gray-200">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {project.name}
              </h3>
              <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                ID: {project._id}
              </span>
            </div>
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                  clipRule="evenodd"
                />
              </svg>
              {getRepositoryName(project.repositoryUrl)}
            </a>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}
          >
            <span className="mr-1">{statusConfig.icon}</span>
            {statusConfig.label}
          </span>
        </div>

        {/* Submission Date */}
        <div className="flex items-center text-sm text-gray-600 mb-4">
          <svg
            className="w-4 h-4 mr-2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>Fecha de entrega: {formatDate(project.submissionDate)}</span>
        </div>

        {/* Evaluations Summary */}
        {hasEvaluations && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-green-900">
                  Evaluado
                </span>
              </div>
              {averageScore !== null && (
                <span className="text-lg font-bold text-green-900">
                  {averageScore.toFixed(1)}/10
                </span>
              )}
            </div>
            <div className="mt-2 text-xs text-green-800 space-y-1">
              {project.evaluations?.videoDemo && (
                <div className="flex justify-between">
                  <span>• Video Demo:</span>
                  <span className="font-medium">
                    {project.evaluations.videoDemo.score}/10
                  </span>
                </div>
              )}
              {project.evaluations?.repository && (
                <div className="flex justify-between">
                  <span>• Repositorio:</span>
                  <span className="font-medium">
                    {project.evaluations.repository.score}/10
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <Link
              href={`${basePath}/${project._id}`}
              className="flex-1 text-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
            >
              Ver Detalles
            </Link>
            {/* Teachers and admins can always edit, students only if not evaluated */}
            {(userRole === 'teacher' || userRole === 'admin' || project.status !== 'evaluated') && (
              <>
                <Link
                  href={`${basePath}/${project._id}/edit`}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  Editar
                </Link>
                {onDelete && (
                  <button
                    onClick={() => onDelete(project._id)}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition"
                  >
                    Eliminar
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
