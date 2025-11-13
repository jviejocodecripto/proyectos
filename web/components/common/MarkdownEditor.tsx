'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  minRows?: number;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Escribe tu evaluación en Markdown...',
  label = 'Evaluación',
  disabled = false,
  minRows = 10
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'text/markdown' && !file.name.endsWith('.md')) {
      alert('Por favor sube un archivo Markdown (.md)');
      return;
    }

    try {
      const text = await file.text();
      onChange(text);
      setActiveTab('preview');
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error al leer el archivo');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        
        {/* Upload button */}
        <label className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Subir .md
          <input
            type="file"
            accept=".md,text/markdown"
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />
        </label>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-300">
        <button
          type="button"
          onClick={() => setActiveTab('write')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'write'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          disabled={disabled}
        >
          ✍️ Escribir
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'preview'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          👁️ Vista Previa
        </button>
        
        {/* Markdown tips */}
        <div className="ml-auto flex items-center text-xs text-gray-500 px-2">
          <details className="cursor-pointer">
            <summary className="hover:text-gray-700">Ayuda Markdown</summary>
            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10">
              <div className="space-y-1 text-xs">
                <div><code># Título</code></div>
                <div><code>**negrita**</code></div>
                <div><code>*cursiva*</code></div>
                <div><code>- Lista</code></div>
                <div><code>[link](url)</code></div>
                <div><code>`código`</code></div>
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Content area */}
      <div
        className={`border-2 rounded-lg transition ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {activeTab === 'write' ? (
          <div className="relative">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              rows={minRows}
              className="w-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg font-mono text-sm resize-y disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-90 rounded-lg">
                <div className="text-center">
                  <svg className="w-12 h-12 text-blue-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-blue-700 font-medium">Suelta el archivo aquí</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-3 min-h-[200px] prose prose-sm max-w-none overflow-auto">
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-400 italic">
                No hay contenido para previsualizar
              </p>
            )}
          </div>
        )}
      </div>

      {/* Character count */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          {value.length} caracteres • {value.split('\n').length} líneas
        </span>
        <span>
          Soporta Markdown con tablas, listas, enlaces, etc.
        </span>
      </div>
    </div>
  );
}

