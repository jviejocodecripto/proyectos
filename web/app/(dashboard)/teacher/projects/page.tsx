'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ProjectDTO } from '@/types';

interface StudentInfo {
  email: string;
  name: string;
}

export default function TeacherProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [students, setStudents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'evaluated'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [editionFilter, setEditionFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchProjects();
    fetchStudents();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/projects');

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Error al cargar proyectos');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar proyectos');
      }

      if (data.success) {
        setProjects(data.data.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const studentsMap: Record<string, string> = {};
          data.data.forEach((student: StudentInfo) => {
            studentsMap[student.email] = student.name;
          });
          setStudents(studentsMap);
        }
      }
    } catch (err) {
      // Silently fail - students info is optional
      console.error('Error fetching students:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        '¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE'
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Error al eliminar proyecto');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar proyecto');
      }

      setSuccessMessage(data.message || 'Proyecto eliminado correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh projects list
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Get unique courses and editions
  const uniqueCourses = useMemo(() => {
    const courses = new Set(projects.map(p => p.course));
    return Array.from(courses).sort();
  }, [projects]);

  const uniqueEditions = useMemo(() => {
    const editions = new Set(projects.map(p => p.edition));
    return Array.from(editions).sort();
  }, [projects]);

  // Get unique months from submission dates
  const uniqueMonths = useMemo(() => {
    const months = new Set(
      projects.map(p => {
        const date = new Date(p.submissionDate);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      })
    );
    return Array.from(months).sort().reverse();
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Status filter
      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false;
      }

      // Course filter
      if (courseFilter !== 'all' && project.course !== courseFilter) {
        return false;
      }

      // Edition filter
      if (editionFilter !== 'all' && project.edition !== editionFilter) {
        return false;
      }

      // Month filter
      if (monthFilter !== 'all') {
        const projectDate = new Date(project.submissionDate);
        const projectMonth = `${projectDate.getFullYear()}-${String(projectDate.getMonth() + 1).padStart(2, '0')}`;
        if (projectMonth !== monthFilter) {
          return false;
        }
      }

      // Search filter (by email or name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesEmail = project.studentEmail.toLowerCase().includes(query);
        const matchesName = project.name.toLowerCase().includes(query);
        const studentName = students[project.studentEmail]?.toLowerCase() || '';
        const matchesStudentName = studentName.includes(query);
        return matchesEmail || matchesName || matchesStudentName;
      }

      return true;
    });
  }, [projects, statusFilter, courseFilter, editionFilter, monthFilter, searchQuery, students]);

  const submittedCount = projects.filter((p) => p.status === 'submitted').length;
  const evaluatedCount = projects.filter((p) => p.status === 'evaluated').length;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Cargando proyectos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de Proyectos
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Administra y evalúa los proyectos de los estudiantes
          </p>
        </div>
        <Link
          href="/teacher/projects/new"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Nuevo Proyecto
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total de Proyectos</p>
              <p className="text-3xl font-bold text-gray-900">
                {projects.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pendientes</p>
              <p className="text-3xl font-bold text-orange-600">
                {submittedCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Evaluados</p>
              <p className="text-3xl font-bold text-green-600">
                {evaluatedCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
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
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por email o nombre..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Course Filter */}
          <div>
            <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
              Curso
            </label>
            <select
              id="course"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los cursos</option>
              {uniqueCourses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>

          {/* Edition Filter */}
          <div>
            <label htmlFor="edition" className="block text-sm font-medium text-gray-700 mb-1">
              Edición
            </label>
            <select
              id="edition"
              value={editionFilter}
              onChange={(e) => setEditionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las ediciones</option>
              {uniqueEditions.map(edition => (
                <option key={edition} value={edition}>{edition}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div>
            <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
              Mes de Entrega
            </label>
            <select
              id="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los meses</option>
              {uniqueMonths.map(month => {
                const [year, monthNum] = month.split('-');
                const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                return (
                  <option key={month} value={month}>
                    {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'submitted' | 'evaluated')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos ({projects.length})</option>
              <option value="submitted">Pendientes ({submittedCount})</option>
              <option value="evaluated">Evaluados ({evaluatedCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-green-600 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

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

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron proyectos
            </h3>
            <p className="text-gray-600">
              {searchQuery ? 'Intenta con otros criterios de búsqueda.' : 'No hay proyectos con los filtros seleccionados.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre del Proyecto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alumno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Curso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Edición
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enlaces
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProjects.map((project) => (
                  <tr key={project._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {project.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{project.studentEmail}</div>
                      {students[project.studentEmail] && (
                        <div className="text-sm text-gray-500 mt-1">
                          {students[project.studentEmail]}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{project.course}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{project.edition}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(project.submissionDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <a
                          href={project.repositoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Ver repositorio"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </a>
                        {project.videoUrl && (
                          <a
                            href={project.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-600 hover:text-red-800"
                            title="Ver video"
                          >
                            <svg
                              className="w-5 h-5"
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
                        </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/teacher/projects/${project._id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/teacher/projects/${project._id}/evaluate`}
                          className="text-purple-600 hover:text-purple-900"
                          title={project.status === 'evaluated' ? 'Ver evaluación' : 'Evaluar'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </Link>
                        <Link
                          href={`/teacher/projects/${project._id}/edit`}
                          className="text-gray-600 hover:text-gray-900"
                          title="Editar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDelete(project._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
