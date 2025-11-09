'use client';

import { useState } from 'react';
import type { ProjectDTO } from '@/types';

interface VideoEvaluationFormProps {
  project: ProjectDTO;
  onSuccess: () => void;
}

export default function VideoEvaluationForm({
  project,
  onSuccess
}: VideoEvaluationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    score: project.evaluations?.videoDemo?.score?.toString() || '',
    comments: project.evaluations?.videoDemo?.comments || ''
  });

  const isAlreadyEvaluated = !!project.evaluations?.videoDemo;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const score = parseFloat(formData.score);

    // Validation
    if (isNaN(score) || score < 0 || score > 10) {
      setError('La nota debe ser un número entre 0 y 10');
      return;
    }

    if (!formData.comments.trim() || formData.comments.length < 10) {
      setError('Los comentarios deben tener al menos 10 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/projects/${project._id}/evaluate/video`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score,
            comments: formData.comments
          })
        }
      );

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Error al guardar evaluación');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar evaluación');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
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

      {isAlreadyEvaluated && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-blue-600 mr-3"
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
            <p className="text-sm text-blue-800">
              Este video ya fue evaluado. Puedes actualizar la evaluación.
            </p>
          </div>
        </div>
      )}

      {/* Score */}
      <div>
        <label
          htmlFor="video-score"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Nota (0-10) *
        </label>
        <input
          id="video-score"
          type="number"
          min="0"
          max="10"
          step="0.5"
          value={formData.score}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, score: e.target.value }))
          }
          disabled={loading}
          placeholder="8.5"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Comments */}
      <div>
        <label
          htmlFor="video-comments"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Comentarios *
        </label>
        <textarea
          id="video-comments"
          rows={6}
          value={formData.comments}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, comments: e.target.value }))
          }
          disabled={loading}
          placeholder="Comenta sobre la presentación, claridad, demostración de funcionalidades..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          maxLength={2000}
        />
        <p className="mt-1 text-xs text-gray-500">
          {formData.comments.length}/2000 caracteres (mínimo 10)
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
        ) : (
          'Guardar Evaluación de Video'
        )}
      </button>
    </form>
  );
}
