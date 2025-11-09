'use client';

import { useState } from 'react';
import type { UserDTO, UserRole } from '@/types';

interface UserTableProps {
  users: UserDTO[];
  onUpdateRoles: (email: string, roles: UserRole[]) => Promise<void>;
  onToggleStatus: (email: string, isActive: boolean) => Promise<void>;
  onEdit: (user: UserDTO) => void;
  onDelete: (email: string) => void;
  loading?: boolean;
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

export default function UserTable({
  users,
  onUpdateRoles,
  onToggleStatus,
  onEdit,
  onDelete,
  loading = false
}: UserTableProps) {
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);

  const handleOpenRoleEditor = (user: UserDTO) => {
    setEditingUser(user.email);
    setSelectedRoles([...user.roles]);
  };

  const handleToggleRole = (role: UserRole) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        // Don't allow removing all roles
        if (prev.length === 1) return prev;
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleSaveRoles = async () => {
    if (!editingUser) return;

    setUpdatingUser(editingUser);
    try {
      await onUpdateRoles(editingUser, selectedRoles);
      setEditingUser(null);
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setSelectedRoles([]);
  };

  const handleStatusToggle = async (email: string, isActive: boolean) => {
    setUpdatingUser(email);
    try {
      await onToggleStatus(email, !isActive);
    } finally {
      setUpdatingUser(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <p className="mt-2 text-gray-600">No se encontraron usuarios</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Último acceso
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.email} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {(user.roles || []).map(role => (
                      <span
                        key={role}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role]}`}
                      >
                        {ROLE_LABELS[role]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() =>
                      handleStatusToggle(user.email, user.isActive)
                    }
                    disabled={updatingUser === user.email}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      user.isActive
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Nunca'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {updatingUser === user.email ? (
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  ) : (
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => onEdit(user)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDelete(user.email)}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Editor Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Editar Roles
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Usuario: <span className="font-medium">{editingUser}</span>
            </p>

            <div className="space-y-3 mb-6">
              {(['pending', 'student', 'teacher', 'admin'] as UserRole[]).map(role => (
                <label
                  key={role}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => handleToggleRole(role)}
                    disabled={selectedRoles.length === 1 && selectedRoles.includes(role)}
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

            <p className="text-xs text-gray-500 mb-4">
              Nota: Debe seleccionar al menos un rol
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleSaveRoles}
                disabled={selectedRoles.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Guardar
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
