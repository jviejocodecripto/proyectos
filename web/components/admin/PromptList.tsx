'use client';

import { useState } from 'react';
import type { AIPromptDTO } from '@/types';
import { formatDateTime } from '@/types';

interface PromptListProps {
  prompts: AIPromptDTO[];
  onEdit: (prompt: AIPromptDTO) => void;
  onDelete: (promptId: string) => Promise<void>;
  onSetActive: (promptId: string) => Promise<void>;
}

export default function PromptList({
  prompts,
  onEdit,
  onDelete,
  onSetActive
}: PromptListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDelete = async (promptId: string, isActive: boolean) => {
    if (isActive) {
      alert('No puedes eliminar el prompt activo');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este prompt?')) {
      return;
    }

    setDeletingId(promptId);
    try {
      await onDelete(promptId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetActive = async (promptId: string) => {
    setActivatingId(promptId);
    try {
      await onSetActive(promptId);
    } finally {
      setActivatingId(null);
    }
  };

  if (prompts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
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
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay prompts creados
        </h3>
        <p className="text-gray-600">
          Crea tu primer prompt para personalizar las evaluaciones con IA
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prompts.map((prompt) => (
        <div
          key={prompt._id}
          className={`bg-white rounded-lg shadow border-2 transition ${
            prompt.isActive
              ? 'border-green-500 bg-green-50'
              : 'border-transparent hover:border-gray-200'
          }`}
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {prompt.name}
                  </h3>
                  {prompt.isActive && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Activo
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  <span>Creado por {prompt.createdBy}</span>
                  <span className="mx-2">•</span>
                  <span>{formatDateTime(prompt.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!prompt.isActive && (
                  <button
                    onClick={() => handleSetActive(prompt._id)}
                    disabled={activatingId === prompt._id}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Activar prompt"
                  >
                    {activatingId === prompt._id ? (
                      <svg
                        className="animate-spin h-5 w-5"
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
                    ) : (
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
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </button>
                )}
                <button
                  onClick={() => onEdit(prompt)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Editar"
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() =>
                    setExpandedId(expandedId === prompt._id ? null : prompt._id)
                  }
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                  title={expandedId === prompt._id ? 'Ocultar' : 'Ver prompt'}
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      expandedId === prompt._id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(prompt._id, prompt.isActive)}
                  disabled={deletingId === prompt._id || prompt.isActive}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    prompt.isActive
                      ? 'No puedes eliminar el prompt activo'
                      : 'Eliminar'
                  }
                >
                  {deletingId === prompt._id ? (
                    <svg
                      className="animate-spin h-5 w-5"
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
                  ) : (
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Prompt Content */}
            {expandedId === prompt._id && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Contenido del Prompt:
                </p>
                <pre className="bg-gray-50 p-4 rounded-lg text-xs font-mono text-gray-800 whitespace-pre-wrap max-h-96 overflow-y-auto border border-gray-200">
                  {prompt.prompt}
                </pre>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
