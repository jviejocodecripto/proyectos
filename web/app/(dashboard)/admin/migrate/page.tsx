'use client';

import { useState } from 'react';

export default function MigratePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMigrate = async () => {
    if (!confirm('¿Estás seguro de que deseas migrar todos los usuarios de role (singular) a roles (array)?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/migrate/users', {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al ejecutar migración');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Migración de Base de Datos
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Herramientas de migración para actualizar la estructura de datos
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Migrar Usuarios: role → roles
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Esta migración convertirá el campo <code className="bg-gray-100 px-1 rounded">role</code> (singular)
            a <code className="bg-gray-100 px-1 rounded">roles</code> (array) para todos los usuarios existentes.
            Esto es necesario para soportar múltiples roles por usuario.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex">
              <svg
                className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm text-yellow-800 font-medium">Advertencia</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Esta operación modificará la base de datos. Se recomienda hacer un backup antes de continuar.
                  Solo necesitas ejecutar esta migración UNA VEZ.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleMigrate}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Ejecutando migración...
              </span>
            ) : (
              'Ejecutar Migración'
            )}
          </button>
        </div>

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

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-green-600 mr-3 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-green-800 font-medium mb-2">
                  {result.message}
                </p>
                {result.data && (
                  <div className="text-sm text-green-700 space-y-1">
                    <p>• Total de usuarios encontrados: {result.data.total}</p>
                    <p>• Usuarios migrados: {result.data.migrated}</p>
                    {result.data.errors > 0 && (
                      <p className="text-red-600">• Errores: {result.data.errors}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg
            className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm text-blue-800 font-medium">Información</p>
            <p className="text-sm text-blue-700 mt-1">
              Después de ejecutar la migración exitosamente, todos los usuarios tendrán el campo <code className="bg-blue-100 px-1 rounded">roles</code> como array.
              El sistema es compatible con ambos formatos (legacy y nuevo), por lo que no habrá interrupciones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
