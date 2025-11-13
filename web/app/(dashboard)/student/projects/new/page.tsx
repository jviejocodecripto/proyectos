'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProjectForm from '@/components/projects/ProjectForm';
import type { UserDTO } from '@/types';

export default function NewProjectPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (data.success) {
        setUser(data.data);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Proyecto</h1>
        <p className="mt-1 text-sm text-gray-600">
          Completa la información de tu proyecto para enviarlo a evaluación
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <ProjectForm 
          mode="create" 
          userRole="student"
          userEmail={user?.email}
        />
      </div>
    </div>
  );
}
