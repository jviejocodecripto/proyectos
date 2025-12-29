'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { EnvConfigDTO, ProjectDTO } from '@/types';

export default function StudentEnvConfigsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<EnvConfigDTO[]>([]);
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EnvConfigDTO | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<string | null>(null);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects?limit=1000');
      const data = await response.json();

      if (data.success) {
        setProjects(data.data.items || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, []);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/student/env-configs');
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Error al cargar configuraciones');
      }

      if (data.success) {
        setConfigs(data.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleCreate = async (formData: {
    projectId: string | 'global';
    environment: 'dev' | 'pro' | 'all';
    scope: 'client' | 'server';
    key: string;
    value: string;
  }) => {
    try {
      const response = await fetch('/api/student/env-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear configuración');
      }

      if (data.success) {
        setSuccessMessage('Configuración creada correctamente');
        setIsFormModalOpen(false);
        fetchConfigs();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleUpdate = async (id: string, formData: {
    environment?: 'dev' | 'pro' | 'all';
    scope?: 'client' | 'server';
    key?: string;
    value?: string;
  }) => {
    try {
      const response = await fetch(`/api/student/env-configs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar configuración');
      }

      if (data.success) {
        setSuccessMessage('Configuración actualizada correctamente');
        setEditingConfig(null);
        fetchConfigs();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/student/env-configs/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar configuración');
      }

      if (data.success) {
        setSuccessMessage('Configuración eliminada correctamente');
        setDeletingConfig(null);
        fetchConfigs();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleBatchCreate = async (formData: {
    projectId: string | 'global';
    environment: 'dev' | 'pro';
    scope: 'client' | 'server';
    variables: Array<{ key: string; value: string }>;
  }) => {
    try {
      const response = await fetch('/api/student/env-configs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear configuraciones');
      }

      if (data.success) {
        const createdCount = data.data.created.length;
        const errorCount = data.data.errors.length;
        
        if (errorCount > 0) {
          const errorMessages = data.data.errors.map((e: { key: string; error: string }) => 
            `${e.key}: ${e.error}`
          ).join(', ');
          setError(`${createdCount} variable(s) creada(s). Errores: ${errorMessages}`);
          setTimeout(() => setError(null), 8000);
        } else {
          setSuccessMessage(`${createdCount} variable(s) creada(s) correctamente`);
          setTimeout(() => setSuccessMessage(null), 3000);
        }
        
        setIsBatchModalOpen(false);
        fetchConfigs();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setError(null), 5000);
    }
  };

  const getProjectName = (projectId: string | 'global'): string => {
    if (projectId === 'global') {
      return 'Global';
    }
    const project = projects.find((p) => p._id === projectId);
    return project ? project.name : projectId;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Variables de Entorno
        </h1>
        <p className="text-gray-600">
          Gestiona las variables de entorno para tus proyectos y configuraciones globales.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {successMessage}
        </div>
      )}

      {/* Add Buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setIsFormModalOpen(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          + Nueva Variable
        </button>
        <button
          onClick={() => setIsBatchModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Variables Batch
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuraciones...</p>
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600">No hay variables de entorno configuradas</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proyecto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Environment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scope
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre (KEY)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor (VALUE)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {configs.map((config) => (
                <tr key={config._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        config.projectId === 'global'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {getProjectName(config.projectId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        config.environment === 'dev'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {config.environment.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        (config.scope || 'server') === 'client'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {(config.scope || 'server') === 'client' ? 'Cliente (NEXT_PUBLIC)' : 'Servidor'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm font-mono text-gray-900">
                      {config.key}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">
                      {config.value.length > 50
                        ? `${config.value.substring(0, 50)}...`
                        : config.value}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setEditingConfig(config)}
                      className="text-green-600 hover:text-green-900 mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeletingConfig(config._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isFormModalOpen || editingConfig) && (
        <EnvConfigModal
          config={editingConfig}
          projects={projects}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingConfig(null);
          }}
          onSave={editingConfig
            ? (data) => handleUpdate(editingConfig._id, data)
            : (data) => {
                if (data.projectId && data.environment && data.scope && data.key && data.value) {
                  handleCreate({
                    projectId: data.projectId,
                    environment: data.environment,
                    scope: data.scope,
                    key: data.key,
                    value: data.value
                  });
                }
              }}
        />
      )}

      {/* Batch Create Modal */}
      {isBatchModalOpen && (
        <BatchEnvConfigModal
          projects={projects}
          onClose={() => setIsBatchModalOpen(false)}
          onSave={handleBatchCreate}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingConfig && (
        <DeleteConfirmModal
          onConfirm={() => handleDelete(deletingConfig)}
          onCancel={() => setDeletingConfig(null)}
        />
      )}
    </div>
  );
}

// Modal Component
function EnvConfigModal({
  config,
  projects,
  onClose,
  onSave
}: {
  config: EnvConfigDTO | null;
  projects: ProjectDTO[];
  onClose: () => void;
  onSave: (data: {
    projectId?: string | 'global';
    environment?: 'dev' | 'pro' | 'all';
    scope?: 'client' | 'server';
    key?: string;
    value?: string;
  }) => void;
}) {
  const [formData, setFormData] = useState({
    projectId: config?.projectId || 'global',
    environment: config?.environment || 'dev',
    scope: (config?.scope || 'server') as 'client' | 'server',
    key: config?.key || '',
    value: config?.value || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (config) {
      // Update: only send changed fields
      const envValue: 'dev' | 'pro' | 'all' | undefined = formData.environment !== config.environment ? formData.environment : undefined;
      const scopeValue: 'client' | 'server' | undefined = formData.scope !== config.scope ? formData.scope : undefined;
      onSave({
        environment: envValue,
        scope: scopeValue,
        key: formData.key !== config.key ? formData.key : undefined,
        value: formData.value !== config.value ? formData.value : undefined
      });
    } else {
      // Create: send all fields
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {config ? 'Editar Variable' : 'Nueva Variable'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proyecto
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) =>
                    setFormData({ ...formData, projectId: e.target.value as 'global' | string })
                  }
                  disabled={!!config} // Can't change projectId when editing
                  required={!config}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="global">Global</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {config && (
                  <p className="mt-1 text-xs text-gray-500">
                    No se puede cambiar el proyecto al editar
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Environment
                </label>
                <select
                  value={formData.environment}
                  onChange={(e) =>
                    setFormData({ ...formData, environment: e.target.value as 'dev' | 'pro' })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="dev">Dev</option>
                  <option value="pro">Pro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scope (Cliente o Servidor)
                </label>
                <select
                  value={formData.scope}
                  onChange={(e) =>
                    setFormData({ ...formData, scope: e.target.value as 'client' | 'server' })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="server">Servidor</option>
                  <option value="client">Cliente (NEXT_PUBLIC_)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.scope === 'client' 
                    ? 'Las variables de cliente se exponen al navegador y deben empezar con NEXT_PUBLIC_'
                    : 'Las variables de servidor solo están disponibles en el servidor'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre (KEY)
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) =>
                    setFormData({ ...formData, key: e.target.value })
                  }
                  placeholder="NEXT_PUBLIC_API_URL"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor (VALUE)
                </label>
                <textarea
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  placeholder="https://api.example.com"
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {config ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Batch Create Modal
function BatchEnvConfigModal({
  projects,
  onClose,
  onSave
}: {
  projects: ProjectDTO[];
  onClose: () => void;
  onSave: (data: {
    projectId: string | 'global';
    environment: 'dev' | 'pro';
    scope: 'client' | 'server';
    variables: Array<{ key: string; value: string }>;
  }) => void;
}) {
  const [projectId, setProjectId] = useState<string | 'global'>('global');
  const [environment, setEnvironment] = useState<'dev' | 'pro'>('dev');
  const [scope, setScope] = useState<'client' | 'server'>('server');
  const [textareaValue, setTextareaValue] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const parseVariables = (text: string): Array<{ key: string; value: string }> | null => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const variables: Array<{ key: string; value: string }> = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const equalIndex = trimmed.indexOf('=');
      if (equalIndex === -1) {
        errors.push(`Línea ${index + 1}: Formato inválido. Debe ser "name=value"`);
        return;
      }

      const key = trimmed.substring(0, equalIndex).trim();
      const value = trimmed.substring(equalIndex + 1).trim();

      if (!key) {
        errors.push(`Línea ${index + 1}: La clave no puede estar vacía`);
        return;
      }

      if (!value) {
        errors.push(`Línea ${index + 1}: El valor no puede estar vacío`);
        return;
      }

      variables.push({ key, value });
    });

    if (errors.length > 0) {
      setParseError(errors.join('\n'));
      return null;
    }

    setParseError(null);
    return variables;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const variables = parseVariables(textareaValue);
    if (variables && variables.length > 0) {
      onSave({ projectId, environment, scope, variables });
    } else if (!parseError) {
      setParseError('Debe haber al menos una variable válida');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Crear Variables en Batch
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proyecto
                </label>
                <select
                  value={projectId}
                  onChange={(e) =>
                    setProjectId(e.target.value as 'global' | string)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="global">Global</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Environment
                </label>
                <select
                  value={environment}
                  onChange={(e) =>
                    setEnvironment(e.target.value as 'dev' | 'pro')
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="dev">Dev</option>
                  <option value="pro">Pro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scope (Cliente o Servidor)
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as 'client' | 'server')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="server">Servidor</option>
                  <option value="client">Cliente (NEXT_PUBLIC_)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {scope === 'client' 
                    ? 'Las variables de cliente se exponen al navegador y deben empezar con NEXT_PUBLIC_'
                    : 'Las variables de servidor solo están disponibles en el servidor'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variables (formato: name=value, una por línea)
                </label>
                <textarea
                  value={textareaValue}
                  onChange={(e) => {
                    setTextareaValue(e.target.value);
                    setParseError(null);
                  }}
                  placeholder="NEXT_PUBLIC_API_URL=https://api.example.com&#10;DATABASE_URL=mongodb://localhost:27017&#10;API_KEY=your-api-key-here"
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                {parseError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 whitespace-pre-line">{parseError}</p>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Formato: una variable por línea con el formato <code>name=value</code>
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Crear Variables
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
  onConfirm,
  onCancel
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Confirmar Eliminación
          </h2>
          <p className="text-gray-600 mb-6">
            ¿Estás seguro de que deseas eliminar esta variable? Esta
            acción no se puede deshacer.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

