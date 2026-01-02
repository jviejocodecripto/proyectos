'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import UserTable from '@/components/admin/UserTable';
import UserFilters from '@/components/admin/UserFilters';
import UserFormModal from '@/components/admin/UserFormModal';
import BulkStudentModal from '@/components/admin/BulkStudentModal';
import type { UserDTO, UserRole, PaginatedResponse } from '@/types';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState<{
    search: string;
    role: UserRole | 'all';
  }>({
    search: '',
    role: 'all'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [missingGitLabUsers, setMissingGitLabUsers] = useState<UserDTO[]>([]);
  const [syncingGitLab, setSyncingGitLab] = useState(false);
  const [creatingGitLabUser, setCreatingGitLabUser] = useState<string | null>(null);
  const [creatingAllGitLabUsers, setCreatingAllGitLabUsers] = useState(false);
  const fetchingRef = useRef(false);

  const fetchUsers = useCallback(async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (filters.search) {
        params.append('search', filters.search);
      }

      if (filters.role !== 'all') {
        params.append('role', filters.role);
      }

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Error al cargar usuarios');
      }

      if (data.success) {
        setUsers(data.data.items);
        setPagination(data.data.pagination);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [pagination.page, pagination.limit, filters, router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFilterChange = (newFilters: {
    search: string;
    role: UserRole | 'all';
  }) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on filter change
  };

  const handleUpdateRoles = async (email: string, roles: UserRole[]) => {
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(email)}/role`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roles })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar roles');
      }

      setSuccessMessage(data.message || 'Roles actualizados correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh users list
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleToggleStatus = async (email: string, isActive: boolean) => {
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(email)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar estado');
      }

      setSuccessMessage(data.message || 'Estado actualizado correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh users list
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setIsFormModalOpen(true);
  };

  const handleEditUser = (user: UserDTO) => {
    setEditingUser(user);
    setIsFormModalOpen(true);
  };

  const handleSaveUser = async (userData: {
    email: string;
    name: string;
    roles: UserRole[];
    isActive: boolean;
  }) => {
    try {
      if (editingUser) {
        // Update existing user
        const response = await fetch(
          `/api/admin/users/${encodeURIComponent(editingUser.email)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: userData.name,
              roles: userData.roles,
              isActive: userData.isActive
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al actualizar usuario');
        }

        setSuccessMessage(data.message || 'Usuario actualizado correctamente');
      } else {
        // Create new user
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al crear usuario');
        }

        setSuccessMessage(data.message || 'Usuario creado correctamente');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchUsers();
      setIsFormModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm(`¿Está seguro de eliminar al usuario ${email}?`)) {
      return;
    }

    try {
      setDeletingUser(email);
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(email)}`,
        {
          method: 'DELETE'
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar usuario');
      }

      setSuccessMessage(data.message || 'Usuario eliminado correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh users list
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeletingUser(null);
    }
  };

  const handleSyncGitLab = async () => {
    try {
      setSyncingGitLab(true);
      setError(null);

      const response = await fetch('/api/admin/users/sync-gitlab');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al sincronizar con GitLab');
      }

      if (data.success && data.data) {
        setMissingGitLabUsers(data.data.missingUsers || []);
        if (data.data.missingCount === 0) {
          setSuccessMessage('Todos los usuarios están sincronizados con GitLab');
        } else {
          setSuccessMessage(
            `Se encontraron ${data.data.missingCount} usuarios que no están en GitLab`
          );
        }
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSyncingGitLab(false);
    }
  };

  const handleCreateGitLabUser = async (email: string) => {
    try {
      setCreatingGitLabUser(email);
      setError(null);

      const response = await fetch('/api/admin/users/create-gitlab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuario en GitLab');
      }

      setSuccessMessage(`Usuario ${email} creado en GitLab correctamente`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Remove from missing users list
      setMissingGitLabUsers(prev => prev.filter(user => user.email !== email));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setError(null), 5000);
    } finally {
      setCreatingGitLabUser(null);
    }
  };

  const handleCreateAllGitLabUsers = async () => {
    if (missingGitLabUsers.length === 0) {
      return;
    }

    if (!confirm(`¿Está seguro de crear ${missingGitLabUsers.length} usuarios en GitLab?`)) {
      return;
    }

    try {
      setCreatingAllGitLabUsers(true);
      setError(null);

      const emails = missingGitLabUsers.map(user => user.email);

      const response = await fetch('/api/admin/users/create-gitlab-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuarios en GitLab');
      }

      if (data.success && data.data) {
        const { successCount, errorCount, total } = data.data;
        
        if (errorCount === 0) {
          setSuccessMessage(`Todos los usuarios (${successCount}) fueron creados en GitLab correctamente`);
          setMissingGitLabUsers([]);
        } else {
          // Remove successfully created users from the list
          const successfulEmails = data.data.results
            .filter((r: { success: boolean }) => r.success)
            .map((r: { email: string }) => r.email);
          
          setMissingGitLabUsers(prev => 
            prev.filter(user => !successfulEmails.includes(user.email))
          );
          
          setSuccessMessage(
            `Se crearon ${successCount} de ${total} usuarios en GitLab. ${errorCount} usuarios tuvieron errores.`
          );
        }
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setError(null), 5000);
    } finally {
      setCreatingAllGitLabUsers(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de Usuarios
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSyncGitLab}
            disabled={syncingGitLab}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`w-5 h-5 ${syncingGitLab ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {syncingGitLab ? 'Sincronizando...' : 'Sincronizar con GitLab'}
          </button>
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-2"
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Alta Masiva
          </button>
          <button
            onClick={handleCreateUser}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Crear Usuario
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
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

      {/* GitLab Sync Section */}
      {missingGitLabUsers.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-yellow-900">
                Usuarios no sincronizados con GitLab
              </h2>
              <p className="text-sm text-yellow-700 mt-1">
                Se encontraron {missingGitLabUsers.length} usuarios que no existen en GitLab
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateAllGitLabUsers}
                disabled={creatingAllGitLabUsers}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingAllGitLabUsers ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Sincronizando todos...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Sincronizar Todos
                  </>
                )}
              </button>
              <button
                onClick={() => setMissingGitLabUsers([])}
                className="text-yellow-700 hover:text-yellow-900"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {missingGitLabUsers.map((user) => (
              <div
                key={user.email}
                className="bg-white rounded-lg p-4 flex items-center justify-between border border-yellow-200"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Roles: {user.roles.join(', ')}
                  </div>
                </div>
                <button
                  onClick={() => handleCreateGitLabUser(user.email)}
                  disabled={creatingGitLabUser === user.email}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingGitLabUser === user.email ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Creando...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
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
                      Crear en GitLab
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <UserFilters
        onFilterChange={handleFilterChange}
        totalUsers={pagination.total}
      />

      {/* Users Table */}
      <UserTable
        users={users}
        onUpdateRoles={handleUpdateRoles}
        onToggleStatus={handleToggleStatus}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        loading={loading}
      />

      {/* User Form Modal */}
      <UserFormModal
        user={editingUser}
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
      />

      {/* Bulk Student Modal */}
      <BulkStudentModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => {
          setSuccessMessage('Estudiantes procesados correctamente');
          setTimeout(() => setSuccessMessage(null), 5000);
          fetchUsers();
        }}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando página <span className="font-medium">{pagination.page}</span> de{' '}
              <span className="font-medium">{pagination.totalPages}</span> (
              <span className="font-medium">{pagination.total}</span> usuarios totales)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
