export type Visibility = 'public' | 'private';

export interface Paste {
  paste_id: string;
  user_id: string;
  content: string;
  visibility: Visibility;
  shared_with: string[]; // Array of user IDs
  created_at: string;
  expires_at: string;
}

export interface CreatePasteInput {
  content: string;
  visibility: Visibility;
  shared_with?: string[];
}
