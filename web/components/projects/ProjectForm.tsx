'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectDTO, UserDTO } from '@/types';

interface ProjectFormProps {
  project?: ProjectDTO;
  mode: 'create' | 'edit';
  redirectPath?: string;
  userRole?: 'student' | 'teacher' | 'admin';
  userEmail?: string;
}

export default function ProjectForm({
  project,
  mode,
  redirectPath = '/student/projects',
  userRole = 'student',
  userEmail = ''
}: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<UserDTO[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [formData, setFormData] = useState({
    name: project?.name || '',
    repositoryUrl: project?.repositoryUrl || '',
    videoUrl: project?.videoUrl || '',
    course: project?.course || '',
    edition: project?.edition || '',
    studentEmail: project?.studentEmail || userEmail
  });

  // Fetch students list if user is teacher/admin creating a project
  useEffect(() => {
    if ((userRole === 'teacher' || userRole === 'admin') && mode === 'create') {
      fetchStudents();
    }
  }, [userRole, mode]);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await fetch('/api/students');
      const data = await response.json();

      if (data.success) {
        setStudents(data.data);
      } else {
        console.error('Error fetching students:', data.error);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const validateGitHubUrl = (url: string): boolean => {
    // Permite URLs de GitHub con o sin subdirectorios
    // Ejemplos válidos:
    // - https://github.com/usuario/repositorio
    // - https://github.com/usuario/repositorio/
    // - https://github.com/usuario/repositorio/tree/main/subdir
    // - https://github.com/usuario/repositorio/blob/main/subdir/archivo
    const githubPattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(\/.*)?$/;
    return githubPattern.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('El nombre del proyecto es requerido');
      return;
    }

    if (!formData.repositoryUrl.trim()) {
      setError('La URL del repositorio es requerida');
      return;
    }

    if (!validateGitHubUrl(formData.repositoryUrl)) {
      setError(
        'URL de GitHub inválida. Debe ser del formato: https://github.com/usuario/repositorio (con subdirectorio opcional)'
      );
      return;
    }

    if (!formData.course.trim()) {
      setError('El curso es requerido');
      return;
    }

    if (!formData.edition.trim()) {
      setError('La edición es requerida');
      return;
    }

    // Teachers and admins must specify student email when creating
    if ((userRole === 'teacher' || userRole === 'admin') && mode === 'create' && !formData.studentEmail.trim()) {
      setError('El email del estudiante es requerido');
      return;
    }

    if ((userRole === 'teacher' || userRole === 'admin') && mode === 'create' && formData.studentEmail && !formData.studentEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('El email del estudiante no es válido');
      return;
    }

    setLoading(true);

    try {
      const url =
        mode === 'create'
          ? '/api/projects'
          : `/api/projects/${project?._id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      // Prepare data to send
      const dataToSend: {
        name: string;
        repositoryUrl: string;
        videoUrl: string;
        course: string;
        edition: string;
        studentEmail?: string;
      } = {
        name: formData.name,
        repositoryUrl: formData.repositoryUrl,
        videoUrl: formData.videoUrl,
        course: formData.course,
        edition: formData.edition
      };

      // Include studentEmail ONLY for teachers/admins when creating
      // For students, the API uses the authenticated user's email automatically
      if ((userRole === 'teacher' || userRole === 'admin') && mode === 'create') {
        dataToSend.studentEmail = formData.studentEmail;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      // Verificar si la respuesta tiene contenido antes de parsear JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(
          'Respuesta inválida del servidor. Por favor, intenta de nuevo.'
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar el proyecto');
      }

      // Redirect to projects list
      router.push(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(redirectPath);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-600 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Project Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Nombre del Proyecto *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Mi Proyecto Awesome"
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          maxLength={200}
        />
        <p className="mt-1 text-xs text-gray-500">
          {formData.name.length}/200 caracteres
        </p>
      </div>

      {/* Student Email - Different display based on role */}
      {mode === 'create' && (
        <div>
          <label
            htmlFor="studentEmail"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {userRole === 'student' ? 'Tu Email' : 'Estudiante'} *
          </label>

          {/* Student View - Read-only email */}
          {userRole === 'student' && (
            <>
              <div className="w-full px-4 py-2 border-2 border-green-200 rounded-lg bg-green-50 text-gray-700 font-medium">
                {userEmail || formData.studentEmail}
              </div>
              <p className="mt-1 text-xs text-green-700 flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Este proyecto se creará a tu nombre
              </p>
            </>
          )}

          {/* Teacher/Admin View - Dropdown selector */}
          {(userRole === 'teacher' || userRole === 'admin') && (
            <>
              {loadingStudents ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 flex items-center">
                  <svg
                    className="animate-spin h-4 w-4 text-blue-600 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Cargando estudiantes...
                </div>
              ) : (
                <select
                  id="studentEmail"
                  value={formData.studentEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, studentEmail: e.target.value }))
                  }
                  disabled={loading || loadingStudents}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">Selecciona un estudiante...</option>
                  {students.map((student) => (
                    <option key={student.email} value={student.email}>
                      {student.name} ({student.email})
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {students.length > 0
                  ? `${students.length} estudiante${students.length > 1 ? 's' : ''} disponible${students.length > 1 ? 's' : ''}`
                  : 'Selecciona el estudiante al que pertenece este proyecto'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Repository URL */}
      <div>
        <label
          htmlFor="repositoryUrl"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          URL del Repositorio GitHub *
        </label>
        <input
          id="repositoryUrl"
          type="url"
          value={formData.repositoryUrl}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              repositoryUrl: e.target.value
            }))
          }
          placeholder="https://github.com/usuario/repositorio o https://github.com/usuario/repositorio/tree/main/subdir"
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500">
          Ejemplo: https://github.com/usuario/mi-proyecto o https://github.com/usuario/repositorio/tree/main/subdir
        </p>
        {formData.repositoryUrl &&
          !validateGitHubUrl(formData.repositoryUrl) && (
            <p className="mt-1 text-xs text-red-600">
              ⚠️ La URL no parece ser un repositorio de GitHub válido
            </p>
          )}
      </div>

      {/* Video URL */}
      <div>
        <label
          htmlFor="videoUrl"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          URL del Video Demo
        </label>
        <input
          id="videoUrl"
          type="url"
          value={formData.videoUrl}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              videoUrl: e.target.value
            }))
          }
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500">
          Opcional: URL del video demo del proyecto
        </p>
      </div>

      {/* Course and Edition in a row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Course */}
        <div>
          <label
            htmlFor="course"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Curso *
          </label>
          <input
            id="course"
            type="text"
            value={formData.course}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, course: e.target.value }))
            }
            placeholder="Ej: Desarrollo Web Full Stack"
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            maxLength={100}
          />
        </div>

        {/* Edition */}
        <div>
          <label
            htmlFor="edition"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Edición *
          </label>
          <input
            id="edition"
            type="text"
            value={formData.edition}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, edition: e.target.value }))
            }
            placeholder="Ej: 2024-2025"
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            maxLength={50}
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg
                  className="w-5 h-5 text-blue-600 mr-3 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Requisitos del proyecto:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>El repositorio debe ser público o accesible para evaluación</li>
              <li>Debe incluir un archivo README.md con documentación</li>
              <li>El video debe ser accesible públicamente o con enlace compartido</li>
              <li>
                Una vez evaluado, no podrás editar ni eliminar el proyecto
              </li>
              <li>
                La fecha de entrega se registra automáticamente al crear el proyecto
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Guardando...
            </span>
          ) : mode === 'create' ? (
            'Crear Proyecto'
          ) : (
            'Guardar Cambios'
          )}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
