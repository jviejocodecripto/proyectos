'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PromptEditor from '@/components/admin/PromptEditor';
import PromptList from '@/components/admin/PromptList';
import PromptPreview from '@/components/admin/PromptPreview';
import type { AIPromptDTO } from '@/types';

const DEFAULT_PROMPT_TEMPLATE = `Eres un profesor experto evaluando el código de un proyecto de estudiante.

# INFORMACIÓN DEL PROYECTO
**Nombre:** {{projectName}}
**Fecha de entrega:** {{submissionDate}}
**Repositorio:** {{repositoryUrl}}

# CONTENIDO DEL README
{{readme}}

# ESTRUCTURA DE ARCHIVOS
{{fileStructure}}

# COMMITS RECIENTES
{{recentCommits}}

# LENGUAJES DETECTADOS
{{languages}}

# TU TAREA
Analiza el repositorio y proporciona:

1. **Calidad del Código (0-10):** Evalúa organización, buenas prácticas, legibilidad
2. **Documentación (0-10):** README, comentarios, instrucciones
3. **Funcionalidad (0-10):** Completitud, características implementadas
4. **Uso de Git (0-10):** Commits descriptivos, frecuencia, buenas prácticas

Proporciona un análisis detallado mencionando:
- Fortalezas del proyecto
- Áreas de mejora
- Sugerencias específicas
- Nota sugerida final (0-10)

Formatea tu respuesta de manera clara y constructiva.`;

export default function AdminPromptsPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<AIPromptDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<AIPromptDTO | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/prompts');
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (response.status === 403) {
          router.push('/');
          return;
        }
        throw new Error(data.error || 'Error al cargar prompts');
      }

      if (data.success) {
        setPrompts(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrompt = async (formData: {
    name: string;
    prompt: string;
    isActive: boolean;
  }) => {
    try {
      const response = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear prompt');
      }

      setSuccessMessage('Prompt creado exitosamente');
      setShowEditor(false);
      fetchPrompts();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      throw err; // Let PromptEditor handle the error
    }
  };

  const handleUpdatePrompt = async (formData: {
    name: string;
    prompt: string;
    isActive: boolean;
  }) => {
    if (!editingPrompt) return;

    try {
      const response = await fetch(`/api/admin/prompts/${editingPrompt._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar prompt');
      }

      setSuccessMessage('Prompt actualizado exitosamente');
      setEditingPrompt(null);
      setShowEditor(false);
      fetchPrompts();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      throw err; // Let PromptEditor handle the error
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    try {
      const response = await fetch(`/api/admin/prompts/${promptId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar prompt');
      }

      setSuccessMessage('Prompt eliminado exitosamente');
      fetchPrompts();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSetActivePrompt = async (promptId: string) => {
    try {
      const response = await fetch(`/api/admin/prompts/${promptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al activar prompt');
      }

      setSuccessMessage('Prompt activado exitosamente');
      fetchPrompts();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (prompt: AIPromptDTO) => {
    setEditingPrompt(prompt);
    setShowEditor(true);
  };

  const handleCancelEdit = () => {
    setEditingPrompt(null);
    setShowEditor(false);
  };

  const handleNewPrompt = () => {
    setEditingPrompt(null);
    setShowEditor(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Cargando prompts...</p>
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
            Gestión de Prompts de IA
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Personaliza los prompts utilizados para evaluar repositorios con
            inteligencia artificial
          </p>
        </div>
        {!showEditor && (
          <button
            onClick={handleNewPrompt}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
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
            Nuevo Prompt
          </button>
        )}
      </div>

      {/* Success Message */}
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

      {/* Error Message */}
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

      {/* Editor Section */}
      {showEditor && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingPrompt ? 'Editar Prompt' : 'Crear Nuevo Prompt'}
          </h2>
          <PromptEditor
            prompt={editingPrompt || undefined}
            onSave={editingPrompt ? handleUpdatePrompt : handleCreatePrompt}
            onCancel={handleCancelEdit}
          />
        </div>
      )}

      {/* Template Preview (only when creating new) */}
      {showEditor && !editingPrompt && (
        <PromptPreview template={DEFAULT_PROMPT_TEMPLATE} />
      )}

      {/* Prompts List */}
      {!showEditor && (
        <PromptList
          prompts={prompts}
          onEdit={handleEdit}
          onDelete={handleDeletePrompt}
          onSetActive={handleSetActivePrompt}
        />
      )}
    </div>
  );
}
