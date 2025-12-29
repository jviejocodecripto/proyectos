'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { EnvConfigDTO } from '@/types';
import { formatDateTime } from '@/types';

export default function AdminEnvConfigsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<EnvConfigDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EnvConfigDTO | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<string | null>(null);
  const [environmentFilter, setEnvironmentFilter] = useState<'dev' | 'pro' | 'all'>('dev');
  const [viewingValue, setViewingValue] = useState<{ key: string; value: string } | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const url = environmentFilter === 'all' 
        ? '/api/admin/env-configs'
        : `/api/admin/env-configs?environment=${environmentFilter}`;
      const response = await fetch(url);
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
  }, [router, environmentFilter]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleCreate = async (formData: {
    environment: 'dev' | 'pro' | 'all';
    scope: 'client' | 'server';
    key: string;
    value: string;
  }) => {
    try {
      const response = await fetch('/api/admin/env-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear configuración');
      }

      if (data.success) {
        setSuccessMessage('Configuración global creada correctamente');
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
      const response = await fetch(`/api/admin/env-configs/${id}`, {
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
        setIsFormModalOpen(false);
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
      const response = await fetch(`/api/admin/env-configs/${id}`, {
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

  const handleBatchCreate = async (environment: 'dev' | 'pro' | 'all', scope: 'client' | 'server', envVariables: string) => {
    try {
      const lines = envVariables.split('\n').filter(line => line.trim() !== '');
      const variables = lines.map(line => {
        const trimmedLine = line.trim();
        const parts = trimmedLine.split('=');
        if (parts.length < 2) {
          throw new Error(`Formato inválido en línea: ${trimmedLine}`);
        }
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (!key || !value) {
          throw new Error(`Clave o valor vacío en línea: ${trimmedLine}`);
        }
        return { key, value };
      });

      // Create each variable
      const results = await Promise.allSettled(
        variables.map(variable =>
          fetch('/api/admin/env-configs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              environment,
              scope,
              key: variable.key,
              value: variable.value
            })
          })
        )
      );

      const errors = results
        .map((result, index) => {
          if (result.status === 'rejected') {
            return `Línea ${index + 1}: ${result.reason.message || 'Error desconocido'}`;
          }
          if (!result.value.ok) {
            return `Línea ${index + 1}: Error al crear`;
          }
          return null;
        })
        .filter(Boolean);

      if (errors.length > 0) {
        throw new Error(`Errores al crear variables:\n${errors.join('\n')}`);
      }

      setSuccessMessage(`Variables procesadas correctamente (${variables.length} creadas)`);
      setIsBatchModalOpen(false);
      fetchConfigs();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Variables de Entorno Globales (Administrador)
        </h1>
        <p className="text-gray-600">
          Gestiona las variables de entorno globales que afectan a todos los proyectos.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Éxito:</strong>
          <span className="block sm:inline"> {successMessage}</span>
        </div>
      )}

      {/* Environment Filter and Action buttons */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Environment:</label>
          <select
            value={environmentFilter}
            onChange={(e) => setEnvironmentFilter(e.target.value as 'dev' | 'pro' | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="dev">Dev</option>
            <option value="pro">Pro</option>
            <option value="all">Todos (Dev + Pro)</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Variables Batch
          </button>
          <button
            onClick={() => setIsFormModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            + Nueva Variable Global
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuraciones...</p>
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600">
            No hay variables globales configuradas para {environmentFilter === 'all' ? 'todos los entornos' : environmentFilter}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Environment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scope
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clave
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Actualización
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {configs.map((config) => (
                <tr key={config._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        config.environment === 'dev'
                          ? 'bg-yellow-100 text-yellow-800'
                          : config.environment === 'pro'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {config.environment === 'all' ? 'TODOS' : config.environment.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        config.scope === 'client'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {config.scope === 'client' ? 'Cliente (NEXT_PUBLIC)' : 'Servidor'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {config.key}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-md">
                      <code 
                        className={`block font-mono text-xs bg-gray-50 px-2 py-1 rounded ${
                          config.value.length > 100 ? 'truncate cursor-pointer hover:bg-gray-100' : ''
                        }`}
                        onClick={() => config.value.length > 100 && setViewingValue({ key: config.key, value: config.value })}
                        title={config.value.length > 100 ? 'Click para ver el valor completo' : ''}
                      >
                        {config.value.length > 100 
                          ? `${config.value.substring(0, 100)}...` 
                          : config.value}
                      </code>
                      {config.value.length > 100 && (
                        <span className="text-xs text-gray-400 mt-1 block">
                          ({config.value.length} caracteres - Click para ver completo)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(config.updatedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setEditingConfig(config);
                        setIsFormModalOpen(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
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
        <AdminEnvConfigModal
          config={editingConfig}
          environment={environmentFilter}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingConfig(null);
          }}
          onSave={editingConfig
            ? (data) => handleUpdate(editingConfig._id, data)
            : (data) => {
                if (data.environment && data.scope && data.key && data.value) {
                  handleCreate({
                    environment: data.environment as 'dev' | 'pro' | 'all',
                    scope: data.scope as 'client' | 'server',
                    key: data.key,
                    value: data.value
                  });
                }
              }}
        />
      )}

      {/* Batch Create Modal */}
      {isBatchModalOpen && (
        <AdminEnvConfigBatchModal
          environment={environmentFilter}
          onClose={() => setIsBatchModalOpen(false)}
          onSave={(env, scope, vars) => handleBatchCreate(env, scope, vars)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingConfig && (
        <DeleteConfirmModal
          isOpen={!!deletingConfig}
          onClose={() => setDeletingConfig(null)}
          onConfirm={() => handleDelete(deletingConfig)}
          title="Eliminar Variable Global"
          message="¿Estás seguro de que quieres eliminar esta variable global? Esta acción afectará a todos los proyectos y no se puede deshacer."
        />
      )}

      {/* View Full Value Modal */}
      {viewingValue && (
        <ViewValueModal
          isOpen={!!viewingValue}
          onClose={() => setViewingValue(null)}
          keyName={viewingValue.key}
          value={viewingValue.value}
        />
      )}
    </div>
  );
}

// Modal Component for Admin
function AdminEnvConfigModal({
  config,
  environment,
  onClose,
  onSave
}: {
  config: EnvConfigDTO | null;
  environment: 'dev' | 'pro' | 'all';
  onClose: () => void;
  onSave: (data: {
    environment?: 'dev' | 'pro' | 'all';
    scope?: 'client' | 'server';
    key?: string;
    value?: string;
  }) => void;
}) {
  const [formData, setFormData] = useState<{
    environment: 'dev' | 'pro' | 'all';
    scope: 'client' | 'server';
    key: string;
    value: string;
  }>({
    environment: (config?.environment || environment) as 'dev' | 'pro' | 'all',
    scope: (config?.scope || 'server') as 'client' | 'server',
    key: config?.key || '',
    value: config?.value || ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.key.trim()) {
      newErrors.key = 'La clave es requerida.';
    }
    if (!formData.value.trim()) {
      newErrors.value = 'El valor es requerido.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

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
      onSave({
        environment: formData.environment as 'dev' | 'pro' | 'all',
        scope: formData.scope,
        key: formData.key,
        value: formData.value
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {config ? 'Editar Variable Global' : 'Nueva Variable Global'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Environment
                </label>
                <select
                  value={formData.environment}
                  onChange={(e) =>
                    setFormData({ ...formData, environment: e.target.value as 'dev' | 'pro' | 'all' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="dev">Dev</option>
                  <option value="pro">Pro</option>
                  <option value="all">Todos (Dev + Pro)</option>
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
                  Clave (KEY)
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) =>
                    setFormData({ ...formData, key: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {errors.key && (
                  <p className="mt-1 text-sm text-red-600">{errors.key}</p>
                )}
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
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {errors.value && (
                  <p className="mt-1 text-sm text-red-600">{errors.value}</p>
                )}
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {config ? 'Guardar Cambios' : 'Crear Variable Global'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Batch Modal Component for Admin
function AdminEnvConfigBatchModal({
  environment,
  onClose,
  onSave
}: {
  environment: 'dev' | 'pro' | 'all';
  onClose: () => void;
  onSave: (environment: 'dev' | 'pro' | 'all', scope: 'client' | 'server', envVariables: string) => Promise<void>;
}) {
  const [textareaValue, setTextareaValue] = useState('');
  const [scope, setScope] = useState<'client' | 'server'>('server');
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateInput = (input: string): string[] => {
    const errors: string[] = [];
    const lines = input.split('\n').filter(line => line.trim() !== '');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const parts = trimmedLine.split('=');

      if (parts.length < 2) {
        errors.push(`Línea ${index + 1}: Formato inválido. Debe ser KEY=VALUE.`);
        return;
      }

      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();

      if (!key) {
        errors.push(`Línea ${index + 1}: La clave no puede estar vacía.`);
      }
      if (!value) {
        errors.push(`Línea ${index + 1}: El valor no puede estar vacío.`);
      }
    });
    return errors;
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextareaValue(e.target.value);
    setParseError(null);
    const errors = validateInput(e.target.value);
    if (errors.length > 0) {
      setParseError(errors.join('\n'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateInput(textareaValue);
    if (errors.length > 0) {
      setParseError(errors.join('\n'));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(environment, scope, textareaValue);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Añadir Variables Globales en Batch
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Environment: {environment === 'all' ? 'TODOS (Dev + Pro)' : environment.toUpperCase()}
                </label>
                <p className="text-xs text-gray-500">
                  Las variables se crearán para {environment === 'all' ? 'todos los entornos (dev y pro)' : `el environment ${environment}`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variables de Entorno (KEY=VALUE, una por línea)
                </label>
                <textarea
                  value={textareaValue}
                  onChange={handleTextareaChange}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Ejemplo:&#10;API_KEY=your_api_key&#10;DATABASE_URL=mongodb://localhost/mydb"
                  disabled={isSubmitting}
                />
                {parseError && (
                  <div className="mt-2 text-sm text-red-600">
                    <p className="font-medium">Errores de formato:</p>
                    <pre className="whitespace-pre-wrap">{parseError}</pre>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || !!parseError || !textareaValue.trim()}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Variables'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// View Full Value Modal Component
function ViewValueModal({
  isOpen,
  onClose,
  keyName,
  value
}: {
  isOpen: boolean;
  onClose: () => void;
  keyName: string;
  value: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Valor Completo</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clave (KEY)
            </label>
            <code className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono">
              {keyName}
            </code>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor (VALUE) - {value.length} caracteres
            </label>
            <textarea
              readOnly
              value={value}
              rows={Math.min(20, Math.max(5, Math.ceil(value.length / 80)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50 resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

