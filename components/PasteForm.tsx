'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Paste } from '@/types/paste';

interface User {
  id: string;
  email: string;
  display_name: string | null;
}

interface PasteFormProps {
  onPasteCreated: (paste: Paste) => void;
}

export default function PasteForm({ onPasteCreated }: PasteFormProps) {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [sharedUsers, setSharedUsers] = useState<User[]>([]); // Store full user objects
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const searchUsers = async () => {
      if (userSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(userSearch)}`, {
          credentials: 'include', // Ensure cookies are sent with the request
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('User search failed:', response.status, errorData);
          setSearchResults([]);
          return;
        }
        
        const data = await response.json();
        setSearchResults(data.users || []);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [userSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (content.length > 100 * 1024) {
      setMessage('Content must be less than 100 KB');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/pastes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          visibility,
          shared_with: visibility === 'private' ? sharedWith : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          const resetAt = new Date(data.resetAt);
          setMessage(
            `Rate limit exceeded. Try again after ${resetAt.toLocaleTimeString()}`
          );
        } else {
          setMessage(data.error || 'Error creating paste');
        }
      } else {
        setContent('');
        setSharedWith([]);
        setSharedUsers([]);
        setVisibility('public');
        setMessage('Paste created successfully!');
        onPasteCreated(data.paste);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Error creating paste');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addUser = (user: User) => {
    if (!sharedWith.includes(user.id)) {
      setSharedWith([...sharedWith, user.id]);
      setSharedUsers([...sharedUsers, user]);
    }
    setUserSearch('');
    setSearchResults([]);
  };

  const removeUser = (userId: string) => {
    setSharedWith(sharedWith.filter((id) => id !== userId));
    setSharedUsers(sharedUsers.filter((u) => u.id !== userId));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Create New Paste
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Content (max 100 KB)
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={12}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Paste your text or code here..."
          />
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {(content.length / 1024).toFixed(2)} KB
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Visibility
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="public"
                checked={visibility === 'public'}
                onChange={(e) => setVisibility(e.target.value as 'public')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Public (all users)
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="private"
                checked={visibility === 'private'}
                onChange={(e) => setVisibility(e.target.value as 'private')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Private (specific users)
              </span>
            </label>
          </div>
        </div>

        {visibility === 'private' && (
          <div>
            <label
              htmlFor="user-search"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Share with
            </label>
            <div className="relative">
              <input
                id="user-search"
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by email or name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => addUser(user)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.display_name || user.email}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {sharedUsers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {sharedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                  >
                    {user.display_name || user.email}
                    <button
                      type="button"
                      onClick={() => removeUser(user.id)}
                      className="ml-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Paste'}
        </button>

        {message && (
          <div
            className={`p-3 rounded-md text-sm ${
              message.includes('Error') || message.includes('Rate limit')
                ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            }`}
          >
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
