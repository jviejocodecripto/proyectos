'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Project {
  _id: string;
  name: string;
  repositoryUrl: string;
}

interface Student {
  email: string;
  name: string;
}

export default function ForkProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [projectSearch, setProjectSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [subgroup, setSubgroup] = useState<'eth-rust' | 'ia4devs'>('eth-rust');
  const [loading, setLoading] = useState(true);
  const [forking, setForking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [forkResults, setForkResults] = useState<any[]>([]);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects/base');
      const data = await response.json();

      if (data.success) {
        setProjects(data.data.items || []);
      } else {
        setError('Error al cargar proyectos');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch students
  const fetchStudents = useCallback(async (search: string = '') => {
    try {
      const url = search
        ? `/api/students/list?search=${encodeURIComponent(search)}`
        : '/api/students/list';
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setStudents(data.data.items || []);
      } else {
        setError('Error al cargar estudiantes');
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Error al cargar estudiantes');
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchStudents();
  }, [fetchProjects, fetchStudents]);

  // Filter projects
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    project.repositoryUrl.toLowerCase().includes(projectSearch.toLowerCase())
  );

  // Filter students
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Toggle project selection
  const toggleProject = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  // Toggle student selection
  const toggleStudent = (email: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedStudents(newSelected);
  };

  // Handle fork
  const handleFork = async () => {
    if (selectedProjects.size === 0) {
      setError('Debe seleccionar al menos un proyecto');
      return;
    }

    if (selectedStudents.size === 0) {
      setError('Debe seleccionar al menos un estudiante');
      return;
    }

    setForking(true);
    setError(null);
    setSuccess(null);
    setForkResults([]);

    try {
      const response = await fetch('/api/projects/fork', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectIds: Array.from(selectedProjects),
          studentEmails: Array.from(selectedStudents),
          subgroup
        })
      });

      const data = await response.json();

      // Check if it's an array (direct results) or an object with success/data structure
      if (Array.isArray(data)) {
        setSuccess(`Fork completado: ${data.length} operación(es) procesada(s)`);
        setForkResults(data);
      } else if (data.success && data.data && Array.isArray(data.data)) {
        setSuccess(`Fork completado: ${data.data.length} operación(es) procesada(s)`);
        setForkResults(data.data);
      } else if (data.success && Array.isArray(data.data?.results)) {
        setSuccess(`Fork completado: ${data.data.results.length} operación(es) procesada(s)`);
        setForkResults(data.data.results);
      } else {
        setError(data.error || 'Error al hacer fork');
      }
    } catch (err: any) {
      console.error('Error forking projects:', err);
      setError('Error al hacer fork: ' + (err.message || 'Error desconocido'));
    } finally {
      setForking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Fork de Proyectos</h1>
        <p className="text-gray-600 mt-2">
          Selecciona proyectos base y estudiantes para crear forks en GitLab
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Proyectos Base</h2>
          
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar proyectos..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Projects List */}
          <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {projectSearch ? 'No se encontraron proyectos' : 'No hay proyectos disponibles'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredProjects.map((project) => (
                  <label
                    key={project._id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.has(project._id)}
                      onChange={() => toggleProject(project._id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">{project.name}</p>
                      <p className="text-xs text-gray-500 truncate">{project.repositoryUrl}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Selected Count */}
          {selectedProjects.size > 0 && (
            <div className="mt-4 text-sm text-blue-600">
              {selectedProjects.size} proyecto(s) seleccionado(s)
            </div>
          )}
        </div>

        {/* Students Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Estudiantes</h2>
          
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar estudiantes..."
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                fetchStudents(e.target.value);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Students List */}
          <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {studentSearch ? 'No se encontraron estudiantes' : 'No hay estudiantes disponibles'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <label
                    key={student.email}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.email)}
                      onChange={() => toggleStudent(student.email)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-500">{student.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Selected Count */}
          {selectedStudents.size > 0 && (
            <div className="mt-4 text-sm text-blue-600">
              {selectedStudents.size} estudiante(s) seleccionado(s)
            </div>
          )}
        </div>
      </div>

      {/* Selected Summary */}
      {(selectedProjects.size > 0 || selectedStudents.size > 0) && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Resumen de Selección</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Selected Projects */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">
                  Proyectos Seleccionados ({selectedProjects.size})
                </p>
                {selectedProjects.size > 0 && (
                  <button
                    onClick={() => setSelectedProjects(new Set())}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Limpiar todos
                  </button>
                )}
              </div>
              {selectedProjects.size === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay proyectos seleccionados</p>
              ) : (
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {Array.from(selectedProjects).map((projectId) => {
                      const project = projects.find(p => p._id === projectId);
                      if (!project) return null;
                      return (
                        <div
                          key={projectId}
                          className="p-3 hover:bg-gray-50 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{project.name}</p>
                            <p className="text-xs text-gray-500 truncate">{project.repositoryUrl}</p>
                          </div>
                          <button
                            onClick={() => toggleProject(projectId)}
                            className="ml-2 text-red-600 hover:text-red-800"
                            title="Deseleccionar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Students */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">
                  Estudiantes Seleccionados ({selectedStudents.size})
                </p>
                {selectedStudents.size > 0 && (
                  <button
                    onClick={() => setSelectedStudents(new Set())}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Limpiar todos
                  </button>
                )}
              </div>
              {selectedStudents.size === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay estudiantes seleccionados</p>
              ) : (
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {Array.from(selectedStudents).map((email) => {
                      const student = students.find(s => s.email === email);
                      if (!student) return null;
                      return (
                        <div
                          key={email}
                          className="p-3 hover:bg-gray-50 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{student.name}</p>
                            <p className="text-xs text-gray-500">{email}</p>
                          </div>
                          <button
                            onClick={() => toggleStudent(email)}
                            className="ml-2 text-red-600 hover:text-red-800"
                            title="Deseleccionar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Total combinations preview */}
          {selectedProjects.size > 0 && selectedStudents.size > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Total de forks a crear:</strong> {selectedProjects.size} proyecto(s) × {selectedStudents.size} estudiante(s) = <strong>{selectedProjects.size * selectedStudents.size}</strong> fork(s)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Subgroup Selection and Fork Button */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Subgrupo:</label>
            <select
              value={subgroup}
              onChange={(e) => setSubgroup(e.target.value as 'eth-rust' | 'ia4devs')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="eth-rust">eth-rust</option>
              <option value="ia4devs">ia4devs</option>
            </select>
          </div>
          <button
            onClick={handleFork}
            disabled={forking || selectedProjects.size === 0 || selectedStudents.size === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {forking ? 'Procesando...' : 'Aplicar Fork'}
          </button>
        </div>
      </div>

      {/* Fork Results */}
      {forkResults.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Resultados del Fork</h3>
          <div className="space-y-4">
            {forkResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                      {result.projectName} → {result.studentName}
                    </p>
                    <p className={`text-xs mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {result.message}
                    </p>
                    {result.forkUrl && (
                      <a
                        href={result.forkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                      >
                        Ver fork →
                      </a>
                    )}
                  </div>
                </div>
                
                {/* Fork Details */}
                {result.success && result.forkId && (
                  <div className="mt-3 pt-3 border-t border-green-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium text-green-800">Fork ID:</span>
                        <span className="ml-2 text-green-700 font-mono">{result.forkId}</span>
                      </div>
                      <div>
                        <span className="font-medium text-green-800">Fork Name:</span>
                        <span className="ml-2 text-green-700">{result.forkName}</span>
                      </div>
                      <div>
                        <span className="font-medium text-green-800">Fork Path:</span>
                        <span className="ml-2 text-green-700 font-mono">{result.forkPath}</span>
                      </div>
                      <div>
                        <span className="font-medium text-green-800">Path with Namespace:</span>
                        <span className="ml-2 text-green-700 font-mono break-all">{result.forkPathWithNamespace}</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-medium text-green-800">Web URL:</span>
                        <a
                          href={result.forkWebUrl || result.forkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:underline break-all"
                        >
                          {result.forkWebUrl || result.forkUrl}
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

