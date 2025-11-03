'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Paste } from '@/types/paste';

interface PasteListProps {
  pastes: Paste[];
  onPasteDeleted: (pasteId: string) => void;
  refreshPastes: () => void;
}

export default function PasteList({
  pastes,
  onPasteDeleted,
  refreshPastes,
}: PasteListProps) {
  const [expandedPastes, setExpandedPastes] = useState<Set<string>>(new Set());
  const supabase = createClient();

  const toggleExpand = (pasteId: string) => {
    setExpandedPastes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pasteId)) {
        newSet.delete(pasteId);
      } else {
        newSet.add(pasteId);
      }
      return newSet;
    });
  };

  const handleDelete = async (pasteId: string) => {
    if (!confirm('Are you sure you want to delete this paste?')) {
      return;
    }

    try {
      const response = await fetch(`/api/pastes/${pasteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onPasteDeleted(pasteId);
        refreshPastes();
      } else {
        alert('Error deleting paste');
      }
    } catch (error) {
      console.error('Error deleting paste:', error);
      alert('Error deleting paste');
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // You could add a toast notification here
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = Date.now();
    const expires = new Date(expiresAt).getTime();
    const remaining = expires - now;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (pastes.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No pastes yet. Create one to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pastes.map((paste) => {
        const isExpanded = expandedPastes.has(paste.paste_id);
        const preview = paste.content.slice(0, 200);
        const needsTruncation = paste.content.length > 200;

        return (
          <div
            key={paste.paste_id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      paste.visibility === 'public'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}
                  >
                    {paste.visibility === 'public' ? 'Public' : 'Private'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Expires in {getTimeRemaining(paste.expires_at)}
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Created {new Date(paste.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(paste.content)}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded"
                >
                  Copy
                </button>
                <button
                  onClick={() => handleDelete(paste.paste_id)}
                  className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="mt-4">
              <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto text-sm">
                {isExpanded ? paste.content : preview}
                {needsTruncation && !isExpanded && '...'}
              </pre>
              {needsTruncation && (
                <button
                  onClick={() => toggleExpand(paste.paste_id)}
                  className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
