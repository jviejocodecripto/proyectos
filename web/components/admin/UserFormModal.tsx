'use client';

import { useState, useEffect } from 'react';
import type { UserDTO, UserRole } from '@/types';

interface UserFormModalProps {
  user?: UserDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: {
    email: string;
    name: string;
    roles: UserRole[];
    isActive: boolean;
  }) => Promise<void>;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  teacher: 'Profesor',
  student: 'Estudiante',
  pending: 'Pendiente'
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  teacher: 'bg-blue-100 text-blue-800',
  student: 'bg-green-100 text-green-800',
  pending: 'bg-gray-100 text-gray-800'
};

export default function UserFormModal({
  user,
  isOpen,
  onClose,
  onSave
}: UserFormModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [roles, setRoles] = useState<UserRole[]>(['pending']);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!user;

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setName(user.name);
      setRoles(user.roles);
      setIsActive(user.isActive);
    } else {
      // Reset form for create mode
      setEmail('');
      setName('');
      setRoles(['pending']);
      setIsActive(true);
    }
    setError(null);
  }, [user, isOpen]);

  const handleToggleRole = (role: UserRole) => {
    setRoles(prev => {
      if (prev.includes(role)) {
        // Don't allow removing all roles
        if (prev.length === 1) return prev;
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (roles.length === 0) {
      setError('Debe seleccionar al menos un rol');
      return;
    }

    setSaving(true);
    try {
      await onSave({ email, name, roles, isActive });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar usuario');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isEditMode ? 'Editar Usuario' : 'Crear Usuario'}
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEditMode}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {isEditMode && (
              <p className="mt-1 text-xs text-gray-500">
                El email no se puede modificar
              </p>
            )}
          </div>

          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nombre
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roles
            </label>
            <div className="space-y-2">
              {(['pending', 'student', 'teacher', 'admin'] as UserRole[]).map(role => (
                <label
                  key={role}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={roles.includes(role)}
                    onChange={() => handleToggleRole(role)}
                    disabled={roles.length === 1 && roles.includes(role)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="flex-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role]}`}>
                      {ROLE_LABELS[role]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Debe seleccionar al menos un rol
            </p>
          </div>

          {/* Active Status */}
          <div>
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="flex-1">
                <span className="text-sm font-medium text-gray-700">
                  Usuario activo
                </span>
                <p className="text-xs text-gray-500">
                  Los usuarios inactivos no pueden acceder al sistema
                </p>
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || roles.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
