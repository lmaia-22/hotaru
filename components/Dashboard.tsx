'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import PasteForm from './PasteForm';
import PasteList from './PasteList';
import type { Paste } from '@/types/paste';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
      } else {
        setUser(user);
        loadPastes();
      }
    };

    getUser();
  }, [router]);

  const loadPastes = async () => {
    try {
      const response = await fetch(`/api/pastes?type=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setPastes(data.pastes || []);
      }
    } catch (error) {
      console.error('Error loading pastes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handlePasteCreated = (paste: Paste) => {
    setPastes((prev) => [paste, ...prev]);
    loadPastes();
  };

  const handlePasteDeleted = (pasteId: string) => {
    setPastes((prev) => prev.filter((p) => p.paste_id !== pasteId));
  };

  useEffect(() => {
    loadPastes();
  }, [filter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Hotaru
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              All Pastes
            </button>
            <button
              onClick={() => setFilter('mine')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'mine'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              My Pastes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <PasteForm onPasteCreated={handlePasteCreated} />
          </div>
          <div className="lg:col-span-2">
            <PasteList
              pastes={pastes}
              onPasteDeleted={handlePasteDeleted}
              refreshPastes={loadPastes}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
