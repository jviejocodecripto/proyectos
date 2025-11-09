'use client';

import { useState } from 'react';
import type { AIPromptDTO } from '@/types';

interface PromptEditorProps {
  prompt?: AIPromptDTO;
  onSave: (data: { name: string; prompt: string; isActive: boolean }) => Promise<void>;
  onCancel: () => void;
}

export default function PromptEditor({
  prompt,
  onSave,
  onCancel
}: PromptEditorProps) {
  const [formData, setFormData] = useState({
    name: prompt?.name || '',
    prompt: prompt?.prompt || '',
    isActive: prompt?.isActive || false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.name.length < 3) {
      setError('El nombre debe tener al menos 3 caracteres');
      return;
    }

    if (formData.prompt.length < 50) {
      setError('El prompt debe tener al menos 50 caracteres');
      return;
    }

    setLoading(true);

    try {
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const templateVariables = [
    { var: '{{projectName}}', desc: 'Nombre del proyecto' },
    { var: '{{submissionDate}}', desc: 'Fecha de entrega' },
    { var: '{{repositoryUrl}}', desc: 'URL del repositorio' },
    { var: '{{readme}}', desc: 'Contenido del README' },
    { var: '{{fileStructure}}', desc: 'Estructura de archivos' },
    { var: '{{recentCommits}}', desc: 'Commits recientes' },
    { var: '{{languages}}', desc: 'Lenguajes detectados' }
  ];

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

      {/* Name Input */}
      <div>
        <label
          htmlFor="prompt-name"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Nombre del Prompt *
        </label>
        <input
          id="prompt-name"
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          disabled={loading}
          placeholder="Ej: Evaluación estándar de código"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500">
          {formData.name.length}/100 caracteres (mínimo 3)
        </p>
      </div>

      {/* Template Variables Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-900 mb-2">
          Variables disponibles:
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {templateVariables.map((v) => (
            <div key={v.var} className="flex items-start">
              <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                {v.var}
              </code>
              <span className="text-blue-700 ml-2">{v.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt Textarea */}
      <div>
        <label
          htmlFor="prompt-content"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Contenido del Prompt *
        </label>
        <textarea
          id="prompt-content"
          rows={16}
          value={formData.prompt}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, prompt: e.target.value }))
          }
          disabled={loading}
          placeholder="Escribe el prompt que se enviará a Claude para evaluar el repositorio. Usa las variables para personalizar..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none font-mono text-sm"
          maxLength={10000}
        />
        <p className="mt-1 text-xs text-gray-500">
          {formData.prompt.length}/10000 caracteres (mínimo 50)
        </p>
      </div>

      {/* Active Checkbox */}
      <div className="flex items-center">
        <input
          id="prompt-active"
          type="checkbox"
          checked={formData.isActive}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
          }
          disabled={loading}
          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <label htmlFor="prompt-active" className="ml-2 block text-sm text-gray-900">
          Activar este prompt (desactivará los demás)
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
          ) : (
            `${prompt ? 'Actualizar' : 'Crear'} Prompt`
          )}
        </button>
      </div>
    </form>
  );
}
