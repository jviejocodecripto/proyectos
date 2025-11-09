'use client';

import { useState, useEffect } from 'react';
import type { UserRole } from '@/types';

interface UserFiltersProps {
  onFilterChange: (filters: { search: string; role: UserRole | 'all' }) => void;
  totalUsers: number;
}

export default function UserFilters({
  onFilterChange,
  totalUsers
}: UserFiltersProps) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | 'all'>('all');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ search, role });
    }, 300);

    return () => clearTimeout(timer);
  }, [search, role]);

  const handleRoleChange = (newRole: UserRole | 'all') => {
    setRole(newRole);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <label htmlFor="search" className="sr-only">
            Buscar usuarios
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="role-filter" className="text-sm font-medium text-gray-700">
            Rol:
          </label>
          <select
            id="role-filter"
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as UserRole | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos ({totalUsers})</option>
            <option value="pending">Pendientes</option>
            <option value="student">Estudiantes</option>
            <option value="teacher">Profesores</option>
            <option value="admin">Administradores</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {(search || role !== 'all') && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">Filtros activos:</span>
          {search && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Búsqueda: {search}
              <button
                onClick={() => setSearch('')}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </span>
          )}
          {role !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Rol: {role}
              <button
                onClick={() => setRole('all')}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-purple-200"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </span>
          )}
          <button
            onClick={() => {
              setSearch('');
              setRole('all');
            }}
            className="text-xs text-gray-600 hover:text-gray-900 underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
