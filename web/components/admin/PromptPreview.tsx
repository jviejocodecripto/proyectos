'use client';

import { useState } from 'react';

interface PromptPreviewProps {
  template: string;
}

export default function PromptPreview({ template }: PromptPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);

  // Sample data for preview
  const sampleData = {
    projectName: 'Sistema de Gestión de Biblioteca',
    submissionDate: '15 de enero de 2025',
    repositoryUrl: 'https://github.com/estudiante/biblioteca-app',
    readme: `# Sistema de Gestión de Biblioteca

Aplicación web para administrar préstamos de libros.

## Características
- Registro de usuarios y libros
- Sistema de préstamos
- Panel administrativo

## Tecnologías
- Node.js
- React
- MongoDB`,
    fileStructure: `src/
├── components/
│   ├── BookList.tsx
│   ├── UserForm.tsx
│   └── Dashboard.tsx
├── pages/
│   ├── index.tsx
│   └── admin.tsx
├── lib/
│   ├── db.ts
│   └── auth.ts
└── types/
    └── index.ts`,
    recentCommits: `- feat: Añadir sistema de préstamos
- fix: Corregir validación de fechas
- docs: Actualizar README con instrucciones`,
    languages: 'TypeScript (85%), JavaScript (10%), CSS (5%)'
  };

  const replaceVariables = (text: string): string => {
    let result = text;
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    });
    return result;
  };

  const previewText = replaceVariables(template);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <svg
            className="w-5 h-5 text-purple-600 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">
            Vista Previa del Prompt
          </h3>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="text-sm font-medium text-purple-600 hover:text-purple-700 transition"
        >
          {showPreview ? 'Ocultar' : 'Mostrar'} Preview
        </button>
      </div>

      {showPreview && (
        <div className="space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Nota:</strong> Esta es una vista previa con datos de
              ejemplo. Las variables se reemplazarán con datos reales al
              evaluar proyectos.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-purple-200 p-4">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Prompt renderizado:
            </p>
            <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap max-h-96 overflow-y-auto bg-gray-50 p-4 rounded border border-gray-200">
              {previewText}
            </pre>
          </div>

          <details className="bg-white rounded-lg border border-purple-200 p-4">
            <summary className="text-xs font-medium text-gray-700 cursor-pointer hover:text-purple-600 transition">
              Ver datos de ejemplo utilizados
            </summary>
            <div className="mt-3 space-y-2">
              {Object.entries(sampleData).map(([key, value]) => (
                <div key={key} className="text-xs">
                  <code className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-mono">
                    {`{{${key}}}`}
                  </code>
                  <pre className="mt-1 bg-gray-50 p-2 rounded text-gray-700 whitespace-pre-wrap">
                    {value}
                  </pre>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
