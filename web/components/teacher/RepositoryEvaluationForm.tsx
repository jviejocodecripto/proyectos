'use client';

import { useState } from 'react';
import MarkdownEditor from '@/components/common/MarkdownEditor';
import type { ProjectDTO } from '@/types';

interface RepositoryEvaluationFormProps {
  project: ProjectDTO;
  onSuccess: () => void;
}

interface AIAnalysis {
  analysis: string;
  suggestedScore: number;
  codeQuality: number;
  documentation: number;
  functionality: number;
  gitUsage: number;
  promptUsed: string;
}

export default function RepositoryEvaluationForm({
  project,
  onSuccess
}: RepositoryEvaluationFormProps) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [formData, setFormData] = useState({
    score: project.evaluations?.repository?.score?.toString() || '',
    comments: project.evaluations?.repository?.comments || '',
    codeQuality:
      project.evaluations?.repository?.codeQuality?.toString() || '',
    documentation:
      project.evaluations?.repository?.documentation?.toString() || '',
    functionality:
      project.evaluations?.repository?.functionality?.toString() || '',
    gitUsage: project.evaluations?.repository?.gitUsage?.toString() || ''
  });

  const isAlreadyEvaluated = !!project.evaluations?.repository;

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${project._id}/ai-analysis`,
        {
          method: 'POST'
        }
      );

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Error en el análisis con IA');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el análisis con IA');
      }

      setAiAnalysis(data.data);

      // Pre-fill form with AI suggestions
      setFormData({
        score: data.data.suggestedScore.toFixed(1),
        comments: formData.comments, // Keep existing comments
        codeQuality: data.data.codeQuality.toFixed(1),
        documentation: data.data.documentation.toFixed(1),
        functionality: data.data.functionality.toFixed(1),
        gitUsage: data.data.gitUsage.toFixed(1)
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const score = parseFloat(formData.score);
    const codeQuality = formData.codeQuality
      ? parseFloat(formData.codeQuality)
      : undefined;
    const documentation = formData.documentation
      ? parseFloat(formData.documentation)
      : undefined;
    const functionality = formData.functionality
      ? parseFloat(formData.functionality)
      : undefined;
    const gitUsage = formData.gitUsage
      ? parseFloat(formData.gitUsage)
      : undefined;

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
        `/api/projects/${project._id}/evaluate/repository`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score,
            comments: formData.comments,
            aiAnalysis: aiAnalysis?.analysis,
            aiPromptUsed: aiAnalysis?.promptUsed || 'manual',
            codeQuality,
            documentation,
            functionality,
            gitUsage
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
    <div className="space-y-6">
      {/* AI Analysis Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <svg
              className="w-6 h-6 text-purple-600 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Análisis con IA
              </h3>
              <p className="text-sm text-gray-600">
                Obtén una evaluación preliminar del repositorio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAIAnalysis}
            disabled={analyzing}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
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
                Analizando...
              </span>
            ) : (
              '✨ Analizar con IA'
            )}
          </button>
        </div>

        {aiAnalysis && (
          <div className="mt-4 space-y-4">
            {/* Scores Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-lg border border-purple-100">
                <p className="text-xs text-gray-600 mb-1">Código</p>
                <p className="text-2xl font-bold text-purple-600">
                  {aiAnalysis.codeQuality.toFixed(1)}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-100">
                <p className="text-xs text-gray-600 mb-1">Documentación</p>
                <p className="text-2xl font-bold text-purple-600">
                  {aiAnalysis.documentation.toFixed(1)}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-100">
                <p className="text-xs text-gray-600 mb-1">Funcionalidad</p>
                <p className="text-2xl font-bold text-purple-600">
                  {aiAnalysis.functionality.toFixed(1)}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-100">
                <p className="text-xs text-gray-600 mb-1">Git</p>
                <p className="text-2xl font-bold text-purple-600">
                  {aiAnalysis.gitUsage.toFixed(1)}
                </p>
              </div>
            </div>

            {/* AI Analysis Text */}
            <div className="bg-white p-4 rounded-lg border border-purple-100">
              <p className="text-sm font-medium text-gray-900 mb-2">
                Análisis Detallado:
              </p>
              <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {aiAnalysis.analysis}
              </div>
            </div>

            <div className="bg-purple-100 border border-purple-200 rounded-lg p-3">
              <p className="text-sm text-purple-900">
                <strong>Nota sugerida por IA:</strong>{' '}
                {aiAnalysis.suggestedScore.toFixed(1)}/10
              </p>
              <p className="text-xs text-purple-700 mt-1">
                Esta es una sugerencia. Puedes ajustar la nota y comentarios
                según tu criterio.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Evaluation Form */}
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
                Este repositorio ya fue evaluado. Puedes actualizar la
                evaluación.
              </p>
            </div>
          </div>
        )}

        {/* Detailed Scores (Optional) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calidad del Código
            </label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={formData.codeQuality}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  codeQuality: e.target.value
                }))
              }
              placeholder="0-10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Documentación
            </label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={formData.documentation}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  documentation: e.target.value
                }))
              }
              placeholder="0-10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Funcionalidad
            </label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={formData.functionality}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  functionality: e.target.value
                }))
              }
              placeholder="0-10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Uso de Git
            </label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={formData.gitUsage}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, gitUsage: e.target.value }))
              }
              placeholder="0-10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Final Score */}
        <div>
          <label
            htmlFor="repo-score"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Nota Final (0-10) *
          </label>
          <input
            id="repo-score"
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
          <MarkdownEditor
            value={formData.comments}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, comments: value }))
            }
            label="Comentarios del Profesor *"
            placeholder="Añade tus comentarios adicionales, retroalimentación específica, sugerencias de mejora...

Puedes usar Markdown para mejor presentación:
## Puntos Fuertes
- Excelente documentación
- Código limpio y bien estructurado

## Áreas de Mejora
- Añadir más tests unitarios
- Mejorar el manejo de errores

## Recomendaciones
1. Revisar la arquitectura
2. Optimizar consultas

Mínimo 10 caracteres"
            disabled={loading}
            minRows={10}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
            'Guardar Evaluación de Repositorio'
          )}
        </button>
      </form>
    </div>
  );
}
