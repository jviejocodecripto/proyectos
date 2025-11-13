'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { UserRole } from '@/types';

interface RoleSwitcherProps {
  userRoles: UserRole[];
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  teacher: 'Profesor',
  student: 'Estudiante',
  pending: 'Pendiente'
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800 border-purple-300',
  teacher: 'bg-blue-100 text-blue-800 border-blue-300',
  student: 'bg-green-100 text-green-800 border-green-300',
  pending: 'bg-gray-100 text-gray-800 border-gray-300'
};

const ROLE_PATHS: Record<UserRole, string> = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
  pending: '/pending'
};

export default function RoleSwitcher({ userRoles }: RoleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<UserRole>('student');
  const [isOpen, setIsOpen] = useState(false);

  // Filter out 'pending' from available roles if user has other roles
  const availableRoles = userRoles.filter(role => {
    if (role === 'pending' && userRoles.length > 1) {
      return false;
    }
    return true;
  });

  // Determine current role from pathname
  useEffect(() => {
    const pathRole = pathname.split('/')[1] as UserRole;
    if (availableRoles.includes(pathRole)) {
      setCurrentRole(pathRole);
    } else {
      // Default to first available role
      setCurrentRole(availableRoles[0]);
    }
  }, [pathname, availableRoles]);

  // Only show switcher if user has multiple roles
  if (availableRoles.length <= 1) {
    return null;
  }

  const handleRoleChange = (role: UserRole) => {
    setIsOpen(false);
    setCurrentRole(role);
    router.push(ROLE_PATHS[role]);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition hover:shadow-md ${ROLE_COLORS[currentRole]}`}
      >
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
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span>{ROLE_LABELS[currentRole]}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Cambiar Vista
            </div>
            {availableRoles.map((role) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition ${
                  role === currentRole ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[role]}`}
                  >
                    {ROLE_LABELS[role]}
                  </span>
                  {role === currentRole && (
                    <svg
                      className="w-4 h-4 text-blue-600 ml-auto"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

