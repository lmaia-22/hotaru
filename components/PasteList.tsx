'use client';

import { useState, useEffect } from 'react';
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error getting user:', error);
          return;
        }
        if (user) {
          console.log('Current user ID set:', user.id);
          setCurrentUserId(user.id);
        } else {
          console.log('No user found');
        }
      } catch (err) {
        console.error('Error in getCurrentUser:', err);
      }
    };
    getCurrentUser();
  }, [supabase]);

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

  const handleDelete = async (pasteId: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('Delete button clicked for paste:', pasteId);
    console.log('Current user ID:', currentUserId);
    
    // Temporary: Skip confirm to test if delete works
    // TODO: Add custom confirmation modal later
    console.log('Proceeding with delete (confirmation skipped for testing)...');
    
    try {
      console.log('Making DELETE request to:', `/api/pastes/${pasteId}`);
      const response = await fetch(`/api/pastes/${pasteId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Delete response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Delete successful:', data);
        onPasteDeleted(pasteId);
        refreshPastes();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error deleting paste:', errorData);
        alert(`Error deleting paste: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting paste:', error);
      alert('Error deleting paste. Please try again.');
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
                {/* Show delete button only for own pastes */}
                {currentUserId && currentUserId === paste.user_id ? (
                  <button
                    onClick={(e) => {
                      console.log('Delete clicked - Paste ID:', paste.paste_id, 'User ID:', paste.user_id, 'Current User:', currentUserId);
                      handleDelete(paste.paste_id, e);
                    }}
                    type="button"
                    className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded"
                  >
                    Delete
                  </button>
                ) : currentUserId ? (
                  <span className="px-3 py-1 text-xs text-gray-400 dark:text-gray-500 italic" title={`Owned by ${paste.user_id}`}>
                    Not yours
                  </span>
                ) : null}
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
