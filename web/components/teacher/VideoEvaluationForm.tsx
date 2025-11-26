'use client';

import { useState } from 'react';
import MarkdownEditor from '@/components/common/MarkdownEditor';
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
  const videoEvaluation = project.evaluations?.videoDemo;
  const [formData, setFormData] = useState({
    score: videoEvaluation?.score?.toString() || '',
    presentation: videoEvaluation?.presentation?.toString() || '',
    functionality: videoEvaluation?.functionality?.toString() || '',
    technicalQuality: videoEvaluation?.technicalQuality?.toString() || '',
    explanation: videoEvaluation?.explanation?.toString() || '',
    comments: videoEvaluation?.comments || ''
  });

  const isAlreadyEvaluated = !!project.evaluations?.videoDemo;

  // Calculate average score from individual criteria
  const calculateAverage = () => {
    const scores = [
      parseFloat(formData.presentation),
      parseFloat(formData.functionality),
      parseFloat(formData.technicalQuality),
      parseFloat(formData.explanation)
    ].filter(s => !isNaN(s));

    if (scores.length === 0) return null;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg * 10) / 10; // Round to 1 decimal
  };

  const handleScoreChange = (value: string) => {
    setFormData((prev) => ({ ...prev, score: value }));
  };

  const handleAverageClick = () => {
    const avg = calculateAverage();
    if (avg !== null) {
      setFormData((prev) => ({ ...prev, score: avg.toString() }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const score = parseFloat(formData.score);
    const presentation = parseFloat(formData.presentation);
    const functionality = parseFloat(formData.functionality);
    const technicalQuality = parseFloat(formData.technicalQuality);
    const explanation = parseFloat(formData.explanation);

    // Validation
    const errors: string[] = [];

    if (isNaN(score) || score < 0 || score > 10) {
      errors.push('La nota final debe ser un número entre 0 y 10');
    }

    if (isNaN(presentation) || presentation < 0 || presentation > 10) {
      errors.push('La nota de presentación debe ser un número entre 0 y 10');
    }

    if (isNaN(functionality) || functionality < 0 || functionality > 10) {
      errors.push('La nota de funcionalidades debe ser un número entre 0 y 10');
    }

    if (isNaN(technicalQuality) || technicalQuality < 0 || technicalQuality > 10) {
      errors.push('La nota de calidad técnica debe ser un número entre 0 y 10');
    }

    if (isNaN(explanation) || explanation < 0 || explanation > 10) {
      errors.push('La nota de explicación debe ser un número entre 0 y 10');
    }

    if (!formData.comments.trim() || formData.comments.length < 10) {
      errors.push('Los comentarios deben tener al menos 10 caracteres');
    }

    if (errors.length > 0) {
      setError(errors.join('. '));
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
            presentation,
            functionality,
            technicalQuality,
            explanation,
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

      {/* Evaluation Criteria */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Criterios de Evaluación
        </h3>

        {/* Presentation */}
        <div>
          <label
            htmlFor="video-presentation"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Calidad de Presentación (0-10) *
            <span className="text-xs text-gray-500 ml-2">
              Profesionalismo, claridad visual, estructura del video
            </span>
          </label>
          <input
            id="video-presentation"
            type="number"
            min="0"
            max="10"
            step="0.5"
            value={formData.presentation}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, presentation: e.target.value }))
            }
            disabled={loading}
            placeholder="8.5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Functionality */}
        <div>
          <label
            htmlFor="video-functionality"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Demostración de Funcionalidades (0-10) *
            <span className="text-xs text-gray-500 ml-2">
              Qué tan bien muestra las características y funciones del proyecto
            </span>
          </label>
          <input
            id="video-functionality"
            type="number"
            min="0"
            max="10"
            step="0.5"
            value={formData.functionality}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, functionality: e.target.value }))
            }
            disabled={loading}
            placeholder="8.5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Technical Quality */}
        <div>
          <label
            htmlFor="video-technical"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Calidad Técnica (Audio/Video) (0-10) *
            <span className="text-xs text-gray-500 ml-2">
              Calidad del audio, nitidez del video, edición
            </span>
          </label>
          <input
            id="video-technical"
            type="number"
            min="0"
            max="10"
            step="0.5"
            value={formData.technicalQuality}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, technicalQuality: e.target.value }))
            }
            disabled={loading}
            placeholder="8.5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Explanation */}
        <div>
          <label
            htmlFor="video-explanation"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Claridad de Explicación (0-10) *
            <span className="text-xs text-gray-500 ml-2">
              Qué tan clara y comprensible es la explicación del proyecto
            </span>
          </label>
          <input
            id="video-explanation"
            type="number"
            min="0"
            max="10"
            step="0.5"
            value={formData.explanation}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, explanation: e.target.value }))
            }
            disabled={loading}
            placeholder="8.5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Final Score */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="video-score"
            className="block text-sm font-semibold text-gray-800"
          >
            Nota Final (0-10) *
          </label>
          {calculateAverage() !== null && (
            <button
              type="button"
              onClick={handleAverageClick}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Usar promedio ({calculateAverage()})
            </button>
          )}
        </div>
        <input
          id="video-score"
          type="number"
          min="0"
          max="10"
          step="0.5"
          value={formData.score}
          onChange={(e) => handleScoreChange(e.target.value)}
          disabled={loading}
          placeholder="8.5"
          className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white"
        />
        <p className="mt-2 text-xs text-gray-600">
          Nota final que puede calcularse automáticamente como promedio o asignarse manualmente
        </p>
      </div>

      {/* Comments with Markdown */}
      <div>
        <MarkdownEditor
          value={formData.comments}
          onChange={(value) =>
            setFormData((prev) => ({ ...prev, comments: value }))
          }
          label="Comentarios de Evaluación *"
          placeholder="Comenta sobre la presentación, claridad, demostración de funcionalidades...

Puedes usar Markdown para formatear:
- **Negrita** para destacar
- *Cursiva* para énfasis
- Listas numeradas o con viñetas
- Enlaces y código

Mínimo 10 caracteres"
          disabled={loading}
          minRows={8}
        />
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
